'use client';

import { useEffect, useRef, useState } from 'react';

const SSE_URL = '/api/v1/events';
const RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useEventStream<T>(
    eventName: string,
    onEvent: (data: T) => void,
) {
    const [connected, setConnected] = useState(false);
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    useEffect(() => {
        let attempts = 0;
        let source: EventSource | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let cancelled = false;

        const connect = () => {
            if (cancelled) return;
            try {
                source = new EventSource(SSE_URL);
            } catch {
                scheduleReconnect();
                return;
            }

            source.onopen = () => {
                attempts = 0;
                setConnected(true);
            };

            source.addEventListener(eventName, (ev: MessageEvent) => {
                try {
                    const parsed = JSON.parse(ev.data) as T;
                    onEventRef.current(parsed);
                } catch {
                    // Ignore malformed payloads
                }
            });

            source.onerror = () => {
                setConnected(false);
                if (source) {
                    try { source.close(); } catch { /* ignore */ }
                    source = null;
                }
                scheduleReconnect();
            };
        };

        const scheduleReconnect = () => {
            if (cancelled) return;
            if (attempts >= MAX_RECONNECT_ATTEMPTS) return;
            attempts += 1;
            reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        };

        connect();

        return () => {
            cancelled = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (source) {
                try { source.close(); } catch { /* ignore */ }
                source = null;
            }
            setConnected(false);
        };
    }, [eventName]);

    return { connected };
}
