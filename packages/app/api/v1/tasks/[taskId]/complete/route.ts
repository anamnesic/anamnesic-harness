export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;
        const body = await req.json();
        const { output } = body;

        if (!output) {
            return err('VALIDATION_ERROR', 'output is required', 400);
        }

        const db = await getDb();
        const { TaskService } = await import('@/src/core/services/TaskService');
        const taskService = new TaskService(db);

        const task = await taskService.complete(taskId, output);
        if (!task) {
            return err('NOT_FOUND', 'Task not found', 404);
        }

        return ok({
            id: task.id,
            status: task.status,
            output: task.output,
            completedAt: task.completedAt,
            durationMs: task.durationMs,
            updatedAt: task.updatedAt,
        });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to complete task', 500);
    }
}
