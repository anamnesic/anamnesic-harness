export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { listInstalledOpenVsxExtensions } from '@/app/api/_lib/open-vsx-installed';
import { buildCapabilityIndex, buildKairosRuntimeExtensions } from '@/app/api/_lib/open-vsx-runtime';

export async function GET(_req: NextRequest) {
    try {
        const installed = await listInstalledOpenVsxExtensions();
        const extensions = buildKairosRuntimeExtensions(installed);

        return ok({
            runtime: 'kairos',
            source: 'open-vsx',
            total: extensions.length,
            capabilityIndex: buildCapabilityIndex(extensions),
            extensions,
        });
    } catch (e: any) {
        return err('OPEN_VSX_RUNTIME_COMPATIBILITY_FAILED', e?.message ?? 'Failed to build Kairos runtime compatibility', 500);
    }
}
