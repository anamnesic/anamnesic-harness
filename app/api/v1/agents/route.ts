export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const workspaceId = req.nextUrl.searchParams.get('workspaceId');
        const db = await getDb();

        if (workspaceId) {
            const { AgentService } = await import('@/src/core/services/AgentService');
            const service = new AgentService(db);
            const agents = await service.listByWorkspace(workspaceId, false);
            return ok(agents);
        } else {
            const { Agent } = await import('@/src/core/entities/Agent');
            const agents = await db.getRepository(Agent).find({ order: { createdAt: 'DESC' } });
            return ok(agents);
        }
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list agents', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body.name) return err('VALIDATION_ERROR', 'name is required', 400);

        const db = await getDb();
        const { AgentService } = await import('@/src/core/services/AgentService');
        const service = new AgentService(db);
        const agent = await service.create({
            workspaceId: body.workspaceId ?? 'system',
            name: body.name,
            description: body.description,
            capabilities: body.capabilities ?? ['reasoning'],
            config: body.config,
        });
        return ok(agent, 201);
    } catch (e) {
        if (e instanceof Error) return err('AGENT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to create agent', 500);
    }
}
