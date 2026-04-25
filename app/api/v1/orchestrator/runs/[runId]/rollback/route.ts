export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

// Rolls a run back to a prior step or checkpoint by mutating the run record's
// runtime state (currentStep, checkpoints[], stepTaskMap, status).
//
// NOTE: RollbackService (src/core/services/RollbackService.ts) operates on
// per-pipeline-phase file snapshots and exposes only `rollback(pipelineId,
// phaseIndex)` — it has no `rollbackRun(runId, ...)` method. We therefore
// implement run-state rollback directly against OrchestratorRunRecord here.

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ runId: string }> }
) {
    try {
        const { runId } = await params;
        const body = await req.json().catch(() => ({}));
        const toStepRaw = body?.toStep;
        const toCheckpointIndexRaw = body?.toCheckpointIndex;

        const db = await getDb();
        const { OrchestratorRuntimeService } = await import('@/src/core/services/OrchestratorRuntimeService');
        const service = new OrchestratorRuntimeService(db);

        const run = await service.getRun(runId);
        if (!run) return err('NOT_FOUND', 'Run not found', 404);

        const checkpoints = Array.isArray(run.checkpoints) ? [...run.checkpoints] : [];

        let targetStep: number | null = null;
        let restoredState: Record<string, any> | null = null;

        if (Number.isInteger(toCheckpointIndexRaw)) {
            const idx = Number(toCheckpointIndexRaw);
            if (idx < 0 || idx >= checkpoints.length) {
                return err('INVALID_CHECKPOINT', `Checkpoint index ${idx} out of range (have ${checkpoints.length})`, 400);
            }
            targetStep = checkpoints[idx].step;
            restoredState = checkpoints[idx].state || null;
            run.checkpoints = checkpoints.slice(0, idx + 1);
        } else if (Number.isInteger(toStepRaw)) {
            targetStep = Number(toStepRaw);
            if (targetStep < 0) return err('INVALID_STEP', 'toStep must be >= 0', 400);
            run.checkpoints = checkpoints.filter(c => c.step <= targetStep!);
        } else {
            return err('INVALID_INPUT', 'Provide toStep (integer) or toCheckpointIndex (integer)', 400);
        }

        const previousStep = run.currentStep;
        run.currentStep = targetStep;
        run.stepTaskMap = (run.stepTaskMap || []).slice(0, targetStep);
        run.status = 'paused';
        run.failureReason = null;
        run.statePayload = {
            ...(restoredState ?? run.statePayload),
            status: 'paused',
            lastHeartbeatAt: new Date().toISOString(),
            rolledBackFrom: previousStep,
            rolledBackAt: new Date().toISOString(),
        };

        // Persist via the repository the service exposes. We re-use the runtime
        // service's `getRun` result and save through its db connection.
        const repo = db.getRepository((await import('@/src/core/entities/OrchestratorRun')).OrchestratorRunRecord);
        const saved = await repo.save(run);

        return ok({
            ...saved,
            note: 'run-state-rollback',
            previousStep,
            targetStep,
        });
    } catch (error) {
        if (error instanceof Error) return err('ROLLBACK_ERROR', error.message, 400);
        return err('INTERNAL_ERROR', 'Failed to rollback run', 500);
    }
}
