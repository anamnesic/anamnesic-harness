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
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private shouldReconnect: boolean = false;
    private boundEvents: Set<string> = new Set();

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
        this.shouldReconnect = true;

        if (!this.source) {
            this.connect();
        } else if (this.isConnected && !this.boundEvents.has(eventName)) {
            this.source.addEventListener(eventName, (ev: MessageEvent) => this.handleEvent(eventName, ev));
            this.boundEvents.add(eventName);
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
        if (this.listeners.size === 0) return;

        this.shouldReconnect = true;

        try {
            this.source = new EventSource(this.buildUrl());

            this.source.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('[SSE] Connected');
                
                // Re-register all listeners
                for (const eventName of this.listeners.keys()) {
                    if (!this.boundEvents.has(eventName)) {
                        this.source?.addEventListener(eventName, (ev: MessageEvent) => this.handleEvent(eventName, ev));
                        this.boundEvents.add(eventName);
                    }
                }
            };

            this.source.onerror = () => {
                this.isConnected = false;
                this.cleanup();
                if (!this.shouldReconnect || this.listeners.size === 0) {
                    return;
                }
                this.scheduleReconnect();
            };

        } catch (err) {
            console.error('[SSE] Connection error:', err);
            this.scheduleReconnect();
        }
    }

    private buildUrl(): string {
        let streamUrl = this.url;
        if (typeof window !== 'undefined') {
            const baseUrl = localStorage.getItem('kairos-api-base-url');
            if (baseUrl) {
                streamUrl = `${baseUrl.replace(/\/$/, '')}${this.url}`;
            }
        }

        if (typeof window === 'undefined') {
            return streamUrl;
        }

        const token = localStorage.getItem('kairos-token');
        const workspaceId = localStorage.getItem('kairos-selected-workspace');
        const projectId = localStorage.getItem('kairos-selected-repository');

        const params = new URLSearchParams();
        if (token) params.set('token', token);
        if (workspaceId) params.set('workspaceId', workspaceId);
        if (projectId) params.set('projectId', projectId);

        const qs = params.toString();
        return qs ? `${streamUrl}?${qs}` : streamUrl;
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
        if (!this.shouldReconnect || this.listeners.size === 0) {
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            // After max attempts, use exponential backoff with a longer delay
            // but don't give up completely - the server might come back
            console.warn(`[SSE] Max reconnect attempts (${this.maxReconnectAttempts}) reached, using longer delay`);
        }

        this.reconnectAttempts++;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        // Exponential backoff: base delay * 2^(attempts-1), capped at 60 seconds
        const delay = Math.min(
            this.reconnectDelay * Math.pow(1.5, Math.min(this.reconnectAttempts - 1, 10)),
            60000
        );

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delay);
    }

    private disconnect() {
        console.log('[SSE] Disconnecting (no active listeners)');
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.cleanup();
    }

    private cleanup() {
        if (this.source) {
            this.source.close();
            this.source = null;
        }
        this.boundEvents.clear();
        this.isConnected = false;
    }

    get connected() {
        return this.isConnected;
    }
}

export const eventStreamManager = EventStreamManager.getInstance();
