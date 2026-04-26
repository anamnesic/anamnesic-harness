'use client';

type Listener = (data: any) => void;

class EventStreamManager {
    private static instance: EventStreamManager;
    private source: EventSource | null = null;
    private listeners: Map<string, Set<Listener>> = new Map();
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 3000;
    private url: string = '/api/v1/events';

    private constructor() {}

    static getInstance(): EventStreamManager {
        if (!EventStreamManager.instance) {
            EventStreamManager.instance = new EventStreamManager();
        }
        return EventStreamManager.instance;
    }

    subscribe(eventName: string, listener: Listener): () => void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName)!.add(listener);

        if (!this.source) {
            this.connect();
        } else if (this.isConnected) {
            // Re-bind to ensure new events are caught if added dynamically
            // (though EventSource eventListeners are usually persistent)
            this.source.addEventListener(eventName, (ev: MessageEvent) => this.handleEvent(eventName, ev));
        }

        return () => {
            const set = this.listeners.get(eventName);
            if (set) {
                set.delete(listener);
                if (set.size === 0) {
                    this.listeners.delete(eventName);
                }
            }
            
            if (this.listeners.size === 0 && this.source) {
                this.disconnect();
            }
        };
    }

    private connect() {
        if (this.source) return;

        try {
            this.source = new EventSource(this.url);

            this.source.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('[SSE] Connected');
                
                // Re-register all listeners
                for (const eventName of this.listeners.keys()) {
                    this.source?.addEventListener(eventName, (ev: MessageEvent) => this.handleEvent(eventName, ev));
                }
            };

            this.source.onerror = () => {
                this.isConnected = false;
                this.cleanup();
                this.scheduleReconnect();
            };

        } catch (err) {
            console.error('[SSE] Connection error:', err);
            this.scheduleReconnect();
        }
    }

    private handleEvent(eventName: string, ev: MessageEvent) {
        try {
            const parsed = JSON.parse(ev.data);
            const set = this.listeners.get(eventName);
            if (set) {
                set.forEach(listener => listener(parsed));
            }
        } catch (err) {
            // Ignore parse errors
        }
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[SSE] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        setTimeout(() => this.connect(), this.reconnectDelay);
    }

    private disconnect() {
        console.log('[SSE] Disconnecting (no active listeners)');
        this.cleanup();
    }

    private cleanup() {
        if (this.source) {
            this.source.close();
            this.source = null;
        }
        this.isConnected = false;
    }

    get connected() {
        return this.isConnected;
    }
}

export const eventStreamManager = EventStreamManager.getInstance();
