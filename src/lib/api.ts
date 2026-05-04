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

export async function apiFetch<T = unknown>(
    path: string,
    init?: RequestInit,
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('kairos-token') : null;
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

    const res = await fetch(path, {
        headers,
        ...init,
    });
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

        if (res.status !== 404) {
            console.error(`[apiFetch Error] ${path} returned ${res.status}:`, {
                code,
                message,
                details,
            });
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

    const load = useCallback(async () => {
        const url = pathRef.current;
        if (!url) return;
        setLoading(true);
        setError(null);
        try {
            setData(await apiFetch<T>(url));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path]);

    return { data, loading, error, refetch: load };
}
