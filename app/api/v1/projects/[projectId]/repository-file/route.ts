export const runtime = 'nodejs';

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { err, ok } from '@/app/api/_lib/response';
import { safePath } from '@/src/utils/safe-path';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

async function getProjectLocalPath(projectId: string): Promise<string | null> {
  const db = await getDb();
  const { ProjectService } = await import('@/src/core/services/ProjectService');
  const service = new ProjectService(db);
  const project = await service.get(projectId);
  if (!project) return null;
  return (project as { metadata?: { localPath?: string } | null }).metadata?.localPath ?? null;
}

function normalizeFileParam(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\\/g, '/');
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const localPath = await getProjectLocalPath(projectId);
    if (localPath === null) return err('NOT_FOUND', 'Project not found', 404);
    if (!localPath) return err('NO_LOCAL_PATH', 'Project does not have a localPath configured', 400);

    const file = normalizeFileParam(req.nextUrl.searchParams.get('file'));
    if (!file) return err('VALIDATION_ERROR', 'Query param "file" is required', 400);

    const targetPath = safePath(localPath, file);
    const stat = await fs.stat(targetPath).catch(() => null);
    if (!stat || !stat.isFile()) return err('NOT_FOUND', 'File not found', 404);
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      return err('FILE_TOO_LARGE', `File exceeds ${MAX_FILE_SIZE_BYTES} bytes`, 400);
    }

    const content = await fs.readFile(targetPath, 'utf-8').catch(() => '');
    return ok({ selectedFile: file, content, size: stat.size });
  } catch {
    return err('INTERNAL_ERROR', 'Failed to load repository file', 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const localPath = await getProjectLocalPath(projectId);
    if (localPath === null) return err('NOT_FOUND', 'Project not found', 404);
    if (!localPath) return err('NO_LOCAL_PATH', 'Project does not have a localPath configured', 400);

    const body = await req.json().catch(() => ({}));
    const file = normalizeFileParam(typeof body?.file === 'string' ? body.file : null);
    const content = typeof body?.content === 'string' ? body.content : null;

    if (!file) return err('VALIDATION_ERROR', 'Field "file" is required', 400);
    if (content === null) return err('VALIDATION_ERROR', 'Field "content" must be a string', 400);

    const targetPath = safePath(localPath, file);
    const stat = await fs.stat(targetPath).catch(() => null);
    if (!stat || !stat.isFile()) return err('NOT_FOUND', 'File not found', 404);

    const nextSize = Buffer.byteLength(content, 'utf8');
    if (nextSize > MAX_FILE_SIZE_BYTES) {
      return err('FILE_TOO_LARGE', `Content exceeds ${MAX_FILE_SIZE_BYTES} bytes`, 400);
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, 'utf-8');
    return ok({ selectedFile: file, size: nextSize, saved: true });
  } catch {
    return err('INTERNAL_ERROR', 'Failed to save repository file', 500);
  }
}
