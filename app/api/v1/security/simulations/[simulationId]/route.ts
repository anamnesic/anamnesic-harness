export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ simulationId: string }> }
) {
    try {
        const { simulationId } = await params;
        const { AttackSimulationFramework } = await import('@/src/core/services/AttackSimulationFramework');
        const framework = AttackSimulationFramework.getInstance();
        
        const simulation = framework.getSimulation(simulationId);
        
        if (!simulation) {
            return err('NOT_FOUND', 'Simulation not found', 404);
        }
        
        return ok(simulation);
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}
