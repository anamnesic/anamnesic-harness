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
        const targetPath = requested && requested.trim() ? path.resolve(requested) : home;

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

        const shortcuts = [
            { name: 'Home', path: home },
            { name: 'Documents', path: path.join(home, 'Documents') },
            { name: 'Desktop', path: path.join(home, 'Desktop') },
            { name: 'GitHub', path: path.join(home, 'Documents', 'GitHub') },
        ];

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
