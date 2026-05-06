export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params;
        const db = await getDb();
        const { WorkspaceService } = await import('@/src/core/services/WorkspaceService');
        const workspaceService = new WorkspaceService(db);
        const workspace = await workspaceService.getById(workspaceId);
        if (!workspace) return err('NOT_FOUND', 'Workspace not found', 404);
        return ok(workspace);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to get workspace', 500);
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params;
        const body = await req.json().catch(() => ({}));
        const db = await getDb();
        const { WorkspaceService } = await import('@/src/core/services/WorkspaceService');
        const workspaceService = new WorkspaceService(db);
        const existing = await workspaceService.getById(workspaceId);
        if (!existing) return err('NOT_FOUND', 'Workspace not found', 404);

        const allowed: Record<string, unknown> = {};
        if (typeof body.name === 'string') allowed.name = body.name;
        if (typeof body.description === 'string') allowed.description = body.description;
        if (typeof body.slug === 'string') allowed.slug = body.slug.toLowerCase();
        if (typeof body.status === 'string') allowed.status = body.status;
        if (typeof body.localPath === 'string' && body.localPath.trim()) {
            allowed.metadata = {
                ...(existing.metadata || {}),
                localPath: body.localPath.trim(),
            };
        }
        if (Object.keys(allowed).length === 0) {
            return err('VALIDATION_ERROR', 'At least one field (name, description, slug, status, localPath) is required', 400);
        }
        const updated = await workspaceService.update(workspaceId, allowed as any);
        return ok(updated);
    } catch (error) {
        if (error instanceof Error) return err('WORKSPACE_ERROR', error.message, 400);
        return err('INTERNAL_ERROR', 'Failed to update workspace', 500);
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params;
        const db = await getDb();
        const { WorkspaceService } = await import('@/src/core/services/WorkspaceService');
        const workspaceService = new WorkspaceService(db);
        const existing = await workspaceService.getById(workspaceId);
        if (!existing) return err('NOT_FOUND', 'Workspace not found', 404);
        await workspaceService.delete(workspaceId);
        return ok({ deleted: true, id: workspaceId });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to delete workspace', 500);
    }
}
