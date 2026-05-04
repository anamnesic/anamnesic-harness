export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Missing token' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify the current token (even if expired, we can still decode it)
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as any;
    
    if (!decoded.userId) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Invalid token payload' },
        { status: 401 }
      );
    }
    
    // Generate new token
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        workspaceId: decoded.workspaceId,
        role: decoded.role,
        email: decoded.email,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return NextResponse.json({
      token: newToken,
      tokenType: 'Bearer',
      expiresIn: 86400,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'INVALID_TOKEN', message: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
