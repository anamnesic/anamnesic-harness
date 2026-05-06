export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { listExtractedUiFiles, resolveInstalledVsixUi } from '@/app/api/_lib/open-vsx-ui';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ namespace: string; name: string }> },
) {
    try {
        const { namespace, name } = await params;
        if (!namespace || !name) {
            return err('VALIDATION_ERROR', 'namespace and name are required', 400);
        }

        const descriptor = await resolveInstalledVsixUi(namespace, name);
        if (!descriptor.available) {
            return ok({
                extensionId: descriptor.extensionId,
                available: false,
                reason: descriptor.reason,
            });
        }

        const files = await listExtractedUiFiles(namespace, name);

        return ok({
            extensionId: descriptor.extensionId,
            available: true,
            reason: null,
            htmlRelPath: descriptor.htmlRelPath,
            filesCount: files.length,
            renderUrl: `/api/v1/extensions/open-vsx/${namespace}/${name}/ui/render`,
        });
    } catch (e: any) {
        return err('OPEN_VSX_UI_DISCOVERY_FAILED', e?.message ?? 'Failed to discover extension UI', 500);
    }
}
