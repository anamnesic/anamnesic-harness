export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
    try {
        const { projectId } = await params;
        const db = await getDb();
        const { ProjectService } = await import('@/src/core/services/ProjectService');
        const service = new ProjectService(db);
        const project = await service.get(projectId);
        if (!project) return err('NOT_FOUND', 'Project not found', 404);
        return ok(project);
    } catch { return err('INTERNAL_ERROR', 'Failed to get project', 500); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
    try {
        const { projectId } = await params;
        const body = await req.json();
        const db = await getDb();
        const { ProjectService } = await import('@/src/core/services/ProjectService');
        const service = new ProjectService(db);
        const project = await service.update(projectId, body);
        return ok(project);
    } catch (e) {
        if (e instanceof Error) return err('PROJECT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to update project', 500);
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
    try {
        const { projectId } = await params;
        const db = await getDb();
        const { ProjectService } = await import('@/src/core/services/ProjectService');
        const service = new ProjectService(db);
        await service.delete(projectId);
        return ok({ message: 'Project deleted' });
    } catch (e) {
        if (e instanceof Error) return err('PROJECT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to delete project', 500);
    }
}
