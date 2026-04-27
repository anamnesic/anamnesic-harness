export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const os = await import('node:os');

        const url = new URL(req.url);
        const requested = url.searchParams.get('path');
        const showHidden = url.searchParams.get('showHidden') === 'true';

        const home = os.homedir();
        const documentsPathCandidates = ['Documents', 'Documentos', 'Docs'];
        let documentsPath = path.join(home, 'Documents');
        for (const candidate of documentsPathCandidates) {
            const candidatePath = path.join(home, candidate);
            try {
                const stat = await fs.stat(candidatePath);
                if (stat.isDirectory()) {
                    documentsPath = candidatePath;
                    break;
                }
            } catch { /* not found */ }
        }
        const githubPath = path.join(documentsPath, 'GitHub');

        let defaultPath = documentsPath;
        try {
            const docStat = await fs.stat(documentsPath);
            if (!docStat.isDirectory()) {
                defaultPath = home;
            }
        } catch {
            defaultPath = home;
        }
        try {
            const githubStat = await fs.stat(githubPath);
            if (githubStat.isDirectory()) {
                defaultPath = githubPath;
            }
        } catch {
            /* GitHub folder doesn't exist */
        }

        const targetPath = requested && requested.trim() ? path.resolve(requested) : defaultPath;

        let stat;
        try {
            stat = await fs.stat(targetPath);
        } catch {
            return err('PATH_NOT_FOUND', `Path does not exist: ${targetPath}`, 404);
        }
        if (!stat.isDirectory()) {
            return err('NOT_A_DIRECTORY', `Path is not a directory: ${targetPath}`, 400);
        }

        let entries: import('node:fs').Dirent[];
        try {
            entries = await fs.readdir(targetPath, { withFileTypes: true });
        } catch (e: any) {
            return err('READ_ERROR', e?.message ?? 'Failed to read directory', 403);
        }

        const directories = await Promise.all(
            entries
                .filter(e => e.isDirectory())
                .filter(e => showHidden || !e.name.startsWith('.'))
                .map(async e => {
                    const fullPath = path.join(targetPath, e.name);
                    let isGitRepo = false;
                    try {
                        const gitStat = await fs.stat(path.join(fullPath, '.git'));
                        isGitRepo = gitStat.isDirectory() || gitStat.isFile();
                    } catch { /* not a git repo */ }
                    return { name: e.name, path: fullPath, isGitRepo };
                }),
        );

        directories.sort((a, b) => {
            if (a.isGitRepo !== b.isGitRepo) return a.isGitRepo ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        const parent = path.dirname(targetPath);
        const isAtRoot = parent === targetPath;

        const shortcutCandidates = [
            { name: 'Home', path: home },
            { name: 'Documents', path: documentsPath },
            { name: 'Desktop', path: path.join(home, 'Desktop') },
            { name: 'GitHub', path: path.join(documentsPath, 'GitHub') },
        ];

        const shortcuts = await Promise.all(
            shortcutCandidates.map(async (shortcut) => {
                try {
                    const stat = await fs.stat(shortcut.path);
                    return stat.isDirectory() ? shortcut : null;
                } catch { return null; }
            })
        ).then(results => results.filter(Boolean) as { name: string; path: string }[]);

        return ok({
            currentPath: targetPath,
            parent: isAtRoot ? null : parent,
            directories,
            shortcuts,
        });
    } catch (e: any) {
        return err('INTERNAL_ERROR', e?.message ?? 'Failed to browse', 500);
    }
}
