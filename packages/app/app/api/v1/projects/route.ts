export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';
import { getWorkspaceId } from '@/app/api/_lib/workspace';

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizePath(value: string) {
    return value.replace(/\\/g, '/').replace(/\/+$|\/+$/g, '').toLowerCase();
}

export async function GET(req: NextRequest) {
    try {
        const db = await getDb();
        const { ProjectService } = await import('@/src/core/services/ProjectService');
        const projectService = new ProjectService(db);
        const workspaceIdFromHeader = req.headers.get('x-workspace-id');
        const workspaceIdFromQuery = new URL(req.url).searchParams.get('workspaceId');
        const workspaceId = workspaceIdFromHeader || workspaceIdFromQuery;

        const projects = workspaceId
            ? await projectService.listByWorkspace(workspaceId)
            : await projectService.list();
        return ok(projects);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list projects', 500);
    }
}

async function hasGitRepository(dirPath: string): Promise<boolean> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    try {
        const gitPath = path.join(dirPath, '.git');
        await fs.stat(gitPath);
        return true;
    } catch {
        return false;
    }
}

async function findGitSubfolders(dirPath: string): Promise<string[]> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const results: string[] = [];

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const subPath = path.join(dirPath, entry.name);
                if (await hasGitRepository(subPath)) {
                    results.push(entry.name);
                }
            }
        }
    } catch {
        // Ignore errors
    }

    return results;
}

export async function POST(req: NextRequest) {
    try {
        const workspaceId = getWorkspaceId(req);
        const normalizedWorkspaceId = isUuid(workspaceId) ? workspaceId : null;
        const body = await req.json();
        if (!body.name) return err('VALIDATION_ERROR', 'name is required', 400);

        // Accept localPath from both top-level and nested in metadata
        const localPath: string | undefined =
            (typeof body.localPath === 'string' && body.localPath.trim())
                ? body.localPath.trim()
                : (typeof body.metadata?.localPath === 'string' && body.metadata.localPath.trim())
                ? body.metadata.localPath.trim()
                : undefined;

        // Validate the path exists and is a directory before creating the project
        let gitSubfolders: string[] = [];
        if (localPath) {
            const fs = await import('node:fs/promises');
            try {
                const stat = await fs.stat(localPath);
                if (!stat.isDirectory()) {
                    return err('VALIDATION_ERROR', 'localPath must be a directory', 400);
                }
            } catch {
                return err('VALIDATION_ERROR', `localPath does not exist: ${localPath}`, 400);
            }

            // Check if folder has git (informational only, not a rejection)
            const hasGit = await hasGitRepository(localPath);
            if (!hasGit) {
                gitSubfolders = await findGitSubfolders(localPath);
            }
        }

        const db = await getDb();
        const { ProjectService } = await import('@/src/core/services/ProjectService');
        const service = new ProjectService(db);

        if (localPath) {
            const targetPath = normalizePath(localPath);
            const candidates = normalizedWorkspaceId
                ? await service.listByWorkspace(normalizedWorkspaceId)
                : await service.list();

            const duplicate = candidates.find((project) => {
                const existingPath = project.metadata?.localPath;
                return typeof existingPath === 'string' && normalizePath(existingPath) === targetPath;
            });

            if (duplicate) {
                return ok(duplicate, 200);
            }
        }

        const project = await service.create({
            name: body.name,
            description: body.description ?? null,
        });

        // Keep project bound to the currently selected workspace.
        const { Project } = await import('@/src/core/entities/Project');
        const repo = db.getRepository(Project);
        const existing = await repo.findOne({ where: { id: project.id } });
        if (existing) {
            existing.workspaceId = normalizedWorkspaceId;

            if (localPath) {
                existing.metadata = { ...(existing.metadata || {}), localPath };
            }

            await repo.save(existing);

            // Return gitSubfolders as informational data when no .git found
            if (gitSubfolders.length > 0) {
                const result = { ...existing, gitSubfolders };
                return ok(result, 201);
            }

            return ok(existing, 201);
        }

        return ok(project, 201);
    } catch (e) {
        if (e instanceof Error) return err('PROJECT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to create project', 500);
    }
}
