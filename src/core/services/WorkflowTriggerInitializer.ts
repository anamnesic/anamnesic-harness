import { Logger } from '../utils/Logger';
import { DataSource } from 'typeorm';
import { WorkflowTriggerService } from './WorkflowTriggerService';
import { getEventBus } from '@/src/observation/EventBus';

/**
 * Workflow Trigger Initializer
 * 
 * Loads workflow triggers from the database and initializes them
 * with the WorkflowTriggerService on application startup.
 */
export class WorkflowTriggerInitializer {
  private logger = Logger.getInstance('WorkflowTriggerInitializer');
  private triggerService: WorkflowTriggerService;
  private eventBus = getEventBus('workflow-triggers');

  constructor(triggerService: WorkflowTriggerService) {
    this.triggerService = triggerService;
  }

  /**
   * Initialize all workflow triggers from the database
   */
  async initialize(db: DataSource): Promise<void> {
    try {
      this.logger.info('Initializing workflow triggers from database');

      // Load workflow triggers from database
      const triggerRecords = await this.loadTriggersFromDb(db);
      
      this.logger.info(`Found ${triggerRecords.length} workflow triggers to initialize`);

      // Initialize each trigger
      for (const triggerRecord of triggerRecords) {
        await this.initializeTrigger(triggerRecord);
      }

      // Connect to EventBus for real-time event triggers
      this.connectToEventBus();

      this.logger.info('Workflow triggers initialization completed');
    } catch (error) {
      this.logger.error('Failed to initialize workflow triggers', { error });
      throw error;
    }
  }

  /**
   * Load trigger records from database
   */
  private async loadTriggersFromDb(db: DataSource): Promise<any[]> {
    try {
      // Try to get triggers from a WorkflowTrigger entity if it exists
      const queryRunner = db.createQueryRunner();
      
      // Check if workflow_triggers table exists
      const tableExists = await queryRunner.hasTable('workflow_triggers');
      
      if (!tableExists) {
        this.logger.info('Workflow triggers table does not exist, skipping initialization');
        return [];
      }

      // Load triggers from database
      const triggers = await db.query(`
        SELECT * FROM workflow_triggers 
        WHERE enabled = true 
        ORDER BY created_at DESC
      `);

      await queryRunner.release();
      return triggers || [];
    } catch (error) {
      this.logger.error('Failed to load triggers from database', { error });
      return [];
    }
  }

  /**
   * Initialize a single trigger
   */
  private async initializeTrigger(triggerRecord: any): Promise<void> {
    try {
      const { id, workflow_id, trigger_type, config } = triggerRecord;
      
      let trigger;

      switch (trigger_type) {
        case 'event':
          const eventConfig = JSON.parse(config);
          trigger = this.triggerService.registerEventTrigger(
            workflow_id,
            eventConfig.eventType,
            eventConfig.eventFilter
          );
          break;

        case 'schedule':
          const scheduleConfig = JSON.parse(config);
          trigger = this.triggerService.registerScheduleTrigger(
            workflow_id,
            scheduleConfig.cronExpression,
            scheduleConfig.timezone
          );
          break;

        case 'file-change':
          const fileConfig = JSON.parse(config);
          trigger = this.triggerService.registerFileTrigger(
            workflow_id,
            fileConfig.filePatterns,
            {
              ignorePatterns: fileConfig.ignorePatterns,
              changeTypes: fileConfig.changeTypes
            }
          );
          break;

        case 'webhook':
          const webhookConfig = JSON.parse(config);
          trigger = this.triggerService.registerWebhookTrigger(
            workflow_id,
            webhookConfig.secret,
            webhookConfig.ipWhitelist
          );
          break;

        default:
          this.logger.warn(`Unknown trigger type: ${trigger_type}`, { triggerId: id });
          return;
      }

      this.logger.info(`Initialized ${trigger_type} trigger`, {
        triggerId: id,
        workflowId: workflow_id
      });

    } catch (error) {
      this.logger.error(`Failed to initialize trigger ${triggerRecord.id}`, { error });
    }
  }

