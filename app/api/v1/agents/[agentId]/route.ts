export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params;
        const db = await getDb();
        const { AgentService } = await import('@/src/core/services/AgentService');
        const service = new AgentService(db);
        const agent = await service.getById(agentId);
        if (!agent) return err('NOT_FOUND', 'Agent not found', 404);
        return ok(agent);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to get agent', 500);
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params;
        const body = await req.json();
        const db = await getDb();
        const { AgentService } = await import('@/src/core/services/AgentService');
        const service = new AgentService(db);
        const agent = await service.update(agentId, {
            name: body.name,
            description: body.description,
            capabilities: body.capabilities,
            config: body.config,
            state: body.state,
        });
        if (!agent) return err('NOT_FOUND', 'Agent not found', 404);
        return ok(agent);
    } catch (e) {
        if (e instanceof Error) return err('AGENT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to update agent', 500);
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const { agentId } = await params;
        const db = await getDb();
        const { AgentService } = await import('@/src/core/services/AgentService');
        const service = new AgentService(db);
        const existing = await service.getById(agentId);
        if (!existing) return err('NOT_FOUND', 'Agent not found', 404);
        await service.delete(agentId);
        return ok({ deleted: true });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to delete agent', 500);
    }
}
