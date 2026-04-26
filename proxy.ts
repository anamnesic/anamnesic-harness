import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  if (
    pathname.startsWith('/api/v1/auth/login') ||
    pathname.startsWith('/api/health') ||
    !pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // EventSource cannot send custom Authorization headers, so accept token in query here.
  if (!token && pathname.startsWith('/api/v1/events')) {
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

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }
}

export const config = {
  matcher: '/api/:path*',
};
