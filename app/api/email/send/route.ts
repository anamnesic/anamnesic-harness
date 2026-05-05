import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html } = body;

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY não configurada no servidor' },
        { status: 500 }
      );
    }

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: to, subject, html' },
        { status: 400 }
      );
    }

    const resendUrl = 'https://api.resend.com/emails';
    
    const response = await fetch(resendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@kairos.ai',
        to,
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erro ao enviar email', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Erro no envio de email:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
