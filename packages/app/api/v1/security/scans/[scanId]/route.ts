export const runtime = 'nodejs';

import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ scanId: string }> }
) {
    try {
        const { scanId } = await params;
        if (!scanId) return err('VALIDATION_ERROR', 'scanId is required', 400);

        const db = await getDb();
        const { SecurityAnalysisService } = await import('@/src/core/services/SecurityAnalysisService');
        const service = new SecurityAnalysisService(db);
        const scan = await service.getById(scanId);
        if (!scan) return err('NOT_FOUND', `Scan ${scanId} not found`, 404);
        return ok(scan);
    } catch (e) {
        console.error('[security/scans/:id GET]', e);
        return err('INTERNAL_ERROR', 'Failed to fetch scan', 500);
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ scanId: string }> }
) {
    try {
        const { scanId } = await params;
        if (!scanId) return err('VALIDATION_ERROR', 'scanId is required', 400);

        const db = await getDb();
        const { SecurityAnalysisService } = await import('@/src/core/services/SecurityAnalysisService');
        const service = new SecurityAnalysisService(db);
        const removed = await service.delete(scanId);
        if (!removed) return err('NOT_FOUND', `Scan ${scanId} not found`, 404);
        return ok({ id: scanId, deleted: true });
    } catch (e) {
        console.error('[security/scans/:id DELETE]', e);
        return err('INTERNAL_ERROR', 'Failed to delete scan', 500);
    }
}
