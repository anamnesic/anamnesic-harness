export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { IntegrationService } = await import('@/src/core/services/IntegrationService');
        const service = IntegrationService.getInstance();
        
        service.removeWebhook(id);
        
        return ok({ deleted: true });
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}
