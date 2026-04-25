export const runtime = 'nodejs';

import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';

const DATA_DIR = process.env.KAIROS_DATA_DIR || path.join(process.env.USERPROFILE || process.env.HOME || '.', '.Kairos');
const FLAGS_FILE = path.join(DATA_DIR, 'feature-flags.json');

// Load persisted overrides on module load
const flagOverrides: Record<string, boolean> = (() => {
    try {
        if (fs.existsSync(FLAGS_FILE)) {
            return JSON.parse(fs.readFileSync(FLAGS_FILE, 'utf-8'));
        }
    } catch {
        // Invalid JSON or read error — start fresh
    }
    return {};
})();

function persistOverrides(): void {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(FLAGS_FILE, JSON.stringify(flagOverrides, null, 2), 'utf-8');
    } catch {
        // Best-effort persist; in-memory state remains valid
    }
}

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
        persistOverrides();
        const { featureFlags } = await import('@/src/config/featureFlags');
        return ok({ flags: { ...featureFlags, ...flagOverrides } });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to update settings', 500);
    }
}
