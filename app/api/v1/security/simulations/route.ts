export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';
import AttackSimulationFramework from '@/src/core/services/AttackSimulationFramework';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const simulationId = searchParams.get('simulationId');
        const vulnerabilityId = searchParams.get('vulnerabilityId');

        const framework = AttackSimulationFramework.getInstance();

        if (simulationId) {
            const simulation = framework.getSimulation(simulationId);
            if (!simulation) {
                return err('NOT_FOUND', `Simulation ${simulationId} not found`, 404);
            }
            return ok(simulation);
        }

        if (vulnerabilityId) {
            const simulations = framework.getVulnerabilitySimulations(vulnerabilityId);
            return ok(simulations);
        }

        const simulations = framework.getAllSimulations();
        return ok(simulations);
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

        const framework = AttackSimulationFramework.getInstance();

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
