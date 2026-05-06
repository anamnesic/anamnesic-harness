export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';
import { getWorkspaceId } from '@/app/api/_lib/workspace';

export async function GET(req: NextRequest) {
    try {
        const workspaceId = getWorkspaceId(req);
        const db = await getDb();

        const { AgentService } = await import('@/src/core/services/AgentService');
        const service = new AgentService(db);
        const agents = await service.ensurePrebuiltAgents(workspaceId);
        return ok(agents);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list agents', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const workspaceId = getWorkspaceId(req);
        const body = await req.json();
        if (!body.name) return err('VALIDATION_ERROR', 'name is required', 400);

        const db = await getDb();
        const { AgentService } = await import('@/src/core/services/AgentService');
        const service = new AgentService(db);
        const agent = await service.create({
            workspaceId: body.workspaceId ?? workspaceId,
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
