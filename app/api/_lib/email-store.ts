import fs from 'fs';
import path from 'path';

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

const STORE_PATH = path.join(process.cwd(), 'data', 'emails.json');

function readStore(): EmailRecord[] {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as EmailRecord[];
  } catch {
    return [];
  }
}

function writeStore(records: EmailRecord[]): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
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
      // Merge — update status/lastEvent but keep existing id and createdAt
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
