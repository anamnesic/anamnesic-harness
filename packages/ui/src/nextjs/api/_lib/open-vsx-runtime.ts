import { InstalledOpenVsxExtension } from '@/app/api/_lib/open-vsx-installed';

export interface KairosRuntimeExtension {
    id: string;
    namespace: string;
    name: string;
    displayName: string;
    description: string;
    version: string;
    source: 'open-vsx';
    runtime: 'kairos';
    enabled: true;
    capabilities: string[];
}

function inferCapabilities(extension: InstalledOpenVsxExtension): string[] {
    const haystack = [
        extension.id,
        extension.namespace,
        extension.name,
        extension.displayName,
        extension.description,
    ].join(' ').toLowerCase();

    const capabilities = new Set<string>();

    if (/(mcp|model context protocol)/.test(haystack)) {
        capabilities.add('mcp-integration');
    }
    if (/(lint|eslint|formatter|prettier)/.test(haystack)) {
        capabilities.add('code-quality');
    }
    if (/(test|jest|vitest|coverage)/.test(haystack)) {
        capabilities.add('testing');
    }
    if (/(git|github|pull request|repository)/.test(haystack)) {
        capabilities.add('scm');
    }
    if (/(docker|kubernetes|devops|ci\/cd|pipeline)/.test(haystack)) {
        capabilities.add('devops');
    }
    if (/(debug|profiler|trace)/.test(haystack)) {
        capabilities.add('debugging');
    }
    if (/(python|typescript|javascript|java|go|rust|c\+\+|c#|language)/.test(haystack)) {
        capabilities.add('language-support');
    }

    if (capabilities.size === 0) {
        capabilities.add('agent-context');
    }

    return [...capabilities].sort();
}

export function buildKairosRuntimeExtensions(extensions: InstalledOpenVsxExtension[]): KairosRuntimeExtension[] {
    return extensions.map((extension) => ({
        id: extension.id,
        namespace: extension.namespace,
        name: extension.name,
        displayName: extension.displayName,
        description: extension.description,
        version: extension.version,
        source: 'open-vsx',
        runtime: 'kairos',
        enabled: true,
        capabilities: inferCapabilities(extension),
    }));
}

export function buildCapabilityIndex(extensions: KairosRuntimeExtension[]): Record<string, string[]> {
    const index = new Map<string, string[]>();

    for (const extension of extensions) {
        for (const capability of extension.capabilities) {
            if (!index.has(capability)) {
                index.set(capability, []);
            }
            index.get(capability)!.push(extension.id);
        }
    }

    return Object.fromEntries(
        [...index.entries()].map(([capability, ids]) => [capability, [...new Set(ids)].sort()]),
    );
}
