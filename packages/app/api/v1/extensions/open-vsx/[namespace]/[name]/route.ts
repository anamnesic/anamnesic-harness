export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { OpenVsxService } from '@/src/core/services/OpenVsxService';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ namespace: string; name: string }> },
) {
    try {
        const { namespace, name } = await params;
        if (!namespace || !name) {
            return err('VALIDATION_ERROR', 'namespace and name are required', 400);
        }

        const service = OpenVsxService.getInstance();
        const detail = await service.getExtension(namespace, name);
        return ok(detail);
    } catch (e: any) {
        return err('OPEN_VSX_DETAIL_FAILED', e?.message ?? 'Failed to fetch extension details', 502);
    }
}
