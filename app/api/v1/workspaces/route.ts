export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { requireAuth } from '@/app/api/_lib/auth';
import { ok, err } from '@/app/api/_lib/response';
import { WorkspaceService } from '@/src/core';
import { createWorkspaceSchema } from '@/src/core';
import { z } from 'zod';

export async function GET(req: NextRequest) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;
    const { auth } = guard;

    try {
        const db = await getDb();
        const workspaceService = new WorkspaceService(db);
        const workspaces = await workspaceService.listByUser(auth.userId);
        return ok(workspaces);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list workspaces', 500);
    }
}

export async function POST(req: NextRequest) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;
    const { auth } = guard;

    try {
        const body = await req.json();
        const input = createWorkspaceSchema.parse(body);
        const db = await getDb();
        const workspaceService = new WorkspaceService(db);
        const workspace = await workspaceService.create({
            name: input.name,
            slug: input.slug,
            description: input.description,
            ownerId: auth.userId,
        });
        return ok(workspace, 201);
    } catch (error) {
        if (error instanceof z.ZodError) return err('VALIDATION_ERROR', 'Invalid input', 400, error.flatten());
        if (error instanceof Error) return err('WORKSPACE_ERROR', error.message, 400);
        return err('INTERNAL_ERROR', 'Failed to create workspace', 500);
    }
}
