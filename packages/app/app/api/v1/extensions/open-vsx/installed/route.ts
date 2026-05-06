export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { listInstalledOpenVsxExtensions } from '@/app/api/_lib/open-vsx-installed';

export async function GET(_req: NextRequest) {
    try {
        const extensions = await listInstalledOpenVsxExtensions();
        return ok({ extensions });
    } catch (e: any) {
        return err('OPEN_VSX_INSTALLED_LIST_FAILED', e?.message ?? 'Failed to list installed extensions', 500);
    }
}
