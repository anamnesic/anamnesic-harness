export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

function serialize(d: any) {
    return {
        id: d.id,
        title: d.title,
        description: d.description,
        rationale: d.rationale,
        alternatives: d.alternatives,
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        project: d.project ? { id: d.project.id } : null,
    };
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ projectId: string; decisionId: string }> }
) {
    try {
        const { projectId, decisionId } = await params;
        const db = await getDb();
        const { Decision } = await import('@/src/core/entities/Decision');
        const decision = await db.getRepository(Decision).findOne({
            where: { id: decisionId },
            relations: ['project'],
        });
        if (!decision || !decision.project || decision.project.id !== projectId) {
            return err('NOT_FOUND', 'Decision not found', 404);
        }
        return ok(serialize(decision));
    } catch (e) {
        if (e instanceof Error) return err('DECISION_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to get decision', 500);
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ projectId: string; decisionId: string }> }
) {
    try {
        const { projectId, decisionId } = await params;
        const body = await req.json().catch(() => ({}));
        const db = await getDb();
        const { Decision } = await import('@/src/core/entities/Decision');
        const repo = db.getRepository(Decision);
        const decision = await repo.findOne({
            where: { id: decisionId },
            relations: ['project'],
        });
        if (!decision || !decision.project || decision.project.id !== projectId) {
            return err('NOT_FOUND', 'Decision not found', 404);
        }
        const allowed: Array<keyof typeof body> = ['title', 'description', 'status', 'rationale', 'alternatives'];
        for (const k of allowed) {
            if (k in body) (decision as any)[k] = body[k];
        }
        const saved = await repo.save(decision);
        return ok(serialize(saved));
    } catch (e) {
        if (e instanceof Error) return err('DECISION_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to update decision', 500);
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ projectId: string; decisionId: string }> }
) {
    try {
        const { projectId, decisionId } = await params;
        const db = await getDb();
        const { Decision } = await import('@/src/core/entities/Decision');
        const repo = db.getRepository(Decision);
        const decision = await repo.findOne({
            where: { id: decisionId },
            relations: ['project'],
        });
        if (!decision || !decision.project || decision.project.id !== projectId) {
            return err('NOT_FOUND', 'Decision not found', 404);
        }
        await repo.remove(decision);
        return ok({ deleted: true, id: decisionId });
    } catch (e) {
        if (e instanceof Error) return err('DECISION_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to delete decision', 500);
    }
}
