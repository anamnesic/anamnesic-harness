'use client';

import { useEffect, useRef } from 'react';
import { useApi } from './api';

export function usePolling<T>(path: string, intervalMs: number = 5000) {
    const result = useApi<T>(path);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const schedule = () => {
            // Add slight jitter to avoid request bursts
            const jitter = Math.random() * 500;
            timerRef.current = setTimeout(async () => {
                if (!document.hidden) {
                    await result.refetch();
                }
                schedule();
            }, intervalMs + jitter);
        };

        schedule();

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                result.refetch();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, intervalMs]);

    return result;
}
