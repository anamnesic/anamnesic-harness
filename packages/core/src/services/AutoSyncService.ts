import { SyncConfigService, SyncResult } from './SyncConfigService';
import { SyncConfig, SyncTrigger } from '../entities/SyncConfig';
import { DataSource } from 'typeorm';

interface ScheduledJob {
  configId: string;
  cronSchedule: string;
  nextRunAt: Date;
  projectId: string;
}

interface AutoSyncOptions {
  /** Check interval for scheduled tasks in ms (default: 60000 = 1 min) */
  checkIntervalMs?: number;
  /** Max consecutive failures before disabling a config */
  maxFailures?: number;
  /** Callback for sync events */
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: Error, configId: string) => void;
  onConfigDisabled?: (configId: string, reason: string) => void;
}

export interface AutoSyncStatus {
  isRunning: boolean;
  scheduledJobsCount: number;
  jobs: Array<{
    configId: string;
    projectId: string;
    cronSchedule: string;
    nextRunAt: Date;
  }>;
}

/**
 * Handles automatic sync based on triggers:
 * - on-change: Triggered externally when context changes
 * - scheduled: Runs on cron schedule
 * - manual: Only triggered via explicit call
 */
export class AutoSyncService {
  private syncService: SyncConfigService;
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private options: Required<AutoSyncOptions>;
  private isRunning = false;

  constructor(db: DataSource, options: AutoSyncOptions = {}) {
    this.syncService = new SyncConfigService(db);
    this.options = {
      checkIntervalMs: options.checkIntervalMs ?? 60000,
      maxFailures: options.maxFailures ?? 5,
      onSyncComplete: options.onSyncComplete ?? (() => {}),
      onSyncError: options.onSyncError ?? (() => {}),
      onConfigDisabled: options.onConfigDisabled ?? (() => {}),
    };
  }

  /**
   * Get the underlying SyncConfigService
   */
  getSyncConfigService(): SyncConfigService {
    return this.syncService;
  }

  /**
   * Start the auto-sync scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.loadScheduledJobs();

    this.checkInterval = setInterval(async () => {
      await this.checkScheduledJobs();
    }, this.options.checkIntervalMs);

    console.log('[AutoSync] Scheduler started with ' + this.scheduledJobs.size + ' jobs');
  }

  /**
   * Stop the auto-sync scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.scheduledJobs.clear();
    this.isRunning = false;
    console.log('[AutoSync] Scheduler stopped');
  }

  /**
   * Get current scheduler status
   */
  getStatus(): AutoSyncStatus {
    return {
      isRunning: this.isRunning,
      scheduledJobsCount: this.scheduledJobs.size,
      jobs: Array.from(this.scheduledJobs.values()).map(job => ({
        configId: job.configId,
        projectId: job.projectId,
        cronSchedule: job.cronSchedule,
        nextRunAt: job.nextRunAt,
      })),
    };
  }

