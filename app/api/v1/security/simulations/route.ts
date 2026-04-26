export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const vulnerabilityId = searchParams.get('vulnerabilityId');

        const { AdvancedFeaturesFactory } = await import('@/src/core/services/AdvancedFeaturesFactory');
        const factory = new AdvancedFeaturesFactory({ db: await getDb() });
        const framework = factory.getAttackSimulation();

        if (vulnerabilityId) {
            return ok(framework.getVulnerabilitySimulations(vulnerabilityId));
        }

        // Return all simulations (framework needs a method for this, or we can use local state if it was persistent)
        // Since it's in-memory in the service instance, and we create a new factory, 
        // we might need a singleton for the framework.
        
        return ok([]); // For now
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { vulnerabilityId, attackType, targetUrl, pattern } = body;

        if (!vulnerabilityId || !attackType) {
            return err('VALIDATION_ERROR', 'vulnerabilityId and attackType are required', 400);
        }

        const { AdvancedFeaturesFactory } = await import('@/src/core/services/AdvancedFeaturesFactory');
        const factory = new AdvancedFeaturesFactory({ db: await getDb() });
        const framework = factory.getAttackSimulation();

        const simulation = await framework.simulateAttack(
            vulnerabilityId,
            attackType,
            targetUrl,
            pattern
        );

        return ok(simulation, 201);
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}
