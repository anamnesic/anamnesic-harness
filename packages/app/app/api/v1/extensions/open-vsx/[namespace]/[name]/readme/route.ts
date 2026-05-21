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
        const readme = await service.getReadme(namespace, name);
        return ok(readme);
    } catch (e: any) {
        return err('OPEN_VSX_README_FAILED', e?.message ?? 'Failed to fetch readme', 502);
    }
}
