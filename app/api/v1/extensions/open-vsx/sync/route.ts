export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import {
    listInstalledOpenVsxExtensions,
    removeInstalledOpenVsxExtension,
    upsertInstalledOpenVsxExtension,
} from '@/app/api/_lib/open-vsx-installed';
import { OpenVsxHostInstaller } from '@/src/core/services/OpenVsxHostInstaller';
import { OpenVsxService } from '@/src/core/services/OpenVsxService';

export async function POST(_req: NextRequest) {
    try {
        const installer = OpenVsxHostInstaller.getInstance();
        const status = installer.getStatus();
        if (!status.available) {
            return err('HOST_INSTALLER_UNAVAILABLE', status.reason ?? 'Host installer unavailable', 503);
        }

        const hostInstalled = installer.listInstalledExtensions();
        const localInstalled = await listInstalledOpenVsxExtensions();

        const hostSet = new Set(hostInstalled.map((entry) => entry.id));
        const localSet = new Set(localInstalled.map((entry) => entry.id));

        const removed: string[] = [];
        for (const localEntry of localInstalled) {
            if (!hostSet.has(localEntry.id)) {
                const didRemove = await removeInstalledOpenVsxExtension(localEntry.id);
                if (didRemove) {
                    removed.push(localEntry.id);
                }
            }
        }

        const added: string[] = [];
        const refreshed: string[] = [];
        const openVsx = OpenVsxService.getInstance();

        for (const hostEntry of hostInstalled) {
            const [namespace, name] = hostEntry.id.split('.');
            if (!namespace || !name) {
                continue;
            }

            const existed = localSet.has(hostEntry.id);

            try {
                const detail = await openVsx.getExtension(namespace, name);
                await upsertInstalledOpenVsxExtension({
                    id: detail.id,
                    namespace: detail.namespace,
                    name: detail.name,
                    version: hostEntry.version || detail.version,
                    displayName: detail.displayName,
                    description: detail.description,
                    installedAt: new Date().toISOString(),
                    verified: detail.verified,
                    downloadUrl: detail.files?.download,
                    iconUrl: detail.files?.icon,
                });
            } catch {
                // Keep sync resilient: if details fail, write minimal host metadata.
                await upsertInstalledOpenVsxExtension({
                    id: hostEntry.id,
                    namespace,
                    name,
                    version: hostEntry.version ?? '',
                    displayName: hostEntry.id,
                    description: 'Imported from host extension list',
                    installedAt: new Date().toISOString(),
                    verified: false,
                });
            }

            if (existed) {
                refreshed.push(hostEntry.id);
            } else {
                added.push(hostEntry.id);
            }
        }

        const nextState = await listInstalledOpenVsxExtensions();

        return ok({
            host: status,
            added,
            removed,
            refreshed,
            total: nextState.length,
            extensions: nextState,
        });
    } catch (e: any) {
        return err('OPEN_VSX_SYNC_FAILED', e?.message ?? 'Failed to sync Open VSX state', 500);
    }
}
