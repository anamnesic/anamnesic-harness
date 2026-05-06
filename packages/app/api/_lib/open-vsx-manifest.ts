import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import AdmZip from 'adm-zip';

interface HostInstalledEntry {
    id: string;
    version?: string;
    installedAt?: string;
    vsixPath?: string;
}

interface ManifestCommand {
    command: string;
    title?: string;
    category?: string;
}

interface ManifestView {
    container: string;
    id?: string;
    name?: string;
    type?: string;
}

export interface OpenVsxCompatibilityManifest {
    id: string;
    name: string;
    displayName: string;
    publisher: string;
    version: string;
    description?: string;
    main?: string;
    browser?: string;
    activationEvents: string[];
    commands: ManifestCommand[];
    views: ManifestView[];
    settings: string[];
    rawContributes?: Record<string, unknown>;
}

const HOST_STORE_PATH = resolve(process.cwd(), 'logs', 'open-vsx-host-installed.json');

async function readHostStore(): Promise<HostInstalledEntry[]> {
    try {
        const raw = await readFile(HOST_STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter((entry) => entry && typeof entry.id === 'string')
            .map((entry) => ({
                id: String(entry.id).toLowerCase(),
                version: typeof entry.version === 'string' ? entry.version : undefined,
                installedAt: typeof entry.installedAt === 'string' ? entry.installedAt : undefined,
                vsixPath: typeof entry.vsixPath === 'string' ? entry.vsixPath : undefined,
            }));
    } catch {
        return [];
    }
}

function normalizeCommands(input: unknown): ManifestCommand[] {
    if (!Array.isArray(input)) {
        return [];
    }

    return input
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
            const cmd = item as Record<string, unknown>;
            return {
                command: String(cmd.command ?? ''),
                title: typeof cmd.title === 'string' ? cmd.title : undefined,
                category: typeof cmd.category === 'string' ? cmd.category : undefined,
            };
        })
        .filter((item) => item.command.length > 0);
}

function normalizeViews(input: unknown): ManifestView[] {
    if (!input || typeof input !== 'object') {
        return [];
    }

    const views: ManifestView[] = [];
    for (const [container, value] of Object.entries(input as Record<string, unknown>)) {
        if (!Array.isArray(value)) {
            continue;
        }

        for (const rawView of value) {
            if (!rawView || typeof rawView !== 'object') {
                continue;
            }
            const view = rawView as Record<string, unknown>;
            views.push({
                container,
                id: typeof view.id === 'string' ? view.id : undefined,
                name: typeof view.name === 'string' ? view.name : undefined,
                type: typeof view.type === 'string' ? view.type : undefined,
            });
        }
    }

    return views;
}

function normalizeSettings(input: unknown): string[] {
    if (!input || typeof input !== 'object') {
        return [];
    }

    const properties = (input as Record<string, unknown>).properties;
    if (!properties || typeof properties !== 'object') {
        return [];
    }

    return Object.keys(properties as Record<string, unknown>).sort();
}

function readPackageJsonFromVsix(vsixPath: string): Record<string, unknown> {
    if (!existsSync(vsixPath)) {
        throw new Error(`VSIX not found on disk: ${vsixPath}`);
    }

    const zip = new AdmZip(vsixPath);
    const packageEntry = zip.getEntry('extension/package.json') ?? zip.getEntry('package.json');
    if (!packageEntry) {
        throw new Error('Could not find package.json inside VSIX');
    }

    const raw = packageEntry.getData().toString('utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid extension package.json content');
    }

    return parsed as Record<string, unknown>;
}

export async function getInstalledExtensionCompatibilityManifest(extensionId: string): Promise<OpenVsxCompatibilityManifest> {
    const normalizedId = extensionId.trim().toLowerCase();
    if (!normalizedId) {
        throw new Error('Extension id is required');
    }

    const installed = await readHostStore();
    const match = installed.find((entry) => entry.id === normalizedId);
    if (!match || !match.vsixPath) {
        throw new Error(`No installed VSIX entry found for ${normalizedId}`);
    }

    const pkg = readPackageJsonFromVsix(match.vsixPath);
    const contributes = (pkg.contributes && typeof pkg.contributes === 'object')
        ? (pkg.contributes as Record<string, unknown>)
        : {};

    return {
        id: normalizedId,
        name: String(pkg.name ?? normalizedId),
        displayName: String(pkg.displayName ?? pkg.name ?? normalizedId),
        publisher: String(pkg.publisher ?? ''),
        version: String(pkg.version ?? match.version ?? ''),
        description: typeof pkg.description === 'string' ? pkg.description : undefined,
        main: typeof pkg.main === 'string' ? pkg.main : undefined,
        browser: typeof pkg.browser === 'string' ? pkg.browser : undefined,
        activationEvents: Array.isArray(pkg.activationEvents)
            ? pkg.activationEvents.map((event) => String(event))
            : [],
        commands: normalizeCommands(contributes.commands),
        views: normalizeViews(contributes.views),
        settings: normalizeSettings(contributes.configuration),
        rawContributes: contributes,
    };
}
