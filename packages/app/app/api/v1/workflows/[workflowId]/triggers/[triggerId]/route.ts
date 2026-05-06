export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ workflowId: string; triggerId: string }> }
) {
    try {
        const { workflowId, triggerId } = await params;
        const db = await getDb();

        const trigger = await db.query(`
            SELECT * FROM workflow_triggers 
            WHERE id = $1 AND workflow_id = $2
        `, [triggerId, workflowId]);

        if (!trigger || trigger.length === 0) {
            return err('NOT_FOUND', 'Trigger not found', 404);
        }

        return ok(trigger[0]);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to load workflow trigger', 500);
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ workflowId: string; triggerId: string }> }
) {
    try {
        const { workflowId, triggerId } = await params;
        const body = await req.json();
        const { config, enabled } = body;

        const db = await getDb();

        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (config !== undefined) {
            updateFields.push(`config = $${paramIndex++}`);
            updateValues.push(JSON.stringify(config));
        }

        if (enabled !== undefined) {
            updateFields.push(`enabled = $${paramIndex++}`);
            updateValues.push(enabled);
        }

        if (updateFields.length === 0) {
            return err('VALIDATION_ERROR', 'No fields to update', 400);
        }

        updateFields.push(`updated_at = NOW()`);
        updateValues.push(triggerId, workflowId);

        const result = await db.query(`
            UPDATE workflow_triggers 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex++} AND workflow_id = $${paramIndex++}
            RETURNING *
        `, updateValues);

        if (!result || result.length === 0) {
            return err('NOT_FOUND', 'Trigger not found', 404);
        }

        const updatedTrigger = result[0];

        // Re-initialize triggers to apply changes
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

        return ok(updatedTrigger);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to update workflow trigger', 500);
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ workflowId: string; triggerId: string }> }
) {
    try {
        const { workflowId, triggerId } = await params;
        const db = await getDb();

        const result = await db.query(`
            DELETE FROM workflow_triggers 
            WHERE id = $1 AND workflow_id = $2
            RETURNING *
        `, [triggerId, workflowId]);

        if (!result || result.length === 0) {
            return err('NOT_FOUND', 'Trigger not found', 404);
        }

        // Re-initialize triggers to remove the deleted one
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

        return ok({ deleted: true, trigger: result[0] });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to delete workflow trigger', 500);
    }
}
