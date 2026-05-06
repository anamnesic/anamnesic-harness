import { NextResponse } from 'next/server';
import {
  upsertEmailsByResendId,
  readSyncMeta,
  writeSyncMeta,
  type EmailRecord,
} from '@/app/api/_lib/email-store';

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

interface ResendListResponse<T> {
  object: string;
  has_more: boolean;
  data: T[];
}

async function fetchResendPage<T>(
  path: string,
  apiKey: string,
): Promise<ResendListResponse<T> | null> {
  const res = await fetch(`${RESEND_API}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) return null;
  return res.json() as Promise<ResendListResponse<T>>;
}

/**
 * Full crawl: paginate ALL pages using `after=<cursor>` (newest-first, cursor walks older).
 * Returns all items found and the ID of the newest item (first item of first page).
 */
async function fetchAllPages<T extends { id: string }>(
  baseEndpoint: string,
  apiKey: string,
): Promise<{ items: T[]; newestId?: string }> {
  const all: T[] = [];
  let cursor: string | undefined;
  let newestId: string | undefined;

  // Resend returns newest-first. We walk older pages using `after=<oldest_id_so_far>`.
  do {
    const qs = cursor ? `?limit=100&after=${cursor}` : '?limit=100';
    const page = await fetchResendPage<T>(`${baseEndpoint}${qs}`, apiKey);
    if (!page || !page.data.length) break;

    if (!newestId && all.length === 0) newestId = page.data[0].id;
    all.push(...page.data);
    cursor = page.has_more ? page.data[page.data.length - 1].id : undefined;
  } while (cursor);

  return { items: all, newestId };
}

/**
 * Incremental crawl: fetch only items NEWER than `newestKnownId` using `before=<id>`.
 * Paginates in case >100 new items arrived since last sync.
 */
async function fetchNewPages<T extends { id: string }>(
  baseEndpoint: string,
  apiKey: string,
  newestKnownId: string,
): Promise<{ items: T[]; newestId?: string }> {
  const all: T[] = [];
  let cursor: string | undefined;
  let newestId: string | undefined;

  // `before=<newestKnownId>` returns items that appear before it in the list → newer items.
  do {
    const beforeParam = cursor ? `before=${cursor}` : `before=${newestKnownId}`;
    const page = await fetchResendPage<T>(`${baseEndpoint}?limit=100&${beforeParam}`, apiKey);
    if (!page || !page.data.length) break;

    if (!newestId && all.length === 0) newestId = page.data[0].id;
    all.push(...page.data);
    // If there are more newer items, use the first item (newest) of this page as next `before`
    // Actually for `before` cursor going deeper into newer items we need the last (oldest) item:
    cursor = page.has_more ? page.data[page.data.length - 1].id : undefined;
  } while (cursor);

  return { items: all, newestId };
}

function mapSent(item: ResendSentItem): Omit<EmailRecord, 'id'> {
  const lastEvent = item.last_event ?? undefined;
  let status: EmailRecord['status'] = 'sent';
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

function mapReceived(item: ResendReceivedItem): Omit<EmailRecord, 'id'> {
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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY não configurada' }, { status: 500 });
  }

  const meta = readSyncMeta();
  const isFirstSync = !meta.firstSyncDone;

  let sentItems: ResendSentItem[] = [];
  let receivedItems: ResendReceivedItem[] = [];
  let newSentNewestId: string | undefined;
  let newReceivedNewestId: string | undefined;

  if (isFirstSync) {
    // ── Full crawl: download everything ──────────────────────────────────
    const [sentResult, receivedResult] = await Promise.all([
      fetchAllPages<ResendSentItem>('/emails', apiKey),
      fetchAllPages<ResendReceivedItem>('/emails/receiving', apiKey),
    ]);
    sentItems = sentResult.items;
    receivedItems = receivedResult.items;
    newSentNewestId = sentResult.newestId;
    newReceivedNewestId = receivedResult.newestId;
  } else {
    // ── Incremental: only new items since last sync ───────────────────────
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

  const incoming: Omit<EmailRecord, 'id'>[] = [
    ...sentItems.map(mapSent),
    ...receivedItems.map(mapReceived),
  ];

  const all = incoming.length > 0 ? upsertEmailsByResendId(incoming) : [];

  // Persist sync metadata
  writeSyncMeta({
    firstSyncDone: true,
    sentNewestId: newSentNewestId ?? meta.sentNewestId,
    receivedNewestId: newReceivedNewestId ?? meta.receivedNewestId,
    lastSyncedAt: new Date().toISOString(),
  });

  // On incremental with no new items, return full local list
  const { listEmails } = await import('@/app/api/_lib/email-store');
  const result = incoming.length > 0 ? all : listEmails();

  return NextResponse.json({
    success: true,
    mode: isFirstSync ? 'full' : 'incremental',
    synced: { sent: sentItems.length, received: receivedItems.length },
    total: result.length,
    data: result,
  });
}
