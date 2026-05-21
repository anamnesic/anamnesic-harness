import path from 'path';
import { vaultRead, vaultReaddir } from '@kairos/vault';

export interface ExternalSkillDefinition {
    provider: string;
    filePath: string;
    key: string;
    title: string;
    description: string;
    capabilities: string[];
    use_for: string[];
    category: string;
    prompt: string;
}

interface SkillFrontmatter {
    id: string;
    name: string;
    version?: string;
    category: string;
    capabilities?: string[];
    description?: string;
    use_for?: string[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { loadedAt: number; items: ExternalSkillDefinition[] } | null = null;

function parseFrontmatter(raw: string): { meta: SkillFrontmatter; body: string } | null {
    if (!raw.startsWith('---')) return null;
    const end = raw.indexOf('\n---', 3);
    if (end === -1) return null;
    const yamlBlock = raw.slice(4, end);
    const body = raw.slice(end + 4).trim();

    const meta: Record<string, unknown> = {};
    let currentKey = '';
    let currentList: string[] | null = null;

    for (const line of yamlBlock.split('\n')) {
        const listItem = line.match(/^  - (.+)$/);
        if (listItem) {
            currentList?.push(listItem[1].replace(/^"|"$/g, '').replace(/^'|'$/g, ''));
            continue;
        }
        const kv = line.match(/^([a-z_]+): ?(.*)$/);
        if (kv) {
            currentList = null;
            const [, k, v] = kv;
            const val = v.replace(/^"|"$/g, '').trim();
            if (val === '') {
                currentList = [];
                meta[k] = currentList;
            } else {
                meta[k] = val;
            }
            currentKey = k;
        }
    }

    if (!meta['id'] || !meta['name'] || !meta['category']) return null;
    return { meta: meta as unknown as SkillFrontmatter, body };
}

export async function loadExternalSkillsFromData(force = false): Promise<ExternalSkillDefinition[]> {
    if (!force && cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
        return cache.items;
    }

    let files: string[] = [];
    try {
        files = await vaultReaddir('skills/kairos');
    } catch {
        cache = { loadedAt: Date.now(), items: [] };
        return [];
    }

    const skills: ExternalSkillDefinition[] = [];

    for (const relFile of files.filter(f => f.endsWith('.md'))) {
        const vaultRelPath = `skills/kairos/${relFile}`;
        let raw = '';
        try {
            raw = await vaultRead(vaultRelPath);
        } catch {
            continue;
        }

        const parsed = parseFrontmatter(raw);
        if (!parsed || !parsed.body.trim()) continue;

        const { meta, body } = parsed;
        skills.push({
            provider: meta.name,
            filePath: vaultRelPath,
            key: meta.id,
            title: meta.name,
            description: meta.description ?? '',
            capabilities: meta.capabilities ?? [],
            use_for: meta.use_for ?? [],
            category: meta.category,
            prompt: body,
        });
    }

    cache = { loadedAt: Date.now(), items: skills };
    return skills;
}


