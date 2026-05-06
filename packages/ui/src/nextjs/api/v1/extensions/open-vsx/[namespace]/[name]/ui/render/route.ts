export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { err } from '@/app/api/_lib/response';
import { getUiRenderHtml } from '@/app/api/_lib/open-vsx-ui';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ namespace: string; name: string }> },
) {
    try {
        const { namespace, name } = await params;
        if (!namespace || !name) {
            return err('VALIDATION_ERROR', 'namespace and name are required', 400);
        }

        const rendered = await getUiRenderHtml(namespace, name);

        return new Response(rendered.html, {
            status: 200,
            headers: {
                'content-type': 'text/html; charset=utf-8',
                'cache-control': 'no-store',
            },
        });
    } catch (e: any) {
        return err('OPEN_VSX_UI_RENDER_FAILED', e?.message ?? 'Failed to render extension UI', 500);
    }
}
