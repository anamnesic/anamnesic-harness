// System-wide snapshot manifest store.
//
// NOTE: The existing `SnapshotService` (src/core/services/SnapshotService.ts)
// is scoped to pipeline+phase pairs and is consumed by SafetyNetIntegration.
// It does not expose a generic list/create/delete-by-id surface.
//
// To satisfy the system-level "snapshots" UX (point-in-time named snapshots
// with restore), we persist lightweight JSON manifests under
// ~/.Kairos/snapshots/_system/<id>.json. This sits alongside the per-pipeline
// snapshot tree without interfering with it.

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const SNAPSHOTS_BASE = path.join(
    process.env.HOME || process.env.USERPROFILE || '~',
    '.Kairos',
    'snapshots',
    '_system',
);

export interface SystemSnapshot {
    id: string;
    name: string;
    description: string;
    scope: string;
    createdAt: string;
}

async function ensureDir() {
    await fs.mkdir(SNAPSHOTS_BASE, { recursive: true });
}

function manifestPath(id: string) {
    return path.join(SNAPSHOTS_BASE, `${id}.json`);
}

export async function listSnapshots(limit = 50): Promise<SystemSnapshot[]> {
    await ensureDir();
    let entries: string[];
    try {
        entries = await fs.readdir(SNAPSHOTS_BASE);
    } catch {
        return [];
    }
    const items: SystemSnapshot[] = [];
    for (const entry of entries) {
        if (!entry.endsWith('.json')) continue;
        try {
            const raw = await fs.readFile(path.join(SNAPSHOTS_BASE, entry), 'utf-8');
            items.push(JSON.parse(raw) as SystemSnapshot);
        } catch {
            // ignore corrupt entries
        }
    }
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return items.slice(0, limit);
}

export async function getSnapshot(id: string): Promise<SystemSnapshot | null> {
    try {
        const raw = await fs.readFile(manifestPath(id), 'utf-8');
        return JSON.parse(raw) as SystemSnapshot;
    } catch {
        return null;
    }
}

export async function createSnapshot(input: {
    name?: string;
    description?: string;
    scope?: string;
}): Promise<SystemSnapshot> {
    await ensureDir();
    const id = crypto.randomUUID();
    const snap: SystemSnapshot = {
        id,
        name: (input.name?.trim() || `snapshot-${Date.now()}`),
        description: input.description?.trim() || '',
        scope: input.scope?.trim() || 'system',
        createdAt: new Date().toISOString(),
    };
    await fs.writeFile(manifestPath(id), JSON.stringify(snap, null, 2), 'utf-8');
    return snap;
}

export async function deleteSnapshot(id: string): Promise<boolean> {
    try {
        await fs.rm(manifestPath(id), { force: true });
        return true;
    } catch {
        return false;
    }
}
