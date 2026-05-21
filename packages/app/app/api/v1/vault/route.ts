export const runtime = 'nodejs';

import path from 'path';
import fs from 'fs';
import { ok, err } from '@/app/api/_lib/response';
import { NextRequest } from 'next/server';

function vaultDir() {
  return path.join(process.cwd(), '..', '..', 'data', 'vault');
}

export async function GET() {
  try {
    const dir = vaultDir();
    if (!fs.existsSync(dir)) return ok([]);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.enc'));
    const secrets = files.map(f => ({
      key: f.replace(/\.enc$/, ''),
      updatedAt: fs.statSync(path.join(dir, f)).mtime.toISOString(),
    }));
    return ok(secrets);
  } catch (e: any) {
    return err('VAULT_ERROR', e?.message ?? 'Failed to list secrets', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { key, value, description } = await req.json();
    if (!key || !value) return err('VALIDATION_ERROR', 'key and value are required', 400);
    const { vaultWrite } = await import('@kairos/vault');
    const payload = JSON.stringify({ value, description: description ?? '', writtenAt: new Date().toISOString() });
    await vaultWrite(`secrets/${key}`, payload);
    return ok({ key, stored: true });
  } catch (e: any) {
    return err('VAULT_WRITE_ERROR', e?.message ?? 'Failed to store secret', 500);
  }
}
