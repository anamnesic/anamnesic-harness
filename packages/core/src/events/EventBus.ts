/**
 * ThinkCoffee EventBus — Cross-process event system
 *
 * Uses a shared JSONL event log file that any process can write to
 * and any process can watch with native fs.watch (inotify/ReadDirectoryChangesW).
 *
 * Architecture:
 *   MCP Server  ──emit──→  ~/.thinkcoffee/events.jsonl  ←──watch──  VS Code Extension
 *   PipelineService ──emit──→  (same file)              ←──watch──  Any subscriber
 *
 * This provides near-instant (<50ms) cross-process event propagation
 * without WebSockets, HTTP servers, or external infrastructure.
 *
 * Events are append-only, auto-rotated when the file exceeds MAX_FILE_SIZE.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { EventEmitter } from 'events';

// ─── Types ───────────────────────────────────────────────────

export type EventType =
  | 'pipeline:created'
  | 'pipeline:phase:started'
  | 'pipeline:phase:completed'
  | 'pipeline:phase:approved'
  | 'pipeline:phase:rejected'
  | 'pipeline:task:started'
  | 'pipeline:task:completed'
  | 'pipeline:task:failed'
  | 'pipeline:completed'
  | 'pipeline:failed'
  | 'pipeline:resumed'
  | 'context:changed'
  | 'decision:changed'
  | 'project:changed'
  | 'chat:message';

export interface BusEvent {
  id: string;
  type: EventType;
  timestamp: string;
  source: string;           // 'mcp-server' | 'vscode' | 'cli' | 'pipeline-service'
  projectId?: string;
  pipelineId?: string;
  phaseIndex?: number;
  taskId?: string;
  data?: Record<string, unknown>;
}

export type EventCallback = (event: BusEvent) => void;

// ─── Constants ───────────────────────────────────────────────

const THINKCOFFEE_DIR = path.join(os.homedir(), '.thinkcoffee');
const EVENTS_FILE = path.join(THINKCOFFEE_DIR, 'events.jsonl');
const MAX_FILE_SIZE = 512 * 1024; // 512KB — rotate when exceeded

// ─── EventBus ────────────────────────────────────────────────

/**
 * Cross-process event bus backed by a JSONL file.
 *
 * - `emit()` appends an event to the shared file (any process can call this)
 * - `subscribe()` watches the file for new events using native fs.watch
 * - In-process listeners are notified immediately (no file I/O delay)
 * - Cross-process listeners detect changes via fs.watch (~10-50ms on most OS)
 */
export class EventBus {
  private _emitter = new EventEmitter();
  private _watcher: fs.FSWatcher | null = null;
  private _lastSize = 0;
  private _source: string;
  private _watching = false;

  constructor(source: string = 'unknown') {
    this._source = source;
    this._ensureDir();
  }

  private _ensureDir() {
    try {
      if (!fs.existsSync(THINKCOFFEE_DIR)) {
        fs.mkdirSync(THINKCOFFEE_DIR, { recursive: true });
      }
    } catch { /* ignore */ }
  }

  /**
   * Emit an event — writes to the shared JSONL file and notifies in-process listeners.
   */
  emit(type: EventType, payload?: Partial<Omit<BusEvent, 'id' | 'type' | 'timestamp' | 'source'>>): BusEvent {
    const event: BusEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      source: this._source,
      ...payload,
    };

    // Write to shared file (append)
    try {
      this._rotateIfNeeded();
      fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n', 'utf-8');
    } catch (err) {
      console.error(`[EventBus] Failed to write event: ${(err as Error).message}`);
    }

    // Notify in-process listeners immediately (no file I/O delay)
    this._emitter.emit(type, event);
    this._emitter.emit('*', event);

