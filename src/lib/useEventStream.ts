'use client';

import { useEffect, useState } from 'react';
import { eventStreamManager } from './eventStreamManager';

export function useEventStream<T>(
    eventName: string,
    onEvent: (data: T) => void,
) {
    const [connected, setConnected] = useState(eventStreamManager.connected);

    useEffect(() => {
        const unsubscribe = eventStreamManager.subscribe(eventName, (data) => {
            onEvent(data);
        });

        // Use a small interval to sync connection state if needed, 
        // or just rely on the initial state for UI indicators.
        const interval = setInterval(() => {
            setConnected(eventStreamManager.connected);
        }, 5000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [eventName, onEvent]);

    return { connected };
}
