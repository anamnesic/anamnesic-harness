// System-wide snapshot manifest store.
//
// NOTE: The existing `SnapshotService` (src/core/services/SnapshotService.ts)
// is scoped to pipeline+phase pairs and is consumed by SafetyNetIntegration.
// It does not expose a generic list/create/delete-by-id surface.
//
// To satisfy the system-level "snapshots" UX (point-in-time named snapshots
// with restore), we persist lightweight JSON manifests under
// ~/.Kairos/snapshots/_system/<id>.json. This sits alongside the per-pipeline
// snapshot tree without interfering with it.

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const SNAPSHOTS_BASE = path.join(
    /*turbopackIgnore: true*/ process.env.HOME || process.env.USERPROFILE || '~',
    '.Kairos',
    'snapshots',
    '_system',
);

export interface SystemSnapshot {
    id: string;
    name: string;
    description: string;
    scope: string;
    createdAt: string;
    fileCount?: number;
    totalSize?: number;
    workspaceRoot?: string;
    files?: SnapshotFile[];
}

export interface SnapshotFile {
    path: string;
    hash: string;
    size: number;
    modified: string;
}

async function ensureDir() {
    await /*turbopackIgnore: true*/ fs.mkdir(SNAPSHOTS_BASE, { recursive: true });
}

function manifestPath(id: string) {
    return /*turbopackIgnore: true*/ path.join(SNAPSHOTS_BASE, `${id}.json`);
}

function filesPath(id: string) {
    return /*turbopackIgnore: true*/ path.join(SNAPSHOTS_BASE, id);
}

async function captureFiles(workspaceRoot: string, scope: string): Promise<{ files: SnapshotFile[]; totalSize: number }> {
    const files: SnapshotFile[] = [];
    let totalSize = 0;
    
    // Define file patterns based on scope
    const patterns = scope === 'system' 
        ? ['**/*.{ts,tsx,js,jsx,json,md,yml,yaml,toml,lock}']
        : scope === 'src' 
        ? ['src/**/*.{ts,tsx,js,jsx,json}']
        : ['**/*.{ts,tsx,js,jsx,json}'];
    
    // Exclude patterns
    const excludes = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.vscode', '.idea'];
    
    async function scanDirectory(dir: string, relativePath: string = '') {
        try {
            const entries = await /*turbopackIgnore: true*/ fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const entryPath = /*turbopackIgnore: true*/ path.join(dir, entry.name);
                const entryRelativePath = /*turbopackIgnore: true*/ path.join(relativePath, entry.name);
                
                // Skip excluded directories
                if (entry.isDirectory() && excludes.some(exclude => entry.name.includes(exclude))) {
                    continue;
                }
                
                if (entry.isDirectory()) {
                    await scanDirectory(entryPath, entryRelativePath);
                } else if (entry.isFile()) {
                    // Check if file matches patterns
                    const ext = path.extname(entry.name);
                    const hasMatch = patterns.some(pattern => {
                        const patternExt = path.extname(pattern);
                        return patternExt === '' || patternExt === ext;
                    });
                    
                    if (hasMatch) {
                        try {
                            const stats = await /*turbopackIgnore: true*/ fs.stat(entryPath);
                            const content = await /*turbopackIgnore: true*/ fs.readFile(entryPath);
                            const hash = crypto.createHash('sha256').update(content).digest('hex');
                            
                            files.push({
                                path: entryRelativePath,
                                hash,
                                size: stats.size,
                                modified: stats.mtime.toISOString(),
                            });
                            
                            totalSize += stats.size;
                        } catch (error) {
                            // Skip files that can't be read
                            console.warn(`Skipping file ${entryRelativePath}:`, error);
                        }
                    }
                }
            }
        } catch (error) {
            // Skip directories that can't be read
            console.warn(`Skipping directory ${dir}:`, error);
        }
    }
    
    await scanDirectory(workspaceRoot);
    
    return { files, totalSize };
}

