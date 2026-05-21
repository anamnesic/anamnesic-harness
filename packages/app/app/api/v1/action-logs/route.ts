export const runtime = 'nodejs';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ok, err } from '@/app/api/_lib/response';

const LOGS_DIR = path.join(os.homedir(), '.Kairos', 'action-logs');

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const limitParam = url.searchParams.get('limit');
        const pipelineIdParam = url.searchParams.get('pipelineId');
        const limit = Math.min(Number(limitParam) || 50, 200);

        const { ActionLogService } = await import('@/src/core/services/ActionLogService');
        const service = new ActionLogService(LOGS_DIR);

        if (pipelineIdParam) {
            const entries = await service.getByPipeline(pipelineIdParam);
            return ok(entries.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit));
        }

        try {
            await fs.access(LOGS_DIR);
            const files = await fs.readdir(LOGS_DIR);
            const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
            
            let allEntries: any[] = [];
            for (const file of jsonlFiles) {
                const pipelineId = path.basename(file, '.jsonl');
                const entries = await service.getByPipeline(pipelineId);
                allEntries = allEntries.concat(entries);
            }

            allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return ok(allEntries.slice(0, limit));
        } catch (e: any) {
            if (e.code === 'ENOENT') return ok([]);
            throw e;
        }
    } catch (e: any) {
        return err('LOG_READ_ERROR', e?.message ?? 'Failed to read action logs', 500);
    }
}
