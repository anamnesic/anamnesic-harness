export const runtime = 'nodejs';

import path from 'path';
import fs from 'fs';
import { ok, err } from '@/packages/ui/src/nextjs/api/_lib/response';
import { NextRequest } from 'next/server';

function vaultDir() {
  return path.join(process.cwd(), '..', '..', 'data', 'vault');
}

export async function DELETE(_req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const filePath = path.join(vaultDir(), 'secrets', `${params.key}.enc`);
    if (!fs.existsSync(filePath)) return err('NOT_FOUND', `Secret '${params.key}' not found`, 404);
    fs.rmSync(filePath);
    return ok({ key: params.key, deleted: true });
  } catch (e: any) {
    return err('VAULT_DELETE_ERROR', e?.message ?? 'Failed to delete secret', 500);
  }
}
