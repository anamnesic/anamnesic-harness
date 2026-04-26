import type { DataSource } from 'typeorm';

let db: DataSource | null = null;
let observersInitialized = false;
let workflowsInitialized = false;

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
    
    return db;
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
