import { NextResponse } from 'next/server';
import { listEmails } from '@/app/api/_lib/email-store';

export async function GET() {
  try {
    const emails = listEmails();
    return NextResponse.json({ success: true, data: emails });
  } catch (error) {
    console.error('Erro ao listar emails:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
