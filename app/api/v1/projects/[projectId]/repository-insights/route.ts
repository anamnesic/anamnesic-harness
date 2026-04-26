export const runtime = 'nodejs';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { err, ok } from '@/app/api/_lib/response';

const execFileAsync = promisify(execFile);
const MAX_FILES = 250;
const MAX_COMMITS = 30;

type GitChange = {
    path: string;
    status: string;
    staged: boolean;
};

type RepositoryInsights = {
    branch: string;
    files: string[];
    changes: GitChange[];
    graphLines: string[];
    isGitRepo: boolean;
};

async function runGit(cwd: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', args, {
        cwd,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
    });
    return stdout.trim();
}

function parsePorcelain(output: string): GitChange[] {
    if (!output) return [];

    return output
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter(Boolean)
        .map((line) => {
            const xy = line.slice(0, 2);
            const rawPath = line.slice(3).trim();
            const path = rawPath.includes(' -> ') ? rawPath.split(' -> ').pop() ?? rawPath : rawPath;
            const staged = xy[0] !== ' ' && xy[0] !== '?';
            return {
                path,
                status: xy,
                staged,
            };
        });
}

async function getProjectLocalPath(projectId: string): Promise<string | null> {
    const db = await getDb();
    const { ProjectService } = await import('@/src/core/services/ProjectService');
    const service = new ProjectService(db);
    const project = await service.get(projectId);
    if (!project) return null;
    return (project as { metadata?: { localPath?: string } | null }).metadata?.localPath ?? null;
}

async function collectInsights(localPath: string): Promise<RepositoryInsights> {
    const [branch, tracked, untracked, porcelain, graph] = await Promise.all([
        runGit(localPath, ['rev-parse', '--abbrev-ref', 'HEAD']),
        runGit(localPath, ['ls-files']),
        runGit(localPath, ['ls-files', '--others', '--exclude-standard']),
        runGit(localPath, ['status', '--porcelain=v1']),
        runGit(localPath, [
            'log',
            '--graph',
            '--date=short',
            `-n${MAX_COMMITS}`,
            '--pretty=format:%h %ad %s',
        ]),
    ]);

    const allFiles = Array.from(
        new Set([
            ...tracked.split(/\r?\n/).filter(Boolean),
            ...untracked.split(/\r?\n/).filter(Boolean),
        ]),
    ).slice(0, MAX_FILES);

    return {
        branch,
        files: allFiles,
        changes: parsePorcelain(porcelain),
        graphLines: graph ? graph.split(/\r?\n/).filter(Boolean) : [],
        isGitRepo: true,
    };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
    try {
        const { projectId } = await params;
        const localPath = await getProjectLocalPath(projectId);
        if (localPath === null) return err('NOT_FOUND', 'Project not found', 404);
        if (!localPath) {
            return err('NO_LOCAL_PATH', 'Project does not have a localPath configured', 400);
        }

        try {
            return ok(await collectInsights(localPath));
        } catch {
            return ok({
                branch: '',
                files: [],
                changes: [],
                graphLines: [],
                isGitRepo: false,
            });
        }
    } catch {
        return err('INTERNAL_ERROR', 'Failed to get repository insights', 500);
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
    try {
        const { projectId } = await params;
        const localPath = await getProjectLocalPath(projectId);
        if (localPath === null) return err('NOT_FOUND', 'Project not found', 404);
        if (!localPath) {
            return err('NO_LOCAL_PATH', 'Project does not have a localPath configured', 400);
        }

        const body = await req.json().catch(() => ({}));
        const action = typeof body?.action === 'string' ? body.action : '';
        const message = typeof body?.message === 'string' ? body.message.trim() : '';

        if (!['stage-all', 'commit'].includes(action)) {
            return err('INVALID_ACTION', 'Unsupported git action', 400);
        }

        try {
            if (action === 'stage-all') {
                await runGit(localPath, ['add', '-A']);
            }

            if (action === 'commit') {
                if (!message) return err('COMMIT_MESSAGE_REQUIRED', 'Commit message is required', 400);
                await runGit(localPath, ['commit', '-m', message]);
            }

            return ok(await collectInsights(localPath));
        } catch (error) {
            const raw = error instanceof Error ? error.message : 'Git command failed';
            const messageText = raw.replace(/\s+/g, ' ').slice(0, 500);
            return err('GIT_ACTION_FAILED', messageText || 'Git action failed', 400);
        }
    } catch {
        return err('INTERNAL_ERROR', 'Failed to execute git action', 500);
    }
}
