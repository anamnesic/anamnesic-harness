export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';
import { createWorkspaceSchema } from '@/src/core/validation/schemas';
import { z } from 'zod';

export async function GET() {
    try {
        const db = await getDb();
        const { WorkspaceService } = await import('@/src/core/services/WorkspaceService');
        const workspaceService = new WorkspaceService(db);
        const workspaces = await workspaceService.listAll();
        return ok(workspaces);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list workspaces', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const input = createWorkspaceSchema.parse(body);
        const db = await getDb();
        const { WorkspaceService } = await import('@/src/core/services/WorkspaceService');
        const workspaceService = new WorkspaceService(db);
        const workspace = await workspaceService.create({
            name: input.name,
            slug: input.slug,
            description: input.description,
            ownerId: 'system',
        });
        return ok(workspace, 201);
    } catch (error) {
        if (error instanceof z.ZodError) return err('VALIDATION_ERROR', 'Invalid input', 400, error.flatten());
        if (error instanceof Error) return err('WORKSPACE_ERROR', error.message, 400);
        return err('INTERNAL_ERROR', 'Failed to create workspace', 500);
    }
}
