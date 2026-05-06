export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

const VALID_STATES = ['idle', 'running', 'paused', 'error', 'stopped'] as const;

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params;
        const body = await req.json();
        if (!body.state) return err('VALIDATION_ERROR', 'state is required', 400);
        if (!VALID_STATES.includes(body.state)) {
            return err('VALIDATION_ERROR', `state must be one of: ${VALID_STATES.join(', ')}`, 400);
        }
        const db = await getDb();
        const { AgentService } = await import('@/src/core/services/AgentService');
        const service = new AgentService(db);
        const agent = await service.setState(agentId, body.state);
        if (!agent) return err('NOT_FOUND', 'Agent not found', 404);
        return ok(agent);
    } catch (e) {
        if (e instanceof Error) return err('AGENT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to set agent state', 500);
    }
}
