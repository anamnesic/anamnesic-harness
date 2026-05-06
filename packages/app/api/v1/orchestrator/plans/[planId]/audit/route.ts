export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ planId: string }> }
) {
    try {
        const { planId } = await params;
        const db = await getDb();
        const { OrchestratorRuntimeService } = await import('@/src/core/services/OrchestratorRuntimeService');
        const service = new OrchestratorRuntimeService(db);
        const audit = await service.listPolicyAudits(planId);
        return ok(audit);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list policy audits', 500);
    }
}
