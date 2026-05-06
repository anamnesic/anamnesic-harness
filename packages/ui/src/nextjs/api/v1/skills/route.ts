export const runtime = 'nodejs';

import fs from 'fs';
import path from 'path';
import { ok, err } from '@/app/api/_lib/response';

function parseFrontmatter(raw: string) {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = raw.slice(4, end);
  const meta: Record<string, unknown> = {};
  let currentList: string[] | null = null;
  for (const line of block.split('\n')) {
    const listItem = line.match(/^  - (.+)$/);
    if (listItem) { currentList?.push(listItem[1].replace(/^["']|["']$/g, '')); continue; }
    const kv = line.match(/^([a-z_]+): ?(.*)$/);
    if (kv) {
      currentList = null;
      const val = kv[2].replace(/^["']|["']$/g, '').trim();
      if (val === '') { currentList = []; meta[kv[1]] = currentList; }
      else meta[kv[1]] = val;
    }
  }
  return meta;
}

export async function GET() {
  try {
    const skillsDir = path.join(process.cwd(), '..', '..', 'data', 'skills', 'kairos');
    if (!fs.existsSync(skillsDir)) return ok([]);
    const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'));
    const skills = files.map(file => {
      const raw = fs.readFileSync(path.join(skillsDir, file), 'utf-8');
      const meta = parseFrontmatter(raw) ?? {};
      return {
        id: meta.id ?? file.replace('.md', ''),
        name: meta.name ?? file.replace('.md', ''),
        version: meta.version ?? '1.0',
        category: meta.category ?? 'general',
        description: meta.description ?? '',
        capabilities: (meta.capabilities as string[]) ?? [],
        use_for: (meta.use_for as string[]) ?? [],
      };
    });
    return ok(skills);
  } catch (e: any) {
    return err('SKILLS_LOAD_FAILED', e?.message ?? 'Failed to load skills', 500);
  }
}
