import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export interface InstalledOpenVsxExtension {
    id: string;
    namespace: string;
    name: string;
    version: string;
    displayName: string;
    description: string;
    installedAt: string;
    verified: boolean;
    downloadUrl?: string;
    iconUrl?: string;
}

const STORE_PATH = resolve(process.cwd(), 'logs', 'open-vsx-installed.json');

async function ensureStoreFile(): Promise<void> {
    await mkdir(dirname(STORE_PATH), { recursive: true });
    try {
        await readFile(STORE_PATH, 'utf-8');
    } catch {
        await writeFile(STORE_PATH, JSON.stringify([], null, 2), 'utf-8');
    }
}

async function readStore(): Promise<InstalledOpenVsxExtension[]> {
    await ensureStoreFile();
    const raw = await readFile(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .filter((entry) => entry && typeof entry.id === 'string')
        .map((entry) => ({
            id: String(entry.id).toLowerCase(),
            namespace: String(entry.namespace ?? ''),
            name: String(entry.name ?? ''),
            version: String(entry.version ?? ''),
            displayName: String(entry.displayName ?? entry.name ?? ''),
            description: String(entry.description ?? ''),
            installedAt: String(entry.installedAt ?? new Date().toISOString()),
            verified: Boolean(entry.verified),
            downloadUrl: typeof entry.downloadUrl === 'string' ? entry.downloadUrl : undefined,
            iconUrl: typeof entry.iconUrl === 'string' ? entry.iconUrl : undefined,
        }));
}

async function writeStore(items: InstalledOpenVsxExtension[]): Promise<void> {
    await ensureStoreFile();
    await writeFile(STORE_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

export async function listInstalledOpenVsxExtensions(): Promise<InstalledOpenVsxExtension[]> {
    const items = await readStore();
    return items.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function upsertInstalledOpenVsxExtension(item: InstalledOpenVsxExtension): Promise<void> {
    const current = await readStore();
    const next = current.filter((entry) => entry.id !== item.id).concat(item);
    await writeStore(next);
}

export async function removeInstalledOpenVsxExtension(id: string): Promise<boolean> {
    const normalizedId = id.toLowerCase();
    const current = await readStore();
    const next = current.filter((entry) => entry.id !== normalizedId);
    if (next.length === current.length) {
        return false;
    }
    await writeStore(next);
    return true;
}
