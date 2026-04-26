import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

const PUBLIC_API_PREFIXES = [
    '/api/v1/auth/login',
    '/api/v1/auth/signup',
    '/api/health',
];

function isOpenVsxUiAssetRoute(pathname: string): boolean {
    return pathname.startsWith('/api/v1/extensions/open-vsx/') && pathname.includes('/ui/file/');
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Let CORS preflight reach handlers untouched.
    if (request.method === 'OPTIONS') {
        return NextResponse.next();
    }

    // Public paths
    if (
        PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
        isOpenVsxUiAssetRoute(pathname) ||
        !pathname.startsWith('/api/')
    ) {
        return NextResponse.next();
    }

    const authHeader = request.headers.get('authorization');
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    // EventSource and browser-managed subresource requests cannot always set custom headers.
    if (!token && (pathname.startsWith('/api/v1/events') || pathname.startsWith('/api/v1/extensions/open-vsx/'))) {
        token = request.nextUrl.searchParams.get('token');
    }

    if (!token) {
        return new NextResponse(
            JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } }),
            { status: 401, headers: { 'content-type': 'application/json' } }
        );
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as any;

        if (!payload.userId) throw new Error('Invalid payload');

        // Add user info to headers for the route handlers
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('authorization', `Bearer ${token}`);
        requestHeaders.set('x-user-id', payload.userId as string);
        if (payload.email) requestHeaders.set('x-user-email', payload.email as string);

        // Allow SSE clients to provide workspace/project via query params.
        const workspaceId = request.nextUrl.searchParams.get('workspaceId');
        const projectId = request.nextUrl.searchParams.get('projectId');
        if (workspaceId) requestHeaders.set('x-workspace-id', workspaceId);
        if (projectId) requestHeaders.set('x-project-id', projectId);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } catch {
        return new NextResponse(
            JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }),
            { status: 401, headers: { 'content-type': 'application/json' } }
        );
    }
}

export const config = {
    matcher: '/api/:path*',
};