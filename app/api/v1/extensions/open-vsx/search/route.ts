export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { OpenVsxService } from '@/src/core/services/OpenVsxService';

export async function GET(req: NextRequest) {
    try {
        const query = req.nextUrl.searchParams.get('query') ?? '';
        const offset = Number(req.nextUrl.searchParams.get('offset') ?? '0');
        const size = Number(req.nextUrl.searchParams.get('size') ?? '24');

        const service = OpenVsxService.getInstance();
        const result = await service.search(query, Number.isFinite(offset) ? offset : 0, Number.isFinite(size) ? size : 24);

        return ok({
            query,
            offset: result.offset,
            totalSize: result.totalSize,
            extensions: result.extensions,
        });
    } catch (e: any) {
        return err('OPEN_VSX_SEARCH_FAILED', e?.message ?? 'Search failed', 502);
    }
}
