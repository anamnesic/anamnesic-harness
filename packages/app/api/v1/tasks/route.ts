export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';
import { getWorkspaceId } from '@/app/api/_lib/workspace';

export async function GET(req: NextRequest) {
    try {
        const workspaceIdFromCtx = getWorkspaceId(req);
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId') || workspaceIdFromCtx;
        const agentId = searchParams.get('agentId') || undefined;
        const status = searchParams.get('status') || undefined;
        
        const parsedLimit = Number.parseInt(searchParams.get('limit') ?? '', 10);
        const parsedOffset = Number.parseInt(searchParams.get('offset') ?? '', 10);
        const limit = Math.min(
            Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 50, 1),
            200
        );
        const offset = Math.max(Number.isFinite(parsedOffset) ? parsedOffset : 0, 0);

        const db = await getDb();
        const { TaskService } = await import('@/src/core/services/TaskService');
        const taskService = new TaskService(db);

        const { items, total } = await taskService.listTasksPaginated({
            workspaceId: workspaceId || undefined,
            agentId,
            status: status as any,
            limit,
            offset
        });

        // Sanitize tasks for response
        const sanitizedTasks = items.map(task => ({
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

        return ok({ items: sanitizedTasks, total, limit, offset });
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
