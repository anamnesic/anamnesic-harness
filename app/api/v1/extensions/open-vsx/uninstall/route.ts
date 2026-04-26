export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { removeInstalledOpenVsxExtension } from '@/app/api/_lib/open-vsx-installed';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const id = String(body?.id ?? '').trim().toLowerCase();
        const namespace = String(body?.namespace ?? '').trim();
        const name = String(body?.name ?? '').trim();

        const resolvedId = id || (namespace && name ? `${namespace}.${name}`.toLowerCase() : '');
        if (!resolvedId) {
            return err('VALIDATION_ERROR', 'id or (namespace and name) is required', 400);
        }

        const removed = await removeInstalledOpenVsxExtension(resolvedId);
        return ok({ uninstalled: removed, id: resolvedId });
    } catch (e: any) {
        return err('OPEN_VSX_UNINSTALL_FAILED', e?.message ?? 'Failed to uninstall extension', 500);
    }
}
