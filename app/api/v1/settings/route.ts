export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';

// In-memory flag overrides (resets on redeploy — Phase 2 will persist to DB)
const flagOverrides: Record<string, boolean> = {};

export async function GET() {
    try {
        const { featureFlags } = await import('@/src/config/featureFlags');
        const flags = { ...featureFlags, ...flagOverrides };
        return ok({ flags });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to read settings', 500);
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body: Record<string, boolean> = await req.json();
        for (const [key, value] of Object.entries(body)) {
            if (typeof value === 'boolean') flagOverrides[key] = value;
        }
        const { featureFlags } = await import('@/src/config/featureFlags');
        return ok({ flags: { ...featureFlags, ...flagOverrides } });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to update settings', 500);
    }
}
