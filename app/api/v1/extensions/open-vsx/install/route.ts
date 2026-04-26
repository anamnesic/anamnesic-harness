export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { OpenVsxService } from '@/src/core/services/OpenVsxService';
import { upsertInstalledOpenVsxExtension } from '@/app/api/_lib/open-vsx-installed';
import { OpenVsxHostInstaller } from '@/src/core/services/OpenVsxHostInstaller';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const namespace = String(body?.namespace ?? '').trim();
        const name = String(body?.name ?? '').trim();

        if (!namespace || !name) {
            return err('VALIDATION_ERROR', 'namespace and name are required', 400);
        }

        const service = OpenVsxService.getInstance();
        const detail = await service.getExtension(namespace, name);
        const installer = OpenVsxHostInstaller.getInstance();

        const status = installer.getStatus();
        if (!status.available) {
            return err('HOST_INSTALLER_UNAVAILABLE', status.reason ?? 'Host installer unavailable', 503);
        }

        const downloadUrl = detail.files?.download;
        if (!downloadUrl) {
            return err('OPEN_VSX_INSTALL_FAILED', 'No VSIX download URL available for extension', 400);
        }

        const vsixPath = await installer.downloadVsix(downloadUrl, `${detail.namespace}.${detail.name}-${detail.version}`);
        const installExecution = await installer.installVsix(vsixPath, detail.id, detail.version);

        const record = {
            id: detail.id,
            namespace: detail.namespace,
            name: detail.name,
            version: detail.version,
            displayName: detail.displayName,
            description: detail.description,
            installedAt: new Date().toISOString(),
            verified: detail.verified,
            downloadUrl: detail.files?.download,
            iconUrl: detail.files?.icon,
        };

        await upsertInstalledOpenVsxExtension(record);

        return ok({
            installed: true,
            extension: record,
            hostInstall: {
                command: installExecution.command,
                args: installExecution.args,
            },
        }, 201);
    } catch (e: any) {
        return err(
            'OPEN_VSX_INSTALL_FAILED',
            e?.message ?? 'Failed to install extension',
            500,
            {
                name: e?.name,
                cause: e?.cause,
            },
        );
    }
}
