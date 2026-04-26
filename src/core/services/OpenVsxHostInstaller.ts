import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

export interface HostInstalledExtension {
    id: string;
    version?: string;
}

export interface InstallResult {
    command: string;
    args: string[];
    stdout: string;
    stderr: string;
}

interface ResolvedCommand {
    command: string;
    baseArgs: string[];
}

function normalizeId(value: string): string {
    return value.trim().toLowerCase();
}

function splitCommandLine(input: string): string[] {
    const trimmed = input.trim();
    if (!trimmed) {
        return [];
    }

    const parts = trimmed.match(/(?:"[^"]*"|'[^']*'|\S+)/g) ?? [];
    return parts.map((part) => part.replace(/^['"]|['"]$/g, ''));
}

function commandExists(command: string): boolean {
    if (!command) {
        return false;
    }

    const maybePathLike = /[\\/]/.test(command) || /\.[a-zA-Z0-9]+$/.test(command);
    if (maybePathLike && existsSync(command)) {
        return true;
    }

    const checker = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(checker, [command], { stdio: 'ignore' });
    return result.status === 0;
}

function windowsCliCandidates(): string[] {
    const localAppData = process.env.LOCALAPPDATA ?? '';
    const programFiles = process.env.ProgramFiles ?? '';
    const programFilesX86 = process.env['ProgramFiles(x86)'] ?? '';

    return [
        resolve(localAppData, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
        resolve(localAppData, 'Programs', 'VSCodium', 'bin', 'codium.cmd'),
        resolve(programFiles, 'Microsoft VS Code', 'bin', 'code.cmd'),
        resolve(programFilesX86, 'Microsoft VS Code', 'bin', 'code.cmd'),
        resolve(programFiles, 'VSCodium', 'bin', 'codium.cmd'),
        resolve(programFilesX86, 'VSCodium', 'bin', 'codium.cmd'),
    ].filter((item) => item.trim().length > 0);
}

function parseListLine(line: string): HostInstalledExtension | null {
    const clean = line.trim();
    if (!clean) {
        return null;
    }

    const atIndex = clean.lastIndexOf('@');
    if (atIndex <= 0) {
        return { id: normalizeId(clean) };
    }

    return {
        id: normalizeId(clean.slice(0, atIndex)),
        version: clean.slice(atIndex + 1).trim() || undefined,
    };
}

export class OpenVsxHostInstaller {
    private static instance: OpenVsxHostInstaller;

    static getInstance(): OpenVsxHostInstaller {
        if (!OpenVsxHostInstaller.instance) {
            OpenVsxHostInstaller.instance = new OpenVsxHostInstaller();
        }
        return OpenVsxHostInstaller.instance;
    }

    private resolveCommand(): ResolvedCommand {
        const custom = process.env.OPEN_VSX_INSTALL_COMMAND?.trim();
        if (custom) {
            const [command, ...baseArgs] = splitCommandLine(custom);
            if (!command || !commandExists(command)) {
                throw new Error(`Configured OPEN_VSX_INSTALL_COMMAND not found: ${custom}`);
            }
            return { command, baseArgs };
        }

        const candidates = ['code', 'code-insiders', 'codium', 'code-oss', 'openvscode-server'];
        for (const candidate of candidates) {
            if (commandExists(candidate)) {
                return { command: candidate, baseArgs: [] };
            }
        }

        if (process.platform === 'win32') {
            for (const candidate of windowsCliCandidates()) {
                if (commandExists(candidate)) {
                    return { command: candidate, baseArgs: [] };
                }
            }
        }

        throw new Error('No compatible editor CLI found. Set OPEN_VSX_INSTALL_COMMAND, e.g. "code".');
    }

    private runCommand(args: string[]): InstallResult {
        const resolved = this.resolveCommand();
        const finalArgs = [...resolved.baseArgs, ...args];
        const execution = spawnSync(resolved.command, finalArgs, {
            encoding: 'utf-8',
            timeout: 180_000,
            shell: process.platform === 'win32' && /\.(cmd|bat)$/i.test(resolved.command),
        });

        const stdout = execution.stdout ?? '';
        const stderr = execution.stderr ?? '';
        if (execution.status !== 0) {
            throw new Error(`Host CLI command failed (${resolved.command} ${finalArgs.join(' ')}): ${stderr || stdout || 'unknown error'}`);
        }

        return {
            command: resolved.command,
            args: finalArgs,
            stdout,
            stderr,
        };
    }

    async downloadVsix(downloadUrl: string, fileBaseName: string): Promise<string> {
        if (!downloadUrl) {
            throw new Error('Missing VSIX download URL');
        }

        const safeBaseName = fileBaseName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const dir = resolve(tmpdir(), 'kairos-open-vsx');
        await mkdir(dir, { recursive: true });

        const filePath = resolve(dir, `${safeBaseName}.vsix`);
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Failed to download VSIX (${response.status})`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        await writeFile(filePath, buffer);
        return filePath;
    }

    installVsix(vsixPath: string): InstallResult {
        return this.runCommand(['--install-extension', vsixPath, '--force']);
    }

    uninstallExtension(extensionId: string): InstallResult {
        return this.runCommand(['--uninstall-extension', extensionId]);
    }

    listInstalledExtensions(): HostInstalledExtension[] {
        const result = this.runCommand(['--list-extensions', '--show-versions']);
        return result.stdout
            .split(/\r?\n/)
            .map(parseListLine)
            .filter((entry): entry is HostInstalledExtension => Boolean(entry));
    }

    getStatus(): { available: boolean; command?: string; reason?: string } {
        try {
            const resolved = this.resolveCommand();
            return { available: true, command: resolved.command };
        } catch (e: any) {
            return { available: false, reason: e?.message ?? 'Host installer unavailable' };
        }
    }
}
