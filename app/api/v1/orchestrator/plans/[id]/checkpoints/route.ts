export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const db = await getDb();
    const { OrchestratorRuntimeService } = await import('@/src/core/services/OrchestratorRuntimeService');
    const orchestratorService = new OrchestratorRuntimeService(db);
    
    const checkpoints = await orchestratorService.getCheckpoints(id);
    
    return ok({ checkpoints });
  } catch (error) {
    console.error('Checkpoints GET error:', error);
    return err('INTERNAL_ERROR', 'Failed to get checkpoints', 500);
  }
}
