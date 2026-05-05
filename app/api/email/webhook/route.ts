import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verificar se é um evento do Resend
    const { type, data } = body;
    
    if (type === 'email.received' || type === 'email.delivered') {
      // Aqui você pode processar o email recebido
      console.log('Email recebido:', data);
      
      // Em produção, você salvaria no banco de dados
      // Por enquanto, apenas logamos
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
