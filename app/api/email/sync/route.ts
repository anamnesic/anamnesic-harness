import { NextResponse } from 'next/server';
import { upsertEmailsByResendId, type EmailRecord } from '@/app/api/_lib/email-store';

const RESEND_API = 'https://api.resend.com';

interface ResendSentItem {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
  last_event: string | null;
}

interface ResendReceivedItem {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
  message_id?: string;
}

async function fetchResend<T>(path: string, apiKey: string): Promise<T | null> {
  const res = await fetch(`${RESEND_API}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY não configurada' }, { status: 500 });
  }

  const incoming: Omit<EmailRecord, 'id'>[] = [];

  // ── Sent emails ──────────────────────────────────────────────────────────
  const sentRes = await fetchResend<{ data: ResendSentItem[] }>('/emails?limit=100', apiKey);
  if (sentRes?.data) {
    for (const item of sentRes.data) {
      const lastEvent = item.last_event ?? undefined;
      let status: EmailRecord['status'] = 'sent';
      if (lastEvent === 'bounced' || lastEvent === 'complained') status = 'failed';

      incoming.push({
        resendId: item.id,
        to: Array.isArray(item.to) ? item.to.join(', ') : item.to,
        from: item.from,
        subject: item.subject,
        html: '',
        status,
        lastEvent,
        createdAt: item.created_at,
      });
    }
  }

  // ── Received emails ───────────────────────────────────────────────────────
  const receivedRes = await fetchResend<{ data: ResendReceivedItem[] }>(
    '/emails/receiving?limit=100',
    apiKey,
  );
  if (receivedRes?.data) {
    for (const item of receivedRes.data) {
      incoming.push({
        resendId: item.id,
        to: Array.isArray(item.to) ? item.to.join(', ') : item.to,
        from: item.from,
        subject: item.subject,
        html: '',
        status: 'received',
        messageId: item.message_id,
        createdAt: item.created_at,
      });
    }
  }

  const all = upsertEmailsByResendId(incoming);

  return NextResponse.json({
    success: true,
    synced: { sent: sentRes?.data?.length ?? 0, received: receivedRes?.data?.length ?? 0 },
    total: all.length,
    data: all,
  });
}
