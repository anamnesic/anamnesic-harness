export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId');
        const agentId = searchParams.get('agentId');
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        const db = await getDb();
        const { TaskService } = await import('@/src/core/services/TaskService');
        const taskService = new TaskService(db);

        let tasks;
        if (agentId) {
            tasks = await taskService.listByAgent(agentId, status as any);
        } else if (workspaceId) {
            tasks = await taskService.listByWorkspace(workspaceId, status as any);
        } else {
            return err('BAD_REQUEST', 'Either workspaceId or agentId is required', 400);
        }

        // Apply limit
        const limitedTasks = tasks.slice(0, limit);

        // Sanitize tasks for response
        const sanitizedTasks = limitedTasks.map(task => ({
            id: task.id,
            workspaceId: task.workspaceId,
            agentId: task.agentId,
            type: task.type,
            description: task.description,
            status: task.status,
            input: task.input,
            output: task.output,
            error: task.error,
            parentTaskId: task.parentTaskId,
            createdAt: task.createdAt,
            startedAt: task.startedAt,
            completedAt: task.completedAt,
            durationMs: task.durationMs,
            reasoning: task.reasoning,
        }));

        return ok(sanitizedTasks);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to list tasks', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { workspaceId, agentId, type, description, input, parentTaskId } = body;

        if (!workspaceId || !agentId || !type || !description || !input) {
            return err('VALIDATION_ERROR', 'workspaceId, agentId, type, description, and input are required', 400);
        }

        const db = await getDb();
        const { TaskService } = await import('@/src/core/services/TaskService');
        const taskService = new TaskService(db);

        const task = await taskService.create({
            workspaceId,
            agentId,
            type,
            description,
            input,
            parentTaskId,
        });

        return ok({
            id: task.id,
            workspaceId: task.workspaceId,
            agentId: task.agentId,
            type: task.type,
            description: task.description,
            status: task.status,
            input: task.input,
            parentTaskId: task.parentTaskId,
            createdAt: task.createdAt,
        }, 201);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to create task', 500);
    }
}