  /**
   * Trigger sync for on-change configs of a project
   * Called when project context is modified
   */
  async triggerOnChange(projectId: string): Promise<SyncResult[]> {
    const configs = await this.syncService.getEnabledByProject(projectId);
    const onChangeConfigs = configs.filter(c => c.trigger === 'on-change');

    const results: SyncResult[] = [];
    for (const config of onChangeConfigs) {
      try {
        const result = await this.syncService.executeSyncForConfig(config);
        this.options.onSyncComplete(result);
        results.push(result);

        if (!result.success) {
          await this.handleSyncFailure(config);
        }
      } catch (error) {
        this.options.onSyncError(error as Error, config.id);
        results.push({
          success: false,
          syncConfigId: config.id,
          target: config.target,
          outputPath: '',
          error: (error as Error).message,
          syncedAt: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Trigger sync for all enabled configs of a project (any trigger type)
   */
  async triggerAll(projectId: string): Promise<SyncResult[]> {
    const configs = await this.syncService.getEnabledByProject(projectId);

    const results: SyncResult[] = [];
    for (const config of configs) {
      try {
        const result = await this.syncService.executeSyncForConfig(config);
        this.options.onSyncComplete(result);
        results.push(result);

        if (!result.success) {
          await this.handleSyncFailure(config);
        }
      } catch (error) {
        this.options.onSyncError(error as Error, config.id);
        results.push({
          success: false,
          syncConfigId: config.id,
          target: config.target,
          outputPath: '',
          error: (error as Error).message,
          syncedAt: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Manually trigger sync for a specific config
   */
  async triggerSync(configId: string): Promise<SyncResult> {
    const result = await this.syncService.executeSync(configId);
    this.options.onSyncComplete(result);

    if (!result.success) {
      const config = await this.syncService.get(configId);
      if (config) {
        await this.handleSyncFailure(config);
      }
    }

    return result;
  }

  /**
   * Reload scheduled jobs (call after config changes)
   */
  async reloadScheduledJobs(): Promise<void> {
    this.scheduledJobs.clear();
    await this.loadScheduledJobs();
    console.log('[AutoSync] Reloaded ' + this.scheduledJobs.size + ' scheduled jobs');
  }

  /**
   * Add or update a scheduled job for a config
   */
  async addScheduledJob(configId: string): Promise<void> {
    const config = await this.syncService.get(configId);
    if (!config || config.trigger !== 'scheduled' || !config.enabled || !config.cronSchedule) {
      return;
    }

    const nextRun = this.getNextCronRun(config.cronSchedule);
    this.scheduledJobs.set(configId, {
      configId: config.id,
      cronSchedule: config.cronSchedule,
      nextRunAt: nextRun,
      projectId: config.projectId,
    });
  }

  /**
   * Remove a scheduled job
   */
  removeScheduledJob(configId: string): void {
    this.scheduledJobs.delete(configId);
  }

  private async loadScheduledJobs(): Promise<void> {
    const scheduledConfigs = await this.syncService.getScheduled();

    for (const config of scheduledConfigs) {
      if (config.cronSchedule) {
        const nextRun = this.getNextCronRun(config.cronSchedule);
        this.scheduledJobs.set(config.id, {
          configId: config.id,
          cronSchedule: config.cronSchedule,
          nextRunAt: nextRun,
          projectId: config.projectId,
        });
      }
    }
  }

  private async checkScheduledJobs(): Promise<void> {
    const now = new Date();

    for (const [configId, job] of this.scheduledJobs) {
      if (job.nextRunAt <= now) {
        try {
          console.log('[AutoSync] Running scheduled job for config ' + configId);
          const result = await this.syncService.executeSync(configId);
          this.options.onSyncComplete(result);

          if (!result.success) {
            const config = await this.syncService.get(configId);
            if (config) {
              await this.handleSyncFailure(config);
            }
          }

          // Update next run time
          job.nextRunAt = this.getNextCronRun(job.cronSchedule);
        } catch (error) {
          this.options.onSyncError(error as Error, configId);
        }
      }
    }
  }

  private async handleSyncFailure(config: SyncConfig): Promise<void> {
    const newFailureCount = config.failureCount + 1;

    if (newFailureCount >= this.options.maxFailures) {
      await this.syncService.update(config.id, { enabled: false });
      this.removeScheduledJob(config.id);

      const reason = 'Disabled after ' + newFailureCount + ' consecutive failures';
      this.options.onConfigDisabled(config.id, reason);
      console.warn('[AutoSync] ' + reason + ' for config ' + config.id);
    }
  }

  /**
   * Parse cron expression and get next run time
   * Supports: minute hour day-of-month month day-of-week
   * Examples: "0 9 * * *" = 9am daily, "0 * * * *" = every hour, "* /15 * * * *" = every 15 min
   */
  private getNextCronRun(cronExpression: string): Date {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) {
      // Invalid cron, default to 1 hour from now
      return new Date(Date.now() + 60 * 60 * 1000);
    }

    const [minute, hour] = parts;
    const now = new Date();
    const next = new Date(now);

    // Simple implementation for common patterns
    if (minute.startsWith('*/')) {
      // Every N minutes
      const interval = parseInt(minute.slice(2), 10);
      const currentMinute = now.getMinutes();
      const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;
      next.setMinutes(nextMinute, 0, 0);
      if (next <= now) {
        next.setMinutes(next.getMinutes() + interval);
      }
      return next;
    }

    if (hour.startsWith('*/')) {
      // Every N hours
      const interval = parseInt(hour.slice(2), 10);
      const currentHour = now.getHours();
      const nextHour = Math.ceil((currentHour + 1) / interval) * interval;
      next.setHours(nextHour, parseInt(minute, 10) || 0, 0, 0);
      if (next <= now) {
        next.setHours(next.getHours() + interval);
      }
      return next;
    }

    // Specific time (e.g., "0 9 * * *" = 9:00 AM daily)
    const targetMinute = parseInt(minute, 10) || 0;
    const targetHour = parseInt(hour, 10);

    if (!isNaN(targetHour)) {
      next.setHours(targetHour, targetMinute, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    // Default: 1 hour from now
    return new Date(Date.now() + 60 * 60 * 1000);
  }
}
