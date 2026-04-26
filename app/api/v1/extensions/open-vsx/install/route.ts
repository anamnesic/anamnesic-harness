export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { OpenVsxService } from '@/src/core/services/OpenVsxService';
import { upsertInstalledOpenVsxExtension } from '@/app/api/_lib/open-vsx-installed';

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

        return ok({ installed: true, extension: record }, 201);
    } catch (e: any) {
        return err('OPEN_VSX_INSTALL_FAILED', e?.message ?? 'Failed to install extension', 500);
    }
}