export async function listSnapshots(limit = 50): Promise<SystemSnapshot[]> {
    await ensureDir();
    let entries: string[];
    try {
        entries = await /*turbopackIgnore: true*/ fs.readdir(SNAPSHOTS_BASE);
    } catch {
        return [];
    }
    const items: SystemSnapshot[] = [];
    for (const entry of entries) {
        if (!entry.endsWith('.json')) continue;
        try {
            const raw = await fs.readFile(/*turbopackIgnore: true*/ path.join(SNAPSHOTS_BASE, entry), 'utf-8');
            items.push(JSON.parse(raw) as SystemSnapshot);
        } catch {
            // ignore corrupt entries
        }
    }
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return items.slice(0, limit);
}

export async function getSnapshot(id: string): Promise<SystemSnapshot | null> {
    try {
        const raw = await /*turbopackIgnore: true*/ fs.readFile(manifestPath(id), 'utf-8');
        return JSON.parse(raw) as SystemSnapshot;
    } catch {
        return null;
    }
}

export async function createSnapshot(input: {
    name?: string;
    description?: string;
    scope?: string;
    workspaceRoot?: string;
}): Promise<SystemSnapshot> {
    await ensureDir();
    const id = crypto.randomUUID();
    const workspaceRoot = input.workspaceRoot?.trim() || /*turbopackIgnore: true*/ process.cwd();
    
    // Capture files based on scope
    const { files, totalSize } = await captureFiles(workspaceRoot, input.scope?.trim() || 'system');
    
    const snap: SystemSnapshot = {
        id,
        name: (input.name?.trim() || `snapshot-${Date.now()}`),
        description: input.description?.trim() || '',
        scope: input.scope?.trim() || 'system',
        createdAt: new Date().toISOString(),
        fileCount: files.length,
        totalSize,
        workspaceRoot,
        files,
    };
    
    // Create files directory for this snapshot
    const snapshotFilesDir = filesPath(id);
    await /*turbopackIgnore: true*/ fs.mkdir(snapshotFilesDir, { recursive: true });
    
    // Save file contents
    for (const file of files) {
        try {
            const sourcePath = /*turbopackIgnore: true*/ path.join(workspaceRoot, file.path);
            const targetPath = /*turbopackIgnore: true*/ path.join(snapshotFilesDir, file.path);
            const targetDir = path.dirname(targetPath);
            
            await /*turbopackIgnore: true*/ fs.mkdir(targetDir, { recursive: true });
            await /*turbopackIgnore: true*/ fs.copyFile(sourcePath, targetPath);
        } catch (error) {
            console.warn(`Failed to backup file ${file.path}:`, error);
        }
    }
    
    await /*turbopackIgnore: true*/ fs.writeFile(manifestPath(id), JSON.stringify(snap, null, 2), 'utf-8');
    return snap;
}

export async function deleteSnapshot(id: string): Promise<boolean> {
    try {
        await /*turbopackIgnore: true*/ fs.rm(manifestPath(id), { force: true });
        await /*turbopackIgnore: true*/ fs.rm(filesPath(id), { force: true, recursive: true });
        return true;
    } catch {
        return false;
    }
}

export async function restoreSnapshot(id: string): Promise<{ restored: number; errors: string[] }> {
    const snap = await getSnapshot(id);
    if (!snap) {
        throw new Error('Snapshot not found');
    }
    
    if (!snap.workspaceRoot || !snap.files) {
        throw new Error('Snapshot does not contain restorable data');
    }
    
    const snapshotFilesDir = filesPath(id);
    let restored = 0;
    const errors: string[] = [];
    
    for (const file of snap.files) {
        try {
            const sourcePath = /*turbopackIgnore: true*/ path.join(snapshotFilesDir, file.path);
            const targetPath = /*turbopackIgnore: true*/ path.join(snap.workspaceRoot, file.path);
            const targetDir = path.dirname(targetPath);
            
            // Ensure target directory exists
            await /*turbopackIgnore: true*/ fs.mkdir(targetDir, { recursive: true });
            
            // Check if source file exists
            try {
                await /*turbopackIgnore: true*/ fs.access(sourcePath);
            } catch {
                errors.push(`Source file missing: ${file.path}`);
                continue;
            }
            
            // Restore file
            await /*turbopackIgnore: true*/ fs.copyFile(sourcePath, targetPath);
            restored++;
        } catch (error) {
            errors.push(`Failed to restore ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    return { restored, errors };
}
