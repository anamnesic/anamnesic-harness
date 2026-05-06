export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const db = await getDb();
        const { DecisionService } = await import('@/src/core/services/DecisionService');
        const service = new DecisionService(db);
        const decisions = await service.listByProject(projectId);
        const sanitized = decisions.map(d => ({
            id: d.id,
            title: d.title,
            description: d.description,
            rationale: d.rationale,
            alternatives: d.alternatives,
            status: d.status,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            project: d.project ? { id: d.project.id } : null,
        }));
        return ok(sanitized);
    } catch (e) {
        if (e instanceof Error) return err('DECISION_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to list decisions', 500);
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params;
        const body = await req.json().catch(() => ({}));
        if (!body?.title || typeof body.title !== 'string') {
            return err('VALIDATION_ERROR', 'title is required', 400);
        }
        if (typeof body.description !== 'string') {
            return err('VALIDATION_ERROR', 'description is required', 400);
        }

        const db = await getDb();
        const { Project } = await import('@/src/core/entities/Project');
        const { Decision } = await import('@/src/core/entities/Decision');

        const projectRepo = db.getRepository(Project);
        const project = await projectRepo.findOne({ where: { id: projectId } });
        if (!project) return err('NOT_FOUND', 'Project not found', 404);

        const repo = db.getRepository(Decision);
        const decision = repo.create({
            title: body.title,
            description: body.description,
            rationale: body.rationale ?? null,
            alternatives: body.alternatives ?? null,
            status: typeof body.status === 'string' && body.status ? body.status : 'active',
            project,
        });
        const saved = await repo.save(decision);

        return ok({
            id: saved.id,
            title: saved.title,
            description: saved.description,
            rationale: saved.rationale,
            alternatives: saved.alternatives,
            status: saved.status,
            createdAt: saved.createdAt,
            updatedAt: saved.updatedAt,
            project: { id: project.id },
        }, 201);
    } catch (e) {
        if (e instanceof Error) return err('DECISION_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to create decision', 500);
    }
}
