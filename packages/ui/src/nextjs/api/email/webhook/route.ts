import { NextRequest, NextResponse } from 'next/server';
import { saveEmail, upsertEmailsByResendId } from '@/app/api/_lib/email-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === 'email.received') {
      // Persist the received email in the local store
      saveEmail({
        resendId: data?.email_id ?? data?.id,
        to: Array.isArray(data?.to) ? data.to.join(', ') : (data?.to ?? ''),
        from: data?.from ?? '',
        subject: data?.subject ?? '(sem assunto)',
        html: data?.html ?? data?.text ?? '',
        status: 'received',
        messageId: data?.message_id,
      });
    } else if (type) {
      // Delivery status update (email.delivered, email.bounced, etc.)
      const eventType = type.replace('email.', '');
      let status: 'sent' | 'failed' = 'sent';
      if (eventType === 'bounced' || eventType === 'complained') status = 'failed';

      if (data?.email_id ?? data?.id) {
        upsertEmailsByResendId([{
          resendId: data?.email_id ?? data?.id,
          to: Array.isArray(data?.to) ? data.to.join(', ') : (data?.to ?? ''),
          from: data?.from ?? '',
          subject: data?.subject ?? '',
          html: '',
          status,
          lastEvent: eventType,
          createdAt: data?.created_at ?? new Date().toISOString(),
        }]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
