export const runtime = 'nodejs';

import os from 'node:os';
import path from 'node:path';
import { ok, err } from '@/app/api/_lib/response';

const LOGS_DIR = path.join(os.homedir(), '.Kairos', 'action-logs');

export async function GET(
    request: Request,
    { params }: { params: Promise<{ pipelineId: string }> },
) {
    try {
        const { pipelineId } = await params;
        const url = new URL(request.url);
        const phaseParam = url.searchParams.get('phase');

        const { ActionLogService } = await import('@/src/core/services/ActionLogService');
        const service = new ActionLogService(LOGS_DIR);

        const entries =
            phaseParam !== null
                ? await service.getByPhase(pipelineId, Number(phaseParam))
                : await service.getByPipeline(pipelineId);

        return ok(entries);
    } catch (e: any) {
        if (e?.code === 'ENOENT') {
            return ok([]);
        }
        return err('LOG_READ_ERROR', e?.message ?? 'Failed to read action logs', 500);
    }
}
