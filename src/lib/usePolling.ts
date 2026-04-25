'use client';

import { useEffect } from 'react';
import { useApi } from './api';

export function usePolling<T>(path: string, intervalMs: number = 5000) {
    const result = useApi<T>(path);
    useEffect(() => {
        const id = setInterval(() => {
            result.refetch();
        }, intervalMs);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, intervalMs]);
    return result;
}