    return event;
  }

  /**
   * Subscribe to events of a specific type, or '*' for all events.
   * Returns an unsubscribe function.
   */
  on(type: EventType | '*', callback: EventCallback): () => void {
    this._emitter.on(type, callback);
    return () => this._emitter.off(type, callback);
  }

  /**
   * Start watching for cross-process events via fs.watch.
   * Call this once per process that needs to receive events from other processes.
   */
  startWatching(): void {
    if (this._watching) return;
    this._watching = true;

    // Record current file size so we only process NEW events
    try {
      this._lastSize = fs.existsSync(EVENTS_FILE) ? fs.statSync(EVENTS_FILE).size : 0;
    } catch {
      this._lastSize = 0;
    }

    try {
      // Use fs.watch (native OS file system notifications) — much faster than fs.watchFile polling
      this._watcher = fs.watch(EVENTS_FILE, { persistent: false }, (eventType) => {
        if (eventType === 'change') {
          this._processNewEvents();
        }
      });

      this._watcher.on('error', () => {
        // File may not exist yet — retry
        this._watcher?.close();
        this._watcher = null;
        this._watching = false;
        setTimeout(() => this.startWatching(), 1000);
      });
    } catch {
      // File doesn't exist yet — create it and retry
      try {
        fs.writeFileSync(EVENTS_FILE, '', 'utf-8');
        this._watching = false;
        this.startWatching();
      } catch { /* ignore */ }
    }
  }

  /**
   * Stop watching for cross-process events.
   */
  stopWatching(): void {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
    this._watching = false;
  }

  /**
   * Read new events appended since last read and emit them to in-process listeners.
   */
  private _processNewEvents(): void {
    try {
      const stat = fs.statSync(EVENTS_FILE);
      if (stat.size <= this._lastSize) {
        // File was rotated or didn't grow
        if (stat.size < this._lastSize) this._lastSize = 0;
        return;
      }

      // Read only the new bytes
      const fd = fs.openSync(EVENTS_FILE, 'r');
      const newBytes = stat.size - this._lastSize;
      const buffer = Buffer.alloc(newBytes);
      fs.readSync(fd, buffer, 0, newBytes, this._lastSize);
      fs.closeSync(fd);
      this._lastSize = stat.size;

      // Parse lines and emit
      const lines = buffer.toString('utf-8').trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event: BusEvent = JSON.parse(line);
          // Skip events from our own process (already emitted in-process)
          if (event.source === this._source) continue;
          this._emitter.emit(event.type, event);
          this._emitter.emit('*', event);
        } catch { /* skip malformed lines */ }
      }
    } catch { /* file may have been rotated */ }
  }

  /**
   * Rotate the event log if it exceeds MAX_FILE_SIZE.
   */
  private _rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(EVENTS_FILE)) return;
      const stat = fs.statSync(EVENTS_FILE);
      if (stat.size > MAX_FILE_SIZE) {
        // Keep only the last 25% of the file
        const content = fs.readFileSync(EVENTS_FILE, 'utf-8');
        const lines = content.trim().split('\n');
        const keepFrom = Math.floor(lines.length * 0.75);
        fs.writeFileSync(EVENTS_FILE, lines.slice(keepFrom).join('\n') + '\n', 'utf-8');
      }
    } catch { /* ignore */ }
  }

  /**
   * Get recent events (for debugging / initial state sync).
   */
  getRecent(limit: number = 50): BusEvent[] {
    try {
      if (!fs.existsSync(EVENTS_FILE)) return [];
      const content = fs.readFileSync(EVENTS_FILE, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      const events: BusEvent[] = [];
      for (const line of lines.slice(-limit)) {
        try { events.push(JSON.parse(line)); } catch { /* skip */ }
      }
      return events;
    } catch {
      return [];
    }
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stopWatching();
    this._emitter.removeAllListeners();
  }
}

// ─── Singleton factory ───────────────────────────────────────

const instances = new Map<string, EventBus>();

/**
 * Get a named EventBus instance (singleton per source name).
 *
 * Usage:
 *   const bus = getEventBus('mcp-server');   // in MCP server
 *   const bus = getEventBus('vscode');       // in VS Code extension
 *   const bus = getEventBus('cli');          // in CLI
 */
export function getEventBus(source: string): EventBus {
  if (!instances.has(source)) {
    instances.set(source, new EventBus(source));
  }
  return instances.get(source)!;
}
