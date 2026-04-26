import { Logger } from '../utils/Logger';
import { FileWatcher } from '@/src/observation/fileWatcher';
import { CodeObserver } from '@/src/observation/observers/codeObserver';
import { TerminalObserver } from '@/src/observation/observers/terminalObserver';
import { ApiObserver } from '@/src/observation/observers/apiObserver';
import { getEventBus } from '@/src/observation/EventBus';

export interface ObserverStatus {
  id: string;
  title: string;
  status: 'Active' | 'Paused' | 'Error';
  subtitle: string;
  active: boolean;
  lastEvent?: string;
  eventCount?: number;
}

/**
 * ObserverService - Manages all system observers with real state
 */
export class ObserverService {
  private static instance: ObserverService;
  private logger = Logger.getInstance('ObserverService');
  private fileWatcher: FileWatcher;
  private codeObserver: CodeObserver;
  private terminalObserver: TerminalObserver;
  private apiObserver: ApiObserver;
  private eventCounts: Map<string, number> = new Map();
  private lastEvents: Map<string, string> = new Map();

  private constructor() {
    this.fileWatcher = new FileWatcher();
    this.codeObserver = new CodeObserver();
    this.terminalObserver = new TerminalObserver();
    this.apiObserver = new ApiObserver();
    
    this.setupEventTracking();
  }

  static getInstance(): ObserverService {
    if (!ObserverService.instance) {
      ObserverService.instance = new ObserverService();
    }
    return ObserverService.instance;
  }

  private setupEventTracking(): void {
    const bus = getEventBus('default');
    
    // Track all events for observer statistics
    const originalEmit = (bus as any).emit?.bind(bus);
    if (typeof originalEmit === 'function') {
      (bus as any).emit = async (eventType: string, data?: unknown) => {
        this.updateEventStats(eventType);
        return originalEmit(eventType, data);
      };
    }
  }

  private updateEventStats(eventType: string): void {
    const observerId = this.getObserverIdFromEvent(eventType);
    if (observerId) {
      this.eventCounts.set(observerId, (this.eventCounts.get(observerId) || 0) + 1);
      this.lastEvents.set(observerId, `${eventType} - ${new Date().toISOString()}`);
    }
  }

  private getObserverIdFromEvent(eventType: string): string | null {
    if (eventType.startsWith('fs:') || eventType.startsWith('code:')) return 'fs';
    if (eventType.startsWith('terminal:')) return 'terminal';
    if (eventType.startsWith('api:')) return 'api';
    return null;
  }

  async startObserver(id: string): Promise<void> {
    try {
      switch (id) {
        case 'fs':
          await this.startFileWatcher();
          break;
        case 'terminal':
          this.startTerminalObserver();
          break;
        case 'api':
          this.startApiObserver();
          break;
        default:
          throw new Error(`Unknown observer: ${id}`);
      }
      this.logger.info(`Observer ${id} started`);
    } catch (error) {
      this.logger.error(`Failed to start observer ${id}: ${error}`);
      throw error;
    }
  }

  async stopObserver(id: string): Promise<void> {
    try {
      switch (id) {
        case 'fs':
          await this.fileWatcher.stop();
          this.codeObserver.stop();
          break;
        case 'terminal':
          // Terminal observer doesn't have a stop method, just clear subscriptions
          break;
        case 'api':
          // ApiObserver doesn't have a stop method - it's passive
          break;
        default:
          throw new Error(`Unknown observer: ${id}`);
      }
      this.logger.info(`Observer ${id} stopped`);
    } catch (error) {
      this.logger.error(`Failed to stop observer ${id}: ${error}`);
      throw error;
    }
  }

  private async startFileWatcher(): Promise<void> {
    const workspacePath = process.cwd(); // Could be made configurable per workspace
    this.fileWatcher.start([workspacePath]);
    this.codeObserver.start();
  }

  private startTerminalObserver(): void {
    // Real terminal integration would require shell hooks or PTY monitoring
    this.logger.info('Terminal observer ready for recording');
  }

  private startApiObserver(): void {
    // ApiObserver is passive - it just provides a recording interface
    // Real API monitoring would require middleware or request interceptors
    this.logger.info('API observer ready for recording');
  }

  getObserverStatuses(): ObserverStatus[] {
    return [
      {
        id: 'fs',
        title: 'FS Watcher',
        status: this.getObserverStatus('fs'),
        subtitle: process.cwd(),
        active: this.isObserverActive('fs'),
        lastEvent: this.lastEvents.get('fs'),
        eventCount: this.eventCounts.get('fs') || 0,
      },
      {
        id: 'terminal',
        title: 'Terminal',
        status: this.getObserverStatus('terminal'),
        subtitle: 'Shell hooks',
        active: this.isObserverActive('terminal'),
        lastEvent: this.lastEvents.get('terminal'),
        eventCount: this.eventCounts.get('terminal') || 0,
      },
      {
        id: 'api',
        title: 'API Monitor',
        status: this.getObserverStatus('api'),
        subtitle: 'REST Hooks',
        active: this.isObserverActive('api'),
        lastEvent: this.lastEvents.get('api'),
        eventCount: this.eventCounts.get('api') || 0,
      },
    ];
  }

  private getObserverStatus(id: string): 'Active' | 'Paused' | 'Error' {
    // For now, return based on active state
    // In a real implementation, this would check actual observer health
    return this.isObserverActive(id) ? 'Active' : 'Paused';
  }

  private isObserverActive(id: string): boolean {
    // This would track actual observer state
    // For now, assume fs and terminal are active, api is paused
    return id === 'fs' || id === 'terminal';
  }

  async toggleObserver(id: string, active: boolean): Promise<ObserverStatus> {
    if (active) {
      await this.startObserver(id);
    } else {
      await this.stopObserver(id);
    }
    
    const statuses = this.getObserverStatuses();
    return statuses.find(s => s.id === id)!;
  }

  getRecentEvents(observerId: string, limit: number = 50): any[] {
    // This would query the EventBus or PersistentEventStore for recent events
    // For now, return a placeholder
    return [];
  }

  // Convenience method for terminal recording
  recordTerminalOutput(sessionId: string, data: string): void {
    this.terminalObserver.record({ sessionId, data });
  }

  // Initialize all observers on service start
  async initialize(): Promise<void> {
    this.logger.info('Initializing ObserverService');
    
    // Start default observers
    await this.startObserver('fs');
    this.startObserver('terminal');
    // API observer starts paused by default
    
    this.logger.info('ObserverService initialized');
  }
}
