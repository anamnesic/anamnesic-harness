export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET() {
    try {
        const db = await getDb();
        const { ProjectService } = await import('@/src/core/services/ProjectService');
        const projectService = new ProjectService(db);
        const projects = await projectService.list();
        return ok(projects);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list projects', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body.name) return err('VALIDATION_ERROR', 'name is required', 400);
        const db = await getDb();
        const { ProjectService } = await import('@/src/core/services/ProjectService');
        const service = new ProjectService(db);
        const project = await service.create({ name: body.name, description: body.description ?? null });
        return ok(project, 201);
    } catch (e) {
        if (e instanceof Error) return err('PROJECT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to create project', 500);
    }
}
