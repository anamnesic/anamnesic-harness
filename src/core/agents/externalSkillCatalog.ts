import { promises as fs } from 'fs';
import path from 'path';

export interface ExternalSkillDefinition {
  provider: string;
  filePath: string;
  key: string;
  title: string;
  description: string;
  prompt: string;
}

const SKILLS_ROOT = path.join(process.cwd(), 'data', 'skills');
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache: { loadedAt: number; items: ExternalSkillDefinition[] } | null = null;

function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function toTitle(value: string): string {
  const cleaned = value
    .replace(/[_-]+/g, ' ')
    .replace(/\.[^/.]+$/, '')
    .trim();

  if (!cleaned) return value;

  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function getProviderDirectories(): Promise<string[]> {
  const entries = await fs.readdir(SKILLS_ROOT, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function getFilesRecursively(rootDir: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        out.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return out;
}

export async function loadExternalSkillsFromData(force = false): Promise<ExternalSkillDefinition[]> {
  if (!force && cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.items;
  }

  let providers: string[] = [];
  try {
    providers = await getProviderDirectories();
  } catch {
    cache = { loadedAt: Date.now(), items: [] };
    return [];
  }

  const skills: ExternalSkillDefinition[] = [];

  for (const providerName of providers) {
    const providerDir = path.join(SKILLS_ROOT, providerName);
    const files = await getFilesRecursively(providerDir);

    for (const filePath of files) {
      let prompt = '';
      try {
        prompt = (await fs.readFile(filePath, 'utf8')).trim();
      } catch {
        continue;
      }

      if (!prompt) continue;

      const relativePath = path.relative(providerDir, filePath).replace(/\\/g, '/');
      const fileName = path.basename(filePath);
      const fileSlug = toSlug(relativePath.replace(/\.[^/.]+$/, ''));
      const providerSlug = toSlug(providerName);
      const key = `${providerSlug}-${fileSlug}`;

      skills.push({
        provider: providerName,
        filePath,
        key,
        title: toTitle(fileName),
        description: `Skill importada automaticamente de data/skills/${providerName}/${relativePath}`,
        prompt,
      });
    }
  }

  cache = { loadedAt: Date.now(), items: skills };
  return skills;
}
