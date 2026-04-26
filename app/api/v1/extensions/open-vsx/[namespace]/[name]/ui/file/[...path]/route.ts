export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { err } from '@/app/api/_lib/response';
import { inferContentType, readUiAsset } from '@/app/api/_lib/open-vsx-ui';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ namespace: string; name: string; path: string[] }> },
) {
    try {
        const { namespace, name, path } = await params;
        if (!namespace || !name || !Array.isArray(path) || path.length === 0) {
            return err('VALIDATION_ERROR', 'namespace, name and file path are required', 400);
        }

        const asset = await readUiAsset(namespace, name, path);
        return new Response(asset.data, {
            status: 200,
            headers: {
                'content-type': inferContentType(asset.ext),
                'cache-control': 'public, max-age=300',
            },
        });
    } catch (e: any) {
        return err('OPEN_VSX_UI_FILE_FAILED', e?.message ?? 'Failed to serve extension UI asset', 404);
    }
}
