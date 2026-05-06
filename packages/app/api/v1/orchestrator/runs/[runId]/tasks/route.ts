export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ runId: string }> }
) {
    try {
        const { runId } = await params;
        const db = await getDb();
        const { OrchestratorRunRecord } = await import('@/src/core/entities/OrchestratorRun');
        const { Task } = await import('@/src/core/entities/Task');

        const runRepo = db.getRepository(OrchestratorRunRecord);
        const run = await runRepo.findOne({ where: { id: runId } });

        if (!run) {
            return err('NOT_FOUND', 'Run not found', 404);
        }

        const taskIds = run.stepTaskMap?.map(step => step.taskId) || [];
        
        if (taskIds.length === 0) {
            return ok([]);
        }

        const taskRepo = db.getRepository(Task);
        const { In } = await import('typeorm');
        
        const tasks = await taskRepo.find({
            where: { id: In(taskIds) },
            order: { createdAt: 'ASC' }
        });

        // Sanitize tasks
        const sanitizedTasks = tasks.map(task => ({
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
    } catch (e) {
        if (e instanceof Error) return err('INTERNAL_ERROR', e.message, 500);
        return err('INTERNAL_ERROR', 'Failed to fetch tasks for run', 500);
    }
}
