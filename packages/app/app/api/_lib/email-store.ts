import { vaultReadJsonSync, vaultWriteJsonSync } from '@kairos/vault';

export interface EmailRecord {
  id: string;
  resendId?: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  status: 'sent' | 'pending' | 'failed' | 'received';
  lastEvent?: string;
  messageId?: string;
  createdAt: string;
}

interface SyncMeta {
  firstSyncDone: boolean;
  sentNewestId?: string;
  receivedNewestId?: string;
  lastSyncedAt?: string;
}

function readStore(): EmailRecord[] {
  try {
    return vaultReadJsonSync<EmailRecord[]>('emails.json');
  } catch {
    return [];
  }
}

function writeStore(records: EmailRecord[]): void {
  vaultWriteJsonSync('emails.json', records);
}

export function readSyncMeta(): SyncMeta {
  try {
    return vaultReadJsonSync<SyncMeta>('email-sync-meta.json');
  } catch {
    return { firstSyncDone: false };
  }
}

export function writeSyncMeta(meta: SyncMeta): void {
  vaultWriteJsonSync('email-sync-meta.json', meta);
}

export function listEmails(): EmailRecord[] {
  return readStore().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function saveEmail(record: Omit<EmailRecord, 'id' | 'createdAt'>): EmailRecord {
  const records = readStore();
  const newRecord: EmailRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  records.push(newRecord);
  writeStore(records);
  return newRecord;
}

/**
 * Upsert a batch of records keyed by resendId.
 * Records without a resendId are always inserted.
 */
export function upsertEmailsByResendId(incoming: Omit<EmailRecord, 'id'>[]): EmailRecord[] {
  const records = readStore();
  const byResendId = new Map(records.filter((r) => r.resendId).map((r) => [r.resendId!, r]));

  for (const item of incoming) {
    if (item.resendId && byResendId.has(item.resendId)) {
      const existing = byResendId.get(item.resendId)!;
      Object.assign(existing, { lastEvent: item.lastEvent, status: item.status });
    } else {
      const newRecord: EmailRecord = { ...item, id: crypto.randomUUID() };
      records.push(newRecord);
      if (newRecord.resendId) byResendId.set(newRecord.resendId, newRecord);
    }
  }

  writeStore(records);
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
