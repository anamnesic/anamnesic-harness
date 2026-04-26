export const runtime = 'nodejs';

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { AVAILABLE_MODELS } from '@/src/config/models';
import { readProviderKeyStatuses } from '@/app/api/_lib/project-env-keys';

type CliName = 'copilot' | 'gemini' | 'claude-code' | 'codex' | 'ollama';
type ProviderName = 'claude' | 'chatgpt' | 'gemini';

function findCommandInCommonPaths(command: string): string | null {
    const isWindows = process.platform === 'win32';
    const ext = isWindows ? '.exe' : '';
    const home = homedir();

    // Common installation paths
    const commonPaths = [
        // npm global
        isWindows
            ? resolve(home, 'AppData', 'Roaming', 'npm', `${command}${ext}`)
            : resolve(home, '.npm-global', 'bin', command),
        // cargo/rust
        isWindows
            ? resolve(home, '.cargo', 'bin', `${command}${ext}`)
            : resolve(home, '.cargo', 'bin', command),
        // Local node_modules
        resolve(process.cwd(), 'node_modules', '.bin', command),
        // System paths on macOS/Linux
        !isWindows ? `/usr/local/bin/${command}` : null,
        !isWindows ? `/usr/bin/${command}` : null,
        // Windows Program Files
        isWindows ? resolve('C:', 'Program Files', command, `${command}${ext}`) : null,
        isWindows ? resolve('C:', 'Program Files (x86)', command, `${command}${ext}`) : null,
    ].filter(Boolean) as string[];

    for (const path of commonPaths) {
        if (existsSync(path)) {
            return path;
        }
    }

    return null;
}

function commandExists(command: string): boolean {
    // First try system PATH
    const checker = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(checker, [command], { stdio: 'ignore' });
    if (result.status === 0) {
        return true;
    }

    // Try common installation paths
    return findCommandInCommonPaths(command) !== null;
}

function commandWorks(command: string, args: string[]): boolean {
    try {
        const result = spawnSync(command, args, {
            stdio: 'pipe',
            timeout: 5000,
            encoding: 'utf-8',
        });
        return result.status === 0 || result.status === null; // status === null means timed out (but command ran)
    } catch (e) {
        // If direct command fails, try finding it in common paths
        const fullPath = findCommandInCommonPaths(command);
        if (fullPath) {
            try {
                const result = spawnSync(fullPath, args, {
                    stdio: 'pipe',
                    timeout: 5000,
                    encoding: 'utf-8',
                });
                return result.status === 0 || result.status === null;
            } catch {
                return false;
            }
        }
        return false;
    }
}

function ghCopilotWorks(): boolean {
    try {
        if (!commandExists('gh') && !commandExists('github-cli')) {
            return false;
        }

        const ghCmd = commandExists('gh') ? 'gh' : 'github-cli';

        // Check if extension exists
        const result = spawnSync(ghCmd, ['extension', 'list'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 5000,
        });

        if (result.status !== 0) {
            return false;
        }

        const output = typeof result.stdout === 'string' ? result.stdout.toLowerCase() : '';
        const hasExtension = output.includes('gh-copilot') || output.includes('github/gh-copilot') || output.includes('copilot');

        if (!hasExtension) {
            return false;
        }

        // Test if copilot command works
        return commandWorks(ghCmd, ['copilot', '--help']);
    } catch (e) {
        return false;
    }
}

async function isOllamaRunning(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const response = await fetch('http://localhost:11434/api/tags', {
            signal: controller.signal,
            timeout: 2000,
        });

        clearTimeout(timeout);
        return response.ok;
    } catch {
        return false;
    }
}

function detectCliAvailability(): Record<CliName, boolean> {
    const hasCopilotBinary = commandExists('copilot') && commandWorks('copilot', ['--version']);
    const hasGemini = (commandExists('gemini') || commandExists('gemini-cli')) &&
        (commandWorks('gemini', ['--version']) || commandWorks('gemini-cli', ['--version']));
    const hasClaudeCode = (
        (commandExists('claude-code') && commandWorks('claude-code', ['--version']))
        || (commandExists('claude') && commandWorks('claude', ['--version']))
        || (commandExists('claude-ai') && commandWorks('claude-ai', ['--version']))
    );
    const hasCodex = commandExists('codex') && commandWorks('codex', ['--version']);

    return {
        copilot: hasCopilotBinary || ghCopilotWorks(),
        gemini: hasGemini,
        'claude-code': hasClaudeCode,
        codex: hasCodex,
        ollama: false, // Will be set async
    };
}

function hasProviderKey(provider: ProviderName, keys: Partial<Record<ProviderName, boolean>>): boolean {
    return Boolean(keys[provider]);
}

function isModelAvailable(
    modelId: string,
    cli: Record<CliName, boolean>,
    keys: Partial<Record<ProviderName, boolean>>,
): boolean {
    const id = modelId.toLowerCase();

    if (id.includes('claude')) {
        return cli['claude-code'] && hasProviderKey('claude', keys);
    }

    if (id.includes('gemini')) {
        return cli.gemini && hasProviderKey('gemini', keys);
    }

    if (id.includes('codex')) {
        return cli.codex && hasProviderKey('chatgpt', keys);
    }

    if (id.includes('gpt')) {
        // Copilot can provide GPT families without local OpenAI key.
        if (cli.copilot) {
            return true;
        }

        return cli.codex && hasProviderKey('chatgpt', keys);
    }

    if (id.includes('grok') || id.includes('raptor')) {
        return cli.copilot;
    }

    // Ollama models
    if (id.includes('ollama') || id.includes('mistral') || id.includes('llama') || id.includes('neural')) {
        return cli.ollama;
    }

    if (id === 'auto') {
        return (
            cli.copilot
            || (cli.codex && hasProviderKey('chatgpt', keys))
            || (cli.gemini && hasProviderKey('gemini', keys))
            || (cli['claude-code'] && hasProviderKey('claude', keys))
            || cli.ollama
        );
    }

    return false;
}

export async function GET(req: NextRequest) {
    try {
        let cli = detectCliAvailability();

        // Check if Ollama is running
        const ollamaRunning = await isOllamaRunning();
        cli.ollama = ollamaRunning;

        const projectId = req.headers.get('x-project-id') || req.headers.get('X-Project-Id') || '';
        let providerKeys: Partial<Record<ProviderName, boolean>> = {};

        if (projectId) {
            try {
                const status = await readProviderKeyStatuses(projectId);
                providerKeys = status.keys.reduce<Partial<Record<ProviderName, boolean>>>((acc, item) => {
                    acc[item.provider] = item.isConfigured;
                    return acc;
                }, {});
            } catch {
                // Keep keys empty when project context is unavailable.
                providerKeys = {};
            }
        }

        const models: Record<string, boolean> = {};

        for (const model of AVAILABLE_MODELS) {
            models[model.id] = isModelAvailable(model.id, cli, providerKeys);
        }

        const availableCli = (Object.entries(cli)
            .filter(([, present]) => present)
            .map(([name]) => name)) as CliName[];

        return ok({
            cli,
            availableCli,
            providerKeys,
            models,
        });
    } catch (e) {
        if (e instanceof Error) {
            return err('AI_AVAILABILITY_ERROR', e.message, 500);
        }
        return err('INTERNAL_ERROR', 'Failed to detect AI availability', 500);
    }
}