  /**
   * Connect to EventBus for real-time event handling
   */
  private connectToEventBus(): void {
    // Listen for system events that might trigger workflows
    this.eventBus.on('fs:change', (event) => {
      this.logger.debug('File system change detected', { event });
      // The WorkflowTriggerService will handle this internally
    });

    this.eventBus.on('task:completed', (event) => {
      this.logger.debug('Task completed event detected', { event });
      // Could be used to trigger workflows based on task completion
    });

    this.eventBus.on('agent:status', (event) => {
      this.logger.debug('Agent status change detected', { event });
      // Could be used to trigger workflows based on agent status
    });

    this.logger.info('Connected to EventBus for workflow trigger events');
  }

  /**
   * Create sample triggers for demonstration (if no triggers exist)
   */
  async createSampleTriggers(db: DataSource): Promise<void> {
    try {
      // Check if we have any triggers
      const existingTriggers = await this.loadTriggersFromDb(db);
      
      if (existingTriggers.length > 0) {
        this.logger.info('Triggers already exist, skipping sample creation');
        return;
      }

      this.logger.info('Creating sample workflow triggers');

      // Create a sample schedule trigger (runs every 5 minutes)
      await this.createSampleScheduleTrigger(db);

      // Create a sample event trigger (triggers on file changes)
      await this.createSampleEventTrigger(db);

      this.logger.info('Sample workflow triggers created');
    } catch (error) {
      this.logger.error('Failed to create sample triggers', { error });
    }
  }

  /**
   * Create a sample schedule trigger
   */
  private async createSampleScheduleTrigger(db: DataSource): Promise<void> {
    try {
      const sampleTrigger = {
        workflow_id: 'sample-workflow-id',
        trigger_type: 'schedule',
        config: JSON.stringify({
          type: 'schedule',
          cronExpression: '*/5 * * * *', // Every 5 minutes
          timezone: 'UTC'
        }),
        enabled: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      await db.query(`
        INSERT INTO workflow_triggers (workflow_id, trigger_type, config, enabled, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        sampleTrigger.workflow_id,
        sampleTrigger.trigger_type,
        sampleTrigger.config,
        sampleTrigger.enabled,
        sampleTrigger.created_at,
        sampleTrigger.updated_at
      ]);

      this.logger.info('Sample schedule trigger created');
    } catch (error) {
      // Table might not exist, which is fine for now
      this.logger.debug('Could not create sample schedule trigger (table may not exist)', { error });
    }
  }

  /**
   * Create a sample event trigger
   */
  private async createSampleEventTrigger(db: DataSource): Promise<void> {
    try {
      const sampleTrigger = {
        workflow_id: 'sample-workflow-id',
        trigger_type: 'event',
        config: JSON.stringify({
          type: 'event',
          eventType: 'fs:change',
          eventFilter: {
            'fileExtension': '.ts'
          }
        }),
        enabled: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      await db.query(`
        INSERT INTO workflow_triggers (workflow_id, trigger_type, config, enabled, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        sampleTrigger.workflow_id,
        sampleTrigger.trigger_type,
        sampleTrigger.config,
        sampleTrigger.enabled,
        sampleTrigger.created_at,
        sampleTrigger.updated_at
      ]);

      this.logger.info('Sample event trigger created');
    } catch (error) {
      // Table might not exist, which is fine for now
      this.logger.debug('Could not create sample event trigger (table may not exist)', { error });
    }
  }

  /**
   * Get trigger service instance
   */
  getTriggerService(): WorkflowTriggerService {
    return this.triggerService;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.triggerService.cleanup();
      this.logger.info('Workflow trigger initializer cleaned up');
    } catch (error) {
      this.logger.error('Failed to cleanup workflow trigger initializer', { error });
    }
  }
}
