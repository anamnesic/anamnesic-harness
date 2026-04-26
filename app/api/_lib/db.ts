import type { DataSource } from 'typeorm';

let db: DataSource | null = null;
let observersInitialized = false;
let workflowsInitialized = false;
let retentionInitialized = false;
let syncInitialized = false;

export async function getDb(): Promise<DataSource> {
    if (db && db.isInitialized) return db;
    // Dynamic import defers the TypeORM entity module graph (which has circular
    // entity references) to runtime, avoiding ESM TDZ errors at bundle time.
    await import('reflect-metadata');
    const { getDatabase } = await import('@/src/core/database');
    db = await getDatabase();
    
    // Initialize observers on first DB connection
    if (!observersInitialized) {
        await initializeObservers(db);
        observersInitialized = true;
    }
    
    // Initialize workflow triggers on first DB connection
    if (!workflowsInitialized) {
        await initializeWorkflowTriggers(db);
        workflowsInitialized = true;
    }

    // Initialize retention policy on first DB connection
    if (!retentionInitialized) {
        await initializeRetentionPolicy(db);
        retentionInitialized = true;
    }

    // Initialize auto-sync on first DB connection
    if (!syncInitialized) {
        await initializeSync(db);
        syncInitialized = true;
    }
    
    return db;
}

async function initializeSync(database: DataSource): Promise<void> {
    try {
        const { AutoSyncService } = await import('@/src/core/services/AutoSyncService');
        const syncService = AutoSyncService.getInstance(database, {
            projectPath: process.cwd(),
            workspaceId: 'system',
        });
        await syncService.start();
        console.log('Auto-Sync Service initialized and started');
    } catch (error) {
        console.error('Failed to initialize auto-sync:', error);
    }
}

async function initializeRetentionPolicy(database: DataSource): Promise<void> {
    try {
        const { RetentionPolicyService } = await import('@/src/core/services/RetentionPolicyService');
        const { ChatHistoryService } = await import('@/src/core/services/ChatHistoryService');
        const { SettingsService } = await import('@/src/core/services/SettingsService');
        const { AdvancedFeaturesFactory } = await import('@/src/core/services/AdvancedFeaturesFactory');
        
        const chatHistoryService = new ChatHistoryService(database);
        const settingsService = new SettingsService(database);
        
        // Use factory for safety net
        const factory = new AdvancedFeaturesFactory({
            projectPath: process.cwd(),
            db: database,
        });
        const safetyNet = factory.getSafetyNet();
        
        const retentionService = RetentionPolicyService.getInstance(chatHistoryService, safetyNet);
        await retentionService.setSettingsService(settingsService);
        await retentionService.start();
        
        console.log('Retention Policy Service initialized and started');
    } catch (error) {
        console.error('Failed to initialize retention policy:', error);
    }
}

async function initializeObservers(database: DataSource): Promise<void> {
    try {
        const { ObserverService } = await import('@/src/core/services/ObserverService');
        const { SettingsService } = await import('@/src/core/services/SettingsService');
        const observerService = ObserverService.getInstance();
        const settingsService = new SettingsService(database);
        
        await observerService.setSettingsService(settingsService);
        await observerService.initialize();
        console.log('Observers initialized successfully');
    } catch (error) {
        console.error('Failed to initialize observers:', error);
        // Don't throw - observers are non-critical
    }
}

async function initializeWorkflowTriggers(database: DataSource): Promise<void> {
    try {
        const { AdvancedFeaturesFactory } = await import('@/src/core/services/AdvancedFeaturesFactory');
        const { WorkflowTriggerInitializer } = await import('@/src/core/services/WorkflowTriggerInitializer');
        
        // Initialize the advanced features factory to get the trigger service
        const factory = new AdvancedFeaturesFactory({
            httpServer: null as any, // Not needed for triggers
            jwtSecret: process.env.JWT_SECRET || 'dummy-secret',
            aiProvider: null as any, // Not needed for triggers
            db: database,
            enableAutomation: true,
        });
        
        const triggerService = factory.getWorkflowTriggers();
        const initializer = new WorkflowTriggerInitializer(triggerService);
        
        await initializer.initialize(database);
        
        console.log('Workflow triggers initialized successfully');
    } catch (error) {
        console.error('Failed to initialize workflow triggers:', error);
        // Don't throw - workflow triggers are non-critical
    }
}
