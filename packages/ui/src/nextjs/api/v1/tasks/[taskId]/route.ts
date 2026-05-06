export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;
        const db = await getDb();
        const { TaskService } = await import('@/src/core/services/TaskService');
        const taskService = new TaskService(db);

        const task = await taskService.getById(taskId);
        if (!task) {
            return err('NOT_FOUND', 'Task not found', 404);
        }

        const sanitizedTask = {
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
            history: task.history,
        };

        return ok(sanitizedTask);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to get task', 500);
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;
        const body = await req.json();
        const { status, output, error, reasoning } = body;

        const db = await getDb();
        const { TaskService } = await import('@/src/core/services/TaskService');
        const taskService = new TaskService(db);

        const task = await taskService.update(taskId, { status, output, error, reasoning });
        if (!task) {
            return err('NOT_FOUND', 'Task not found', 404);
        }

        return ok({
            id: task.id,
            status: task.status,
            output: task.output,
            error: task.error,
            reasoning: task.reasoning,
            updatedAt: task.updatedAt,
        });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to update task', 500);
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;
        const db = await getDb();
        const { TaskService } = await import('@/src/core/services/TaskService');
        const taskService = new TaskService(db);

        // TaskService doesn't have a delete method, so we'll use the repository directly
        const task = await taskService.getById(taskId);
        if (!task) {
            return err('NOT_FOUND', 'Task not found', 404);
        }

        await db.getRepository('Task').delete(taskId);
        return ok({ deleted: true });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to delete task', 500);
    }
}
