export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('planId');
    
    const db = await getDb();
    const { OrchestratorRuntimeService } = await import('@/src/core/services/OrchestratorRuntimeService');
    const orchestratorService = new OrchestratorRuntimeService(db);
    
    let audits;
    if (planId) {
      audits = await orchestratorService.listPolicyAudits(planId);
    } else {
      // Get all audits if no planId specified
      const auditRepo = db.getRepository('PolicyDecisionAudit');
      audits = await auditRepo.find({
        order: { createdAt: 'DESC' },
        take: 100 // Limit to recent audits
      });
    }
    
    return ok({ audits });
  } catch (error) {
    console.error('Policy audits GET error:', error);
    return err('INTERNAL_ERROR', 'Failed to get policy audits', 500);
  }
}
