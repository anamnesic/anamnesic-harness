export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { getInstalledExtensionCompatibilityManifest } from '@/app/api/_lib/open-vsx-manifest';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ namespace: string; name: string }> },
) {
    try {
        const { namespace, name } = await params;
        if (!namespace || !name) {
            return err('VALIDATION_ERROR', 'namespace and name are required', 400);
        }

        const extensionId = `${namespace}.${name}`.toLowerCase();
        const manifest = await getInstalledExtensionCompatibilityManifest(extensionId);

        return ok({
            extensionId,
            compatibility: {
                mode: 'manifest-driven',
                manifest,
                screens: {
                    hasCommands: manifest.commands.length > 0,
                    hasViews: manifest.views.length > 0,
                    hasSettings: manifest.settings.length > 0,
                },
            },
        });
    } catch (e: any) {
        return err(
            'OPEN_VSX_COMPATIBILITY_FAILED',
            e?.message ?? 'Failed to load installed extension compatibility manifest',
            500,
        );
    }
}
