export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    try {
        const { workflowId } = await params;
        const db = await getDb();

        // Load triggers from database
        const triggers = await db.query(`
            SELECT * FROM workflow_triggers 
            WHERE workflow_id = $1 
            ORDER BY created_at DESC
        `, [workflowId]);

        return ok(triggers || []);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to load workflow triggers', 500);
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    try {
        const { workflowId } = await params;
        const body = await req.json();
        const { triggerType, config, enabled = true } = body;

        if (!triggerType || !config) {
            return err('VALIDATION_ERROR', 'triggerType and config are required', 400);
        }

        const db = await getDb();

        // Create new trigger
        const result = await db.query(`
            INSERT INTO workflow_triggers (workflow_id, trigger_type, config, enabled, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING *
        `, [
            workflowId,
            triggerType,
            JSON.stringify(config),
            enabled
        ]);

        const newTrigger = result[0];

        // Re-initialize triggers to activate the new one
        const { WorkflowTriggerInitializer } = await import('@/src/core/services/WorkflowTriggerInitializer');
        const { AdvancedFeaturesFactory } = await import('@/src/core/services/AdvancedFeaturesFactory');
        
        const factory = new AdvancedFeaturesFactory({
            httpServer: null as any,
            jwtSecret: process.env.JWT_SECRET || 'dummy-secret',
            aiProvider: null as any,
            db,
            enableAutomation: true,
        });
        
        const triggerService = factory.getWorkflowTriggers();
        const initializer = new WorkflowTriggerInitializer(triggerService);
        await initializer.initialize(db);

        return ok(newTrigger, 201);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to create workflow trigger', 500);
    }
}
