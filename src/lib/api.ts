'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export async function apiFetch<T = unknown>(
    path: string,
    init?: RequestInit,
): Promise<T> {
    const res = await fetch(path, {
        headers: { 'Content-Type': 'application/json', ...init?.headers },
        ...init,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).message || `HTTP ${res.status}`);
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
