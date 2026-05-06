import { NextRequest, NextResponse } from 'next/server';

const RESEND_API = 'https://api.resend.com';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY não configurada' }, { status: 500 });
  }

  // Try sent first, then received
  const sentRes = await fetch(`${RESEND_API}/emails/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (sentRes.ok) {
    const data = await sentRes.json();
    return NextResponse.json({ success: true, data });
  }

  // Try received
  const receivedRes = await fetch(`${RESEND_API}/emails/receiving/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (receivedRes.ok) {
    const data = await receivedRes.json();
    return NextResponse.json({ success: true, data });
  }

  return NextResponse.json({ error: 'Email não encontrado' }, { status: 404 });
}
