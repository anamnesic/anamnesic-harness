export const runtime = 'nodejs';

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { err, ok } from '@/app/api/_lib/response';
import { safePath } from '@/src/utils/safe-path';

const MAX_DOC_FILES = 1000;

type DocsPayload = {
  exists: boolean;
  files: string[];
  selectedFile: string | null;
  content: string;
};

async function getProjectLocalPath(projectId: string): Promise<string | null> {
  const db = await getDb();
  const { ProjectService } = await import('@/src/core/services/ProjectService');
  const service = new ProjectService(db);
  const project = await service.get(projectId);
  if (!project) return null;
  return (project as { metadata?: { localPath?: string } | null }).metadata?.localPath ?? null;
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const result: string[] = [];

  async function walk(currentDir: string, relativeBase = ''): Promise<void> {
    if (result.length >= MAX_DOC_FILES) return;

    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (result.length >= MAX_DOC_FILES) break;
      const nextRelative = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath, nextRelative);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!/\.mdx?$/i.test(entry.name)) continue;
      result.push(nextRelative.replace(/\\/g, '/'));
    }
  }

  await walk(root);
  result.sort((a, b) => a.localeCompare(b));
  return result;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const localPath = await getProjectLocalPath(projectId);
    if (localPath === null) return err('NOT_FOUND', 'Project not found', 404);
    if (!localPath) return err('NO_LOCAL_PATH', 'Project does not have a localPath configured', 400);

    const docsRoot = path.join(localPath, 'docs');
    const stat = await fs.stat(docsRoot).catch(() => null);

    if (!stat || !stat.isDirectory()) {
      const payload: DocsPayload = {
        exists: false,
        files: [],
        selectedFile: null,
        content: '',
      };
      return ok(payload);
    }

    const files = await listMarkdownFiles(docsRoot);
    if (!files.length) {
      const payload: DocsPayload = {
        exists: true,
        files: [],
        selectedFile: null,
        content: '',
      };
      return ok(payload);
    }

    const queryFile = req.nextUrl.searchParams.get('file');
    const selectedFile = queryFile && files.includes(queryFile) ? queryFile : files[0];

    const targetPath = safePath(docsRoot, selectedFile);
    const content = await fs.readFile(targetPath, 'utf-8').catch(() => '');

    const payload: DocsPayload = {
      exists: true,
      files,
      selectedFile,
      content,
    };

    return ok(payload);
  } catch {
    return err('INTERNAL_ERROR', 'Failed to load docs', 500);
  }
}
