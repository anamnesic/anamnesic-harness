export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { requireAuth } from '@/app/api/_lib/auth';
import { ok, err } from '@/app/api/_lib/response';
import { OrchestratorRuntimeService } from '@/src/core/services/OrchestratorRuntimeService';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ planId: string }> }
) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;

    try {
        const { planId } = await params;
        const db = await getDb();
        const service = new OrchestratorRuntimeService(db);
        const audit = await service.listPolicyAudits(planId);
        return ok(audit);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list policy audits', 500);
    }
}
