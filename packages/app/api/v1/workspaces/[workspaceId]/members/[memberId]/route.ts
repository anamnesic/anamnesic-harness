export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

const ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number];

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
    try {
        const { workspaceId, memberId } = await params;
        const body = await req.json().catch(() => ({}));
        const role = body.role as Role;
        if (!ROLES.includes(role)) return err('VALIDATION_ERROR', `role must be one of ${ROLES.join(', ')}`, 400);

        const db = await getDb();
        const { WorkspaceMember } = await import('@/src/core/entities/WorkspaceMember');
        const repo = db.getRepository(WorkspaceMember);
        const member = await repo.findOne({ where: { id: memberId, workspaceId }, relations: ['user'] });
        if (!member) return err('NOT_FOUND', 'Member not found', 404);

        await repo.update({ id: memberId }, { role });
        const updated = await repo.findOne({ where: { id: memberId }, relations: ['user'] });
        return ok({
            id: updated!.id,
            userId: updated!.userId,
            email: updated!.user?.email ?? null,
            fullName: updated!.user?.fullName ?? null,
            role: updated!.role,
            joinedAt: updated!.joinedAt,
        });
    } catch (error) {
        if (error instanceof Error) return err('MEMBER_ERROR', error.message, 400);
        return err('INTERNAL_ERROR', 'Failed to update member', 500);
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
    try {
        const { workspaceId, memberId } = await params;
        const db = await getDb();
        const { WorkspaceMember } = await import('@/src/core/entities/WorkspaceMember');
        const repo = db.getRepository(WorkspaceMember);
        const member = await repo.findOne({ where: { id: memberId, workspaceId } });
        if (!member) return err('NOT_FOUND', 'Member not found', 404);
        await repo.delete({ id: memberId });
        return ok({ deleted: true });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to remove member', 500);
    }
}
