export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

const ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number];

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params;
        const db = await getDb();
        const { WorkspaceService } = await import('@/src/core/services/WorkspaceService');
        const service = new WorkspaceService(db);
        const members = await service.getMembers(workspaceId);
        const result = members.map(m => ({
            id: m.id,
            userId: m.userId,
            email: m.user?.email ?? null,
            fullName: m.user?.fullName ?? null,
            role: m.role,
            joinedAt: m.joinedAt,
        }));
        return ok(result);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list members', 500);
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params;
        const body = await req.json().catch(() => ({}));
        const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
        const role = body.role as Role;
        if (!userId) return err('VALIDATION_ERROR', 'userId is required', 400);
        if (!ROLES.includes(role)) return err('VALIDATION_ERROR', `role must be one of ${ROLES.join(', ')}`, 400);

        const db = await getDb();
        const { User } = await import('@/src/core/entities/User');
        const userRepo = db.getRepository(User);
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) return err('NOT_FOUND', 'User not found', 404);

        const { WorkspaceService } = await import('@/src/core/services/WorkspaceService');
        const service = new WorkspaceService(db);
        try {
            const member = await service.addMember(workspaceId, userId, role);
            return ok({
                id: member.id,
                userId: member.userId,
                email: user.email,
                fullName: user.fullName,
                role: member.role,
                joinedAt: member.joinedAt,
            }, 201);
        } catch (e) {
            if (e instanceof Error && /already a member/i.test(e.message)) {
                return err('CONFLICT', e.message, 409);
            }
            throw e;
        }
    } catch (error) {
        if (error instanceof Error) return err('MEMBER_ERROR', error.message, 400);
        return err('INTERNAL_ERROR', 'Failed to add member', 500);
    }
}
