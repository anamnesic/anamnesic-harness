'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

class ApiError extends Error {
    code: string;
    details?: unknown;

    constructor(code: string, message: string, details?: unknown) {
        super(message);
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

export function clearAuthTokens(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('kairos-token');
        localStorage.removeItem('kairos-refresh-token');
    }
}

export function isAuthError(error: unknown): boolean {
    return error instanceof ApiError && (error.code === 'UNAUTHORIZED' || error.code === 'INVALID_TOKEN');
}

// Token refresh in progress flag
let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
    // If already refreshing, wait for that promise
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const currentToken = localStorage.getItem('kairos-token');
            if (!currentToken) return null;

            let refreshPath = '/api/v1/auth/refresh';
            if (typeof window !== 'undefined') {
                const baseUrl = localStorage.getItem('kairos-api-base-url');
                if (baseUrl) {
                    refreshPath = `${baseUrl.replace(/\/$/, '')}${refreshPath}`;
                }
            }

            const res = await fetch(refreshPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`,
                },
            });

            if (!res.ok) {
                // Clear invalid tokens
                localStorage.removeItem('kairos-token');
                localStorage.removeItem('kairos-refresh-token');
                return null;
            }

            const data = await res.json();
            if (data.token) {
                localStorage.setItem('kairos-token', data.token);
                if (data.refreshToken) {
                    localStorage.setItem('kairos-refresh-token', data.refreshToken);
                }
                return data.token;
            }
            return null;
        } catch {
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

export async function apiFetch<T = unknown>(
    path: string,
    init?: RequestInit,
    _retryCount = 0,
): Promise<T> {
    // Get workspace ID from localStorage
    const workspaceId = typeof window !== 'undefined'
        ? localStorage.getItem('kairos-selected-workspace')
        : null;
    const projectId = typeof window !== 'undefined'
        ? localStorage.getItem('kairos-selected-repository')
        : null;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...init?.headers as Record<string, string>,
    };

    // Add auth token if available
    let token = typeof window !== 'undefined' ? localStorage.getItem('kairos-token') : null;
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Add workspace header if available and not already set
    if (workspaceId && !headers['X-Workspace-Id']) {
        headers['X-Workspace-Id'] = workspaceId;
    }

    // Add globally selected repository header if available
    if (projectId && !headers['X-Project-Id']) {
        headers['X-Project-Id'] = projectId;
    }

    let finalPath = path;
    if (typeof window !== 'undefined' && path.startsWith('/api')) {
        const baseUrl = localStorage.getItem('kairos-api-base-url');
        if (baseUrl) {
            finalPath = `${baseUrl.replace(/\/$/, '')}${path}`;
        }
    }

    const res = await fetch(finalPath, {
        headers,
        ...init,
    });

    // Handle token expiration - try to refresh once
    if (!res.ok && res.status === 401 && _retryCount === 0) {
        const body = await res.text().catch(() => '');
        let parsedBody: any = {};
        try {
            parsedBody = JSON.parse(body);
        } catch {
            // ignore
        }

        const errorCode = parsedBody?.error?.code || parsedBody?.code || '';
        if (errorCode === 'UNAUTHORIZED' || errorCode === 'INVALID_TOKEN' || errorCode === 'TOKEN_EXPIRED') {
            const newToken = await refreshToken();
            if (newToken) {
                // Retry with new token
                return apiFetch<T>(path, init, 1);
            }
        }
    }

    if (!res.ok) {
        const raw = await res.text().catch(() => '');

        let body: any = {};
        if (raw) {
            try {
                body = JSON.parse(raw);
            } catch {
                body = {};
            }
        }

        const error = body?.error || {};
        const fallbackText = raw && raw.length < 500 ? raw : undefined;
        const message = error.message || body?.message || fallbackText || `HTTP ${res.status}`;
        const code = error.code || body?.code || 'UNKNOWN_ERROR';
        const details = error.details || body?.details || { status: res.status, statusText: res.statusText };

        // Suppress 404 errors (expected for optional resources like missing files)
        if (res.status !== 404) {
            console.error(`[apiFetch Error] ${path} returned ${res.status}:`, {
                code,
                message,
                details,
            });

            // Clear token on auth errors and redirect to login
            if (res.status === 401) {
                clearAuthTokens();
                
                // Only redirect if we're in the browser and not already on login/signup
                if (typeof window !== 'undefined') {
                    const currentPath = window.location.pathname;
                    if (currentPath !== '/login' && currentPath !== '/signup') {
                        // Use setTimeout to avoid blocking
                        setTimeout(() => {
                            window.location.href = '/login?redirect=' + encodeURIComponent(currentPath);
                        }, 100);
                    }
                }
            }
        }

        throw new ApiError(
            code,
            message,
            details
        );
    }
    return res.json() as Promise<T>;
}

export function useApi<T>(path: string | null) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(!!path);
    const [error, setError] = useState<string | null>(null);
    const pathRef = useRef(path);
    pathRef.current = path;
    const abortRef = useRef<AbortController | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const load = useCallback(async () => {
        const url = pathRef.current;
        if (!url) return;

        // Cancel previous request if still in-flight
        if (abortRef.current) {
            abortRef.current.abort();
        }

        const abortController = new AbortController();
        abortRef.current = abortController;

        setLoading(true);
        setError(null);
        try {
            const result = await apiFetch<T>(url);
            if (!abortController.signal.aborted && mountedRef.current) {
                setData(result);
            }
        } catch (e) {
            if (!abortController.signal.aborted && mountedRef.current) {
                setError(e instanceof Error ? e.message : 'Unknown error');
            }
        } finally {
            if (abortRef.current === abortController) {
                abortRef.current = null;
            }
            if (!abortController.signal.aborted && mountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        load();
        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path]);

    return { data, loading, error, refetch: load };
}
