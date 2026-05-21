import { NextResponse } from 'next/server';

const RESEND_API = 'https://api.resend.com';

// ── Defensive vault import ──────────────────────────────────────────────────
let vaultReady = false;
let vaultError: Error | null = null;
try {
  // Dynamic import to avoid crashing at module load if vault isn't configured
  await import('@/app/api/_lib/email-store');
  vaultReady = true;
} catch (e) {
  vaultError = e instanceof Error ? e : new Error(String(e));
  console.error('[email/sync] Vault import failed:', vaultError.message);
}

// Now do the real imports (they'll work if vault is configured)
let upsertEmailsByResendId: typeof import('@/app/api/_lib/email-store').upsertEmailsByResendId;
let readSyncMeta: typeof import('@/app/api/_lib/email-store').readSyncMeta;
let writeSyncMeta: typeof import('@/app/api/_lib/email-store').writeSyncMeta;
let EmailRecord: any;

if (vaultReady) {
  try {
    const mod = await import('@/app/api/_lib/email-store');
    upsertEmailsByResendId = mod.upsertEmailsByResendId;
    readSyncMeta = mod.readSyncMeta;
    writeSyncMeta = mod.writeSyncMeta;
    EmailRecord = mod.EmailRecord;
  } catch (e) {
    vaultError = e instanceof Error ? e : new Error(String(e));
  }
}

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

interface ResendListResponse<T> {
  object: string;
  has_more: boolean;
  data: T[];
}

async function fetchResendPage<T>(
  path: string,
  apiKey: string,
): Promise<ResendListResponse<T>> {
  const res = await fetch(`${RESEND_API}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend API error ${res.status} on ${path}: ${text || res.statusText}`);
  }
  return res.json() as Promise<ResendListResponse<T>>;
}

async function fetchAllPages<T extends { id: string }>(
  baseEndpoint: string,
  apiKey: string,
): Promise<{ items: T[]; newestId?: string }> {
  const all: T[] = [];
  let cursor: string | undefined;
  let newestId: string | undefined;

  do {
    const qs = cursor ? `?limit=100&after=${cursor}` : '?limit=100';
    const page = await fetchResendPage<T>(`${baseEndpoint}${qs}`, apiKey);
    if (!page.data.length) break;

    if (!newestId && all.length === 0) newestId = page.data[0].id;
    all.push(...page.data);
    cursor = page.has_more ? page.data[page.data.length - 1].id : undefined;
  } while (cursor);

  return { items: all, newestId };
}

async function fetchNewPages<T extends { id: string }>(
  baseEndpoint: string,
  apiKey: string,
  newestKnownId: string,
): Promise<{ items: T[]; newestId?: string }> {
  const all: T[] = [];
  let cursor: string | undefined;
  let newestId: string | undefined;

  do {
    const beforeParam = cursor ? `before=${cursor}` : `before=${newestKnownId}`;
    const page = await fetchResendPage<T>(`${baseEndpoint}?limit=100&${beforeParam}`, apiKey);
    if (!page.data.length) break;

    if (!newestId && all.length === 0) newestId = page.data[0].id;
    all.push(...page.data);
    cursor = page.has_more ? page.data[page.data.length - 1].id : undefined;
  } while (cursor);

  return { items: all, newestId };
}

function mapSent(item: ResendSentItem): Omit<any, 'id'> {
  const lastEvent = item.last_event ?? undefined;
  let status: string = 'sent';
  if (lastEvent === 'bounced' || lastEvent === 'complained') status = 'failed';
  return {
    resendId: item.id,
    to: Array.isArray(item.to) ? item.to.join(', ') : item.to,
    from: item.from,
    subject: item.subject,
    html: '',
    status,
    lastEvent,
    createdAt: item.created_at,
  };
}

function mapReceived(item: ResendReceivedItem): Omit<any, 'id'> {
  return {
    resendId: item.id,
    to: Array.isArray(item.to) ? item.to.join(', ') : item.to,
    from: item.from,
    subject: item.subject,
    html: '',
    status: 'received',
    messageId: item.message_id,
    createdAt: item.created_at,
  };
}

export async function GET() {
  // Check vault
  if (!vaultReady || vaultError) {
    return NextResponse.json(
      { error: 'Vault não configurado', message: vaultError?.message || 'Erro desconhecido no vault' },
      { status: 500 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY não configurada' }, { status: 500 });
  }

  try {
    const meta = readSyncMeta();
    const isFirstSync = !meta.firstSyncDone;

    let sentItems: ResendSentItem[] = [];
    let receivedItems: ResendReceivedItem[] = [];
    let newSentNewestId: string | undefined;
    let newReceivedNewestId: string | undefined;

    if (isFirstSync) {
      const [sentResult, receivedResult] = await Promise.all([
        fetchAllPages<ResendSentItem>('/emails', apiKey),
        fetchAllPages<ResendReceivedItem>('/emails/receiving', apiKey),
      ]);
      sentItems = sentResult.items;
      receivedItems = receivedResult.items;
      newSentNewestId = sentResult.newestId;
      newReceivedNewestId = receivedResult.newestId;
    } else {
      const [sentResult, receivedResult] = await Promise.all([
        meta.sentNewestId
          ? fetchNewPages<ResendSentItem>('/emails', apiKey, meta.sentNewestId)
          : fetchAllPages<ResendSentItem>('/emails', apiKey),
        meta.receivedNewestId
          ? fetchNewPages<ResendReceivedItem>('/emails/receiving', apiKey, meta.receivedNewestId)
          : fetchAllPages<ResendReceivedItem>('/emails/receiving', apiKey),
      ]);
      sentItems = sentResult.items;
      receivedItems = receivedResult.items;
      newSentNewestId = sentResult.newestId ?? meta.sentNewestId;
      newReceivedNewestId = receivedResult.newestId ?? meta.receivedNewestId;
    }

    const incoming = [
      ...sentItems.map(mapSent),
      ...receivedItems.map(mapReceived),
    ];

    const all = incoming.length > 0 ? upsertEmailsByResendId(incoming) : [];

    writeSyncMeta({
      firstSyncDone: true,
      sentNewestId: newSentNewestId ?? meta.sentNewestId,
      receivedNewestId: newReceivedNewestId ?? meta.receivedNewestId,
      lastSyncedAt: new Date().toISOString(),
    });

    const { listEmails } = await import('@/app/api/_lib/email-store');
    const result = incoming.length > 0 ? all : listEmails();

    return NextResponse.json({
      success: true,
      mode: isFirstSync ? 'full' : 'incremental',
      synced: { sent: sentItems.length, received: receivedItems.length },
      total: result.length,
      data: result,
    });
  } catch (err) {
    console.error('[email/sync] Error:', err);
    return NextResponse.json(
      { error: 'Erro interno no sync', message: String(err), stack: err instanceof Error ? err.stack : undefined },
      { status: 500 },
    );
  }
}
