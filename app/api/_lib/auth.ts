import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthContext {
    userId: string;
    workspaceId?: string;
    role?: string;
    email?: string;
}

export function getAuthContext(req: NextRequest): AuthContext | null {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (!decoded.userId) return null;
        return {
            userId: decoded.userId,
            workspaceId: decoded.workspaceId,
            role: decoded.role,
            email: decoded.email,
        };
    } catch {
        return null;
    }
}

export function requireAuth(req: NextRequest): { auth: AuthContext } | { error: Response } {
    const auth = getAuthContext(req);
    if (!auth) {
        return {
            error: Response.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } },
                { status: 401 }
            ),
        };
    }
    return { auth };
}
