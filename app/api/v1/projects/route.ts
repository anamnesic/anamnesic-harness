export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';
import { getWorkspaceId } from '@/app/api/_lib/workspace';

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
        const body = await req.json();
        if (!body.name) return err('VALIDATION_ERROR', 'name is required', 400);

        const localPath: string | undefined = typeof body.localPath === 'string' && body.localPath.trim()
            ? body.localPath.trim()
            : undefined;

        // Validate the path exists and is a directory before creating the project
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

            // Check if folder has git
            const hasGit = await hasGitRepository(localPath);
            if (!hasGit) {
                // Check if there are git subfolders
                const gitSubfolders = await findGitSubfolders(localPath);
                if (gitSubfolders.length > 0) {
                    return err('NO_GIT_REPO', `This folder has no git repository. Found ${gitSubfolders.length} git repositor${gitSubfolders.length === 1 ? 'y' : 'ies'} in subfolders. Consider opening this as a Workspace instead.`, 400, { gitSubfolders });
                }
                return err('NO_GIT_REPO', 'This folder does not have a git repository', 400);
            }
        }

        const db = await getDb();
        const { ProjectService } = await import('@/src/core/services/ProjectService');
        const service = new ProjectService(db);
        const project = await service.create({
            name: body.name,
            description: body.description ?? null,
        });

        // Keep project bound to the currently selected workspace.
        const { Project } = await import('@/src/core/entities/Project');
        const repo = db.getRepository(Project);
        const existing = await repo.findOne({ where: { id: project.id } });
        if (existing) {
            existing.workspaceId = workspaceId;

            if (localPath) {
                existing.metadata = { ...(existing.metadata || {}), localPath };
            }

            await repo.save(existing);
            return ok(existing, 201);
        }

        return ok(project, 201);
    } catch (e) {
        if (e instanceof Error) return err('PROJECT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to create project', 500);
    }
}
