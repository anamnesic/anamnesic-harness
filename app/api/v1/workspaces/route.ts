export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';
import { createWorkspaceSchema } from '@/src/core/validation/schemas';
import { z } from 'zod';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');
        
        const db = await getDb();
        const { WorkspaceService } = await import('@/src/core/services/WorkspaceService');
        const workspaceService = new WorkspaceService(db);
        
        // If pagination is requested, use paginated method
        if (searchParams.has('limit') || searchParams.has('offset')) {
            const result = await workspaceService.listPaginated({ limit, offset });
            return ok({ items: result.items, total: result.total });
        }
        
        // Otherwise return all workspaces in expected format
        const workspaces = await workspaceService.listAll();
        return ok({ items: workspaces, total: workspaces.length });
    } catch (error) {
        console.error('Workspaces GET error:', error);
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
