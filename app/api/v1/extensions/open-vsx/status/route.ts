export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { OpenVsxHostInstaller } from '@/src/core/services/OpenVsxHostInstaller';
import { listInstalledOpenVsxExtensions } from '@/app/api/_lib/open-vsx-installed';

export async function GET(_req: NextRequest) {
    try {
        const installer = OpenVsxHostInstaller.getInstance();
        const hostStatus = installer.getStatus();
        const local = await listInstalledOpenVsxExtensions();

        if (!hostStatus.available) {
            return ok({
                host: hostStatus,
                localCount: local.length,
                hostCount: 0,
                missingInLocal: [],
                missingInHost: local.map((entry) => entry.id),
            });
        }

        const hostInstalled = installer.listInstalledExtensions();
        const localSet = new Set(local.map((entry) => entry.id));
        const hostSet = new Set(hostInstalled.map((entry) => entry.id));

        const missingInLocal = hostInstalled
            .map((entry) => entry.id)
            .filter((id) => !localSet.has(id));
        const missingInHost = local
            .map((entry) => entry.id)
            .filter((id) => !hostSet.has(id));

        return ok({
            host: hostStatus,
            localCount: local.length,
            hostCount: hostInstalled.length,
            missingInLocal,
            missingInHost,
        });
    } catch (e: any) {
        return err('OPEN_VSX_STATUS_FAILED', e?.message ?? 'Failed to get Open VSX status', 500);
    }
}
