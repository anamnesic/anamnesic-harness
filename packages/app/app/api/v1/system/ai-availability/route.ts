export const runtime = 'nodejs';

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { NextRequest } from 'next/server';
import { AVAILABLE_MODELS } from '@/src/config/models';
import { ok, err } from '@/app/api/_lib/response';
import { getDb } from '@/app/api/_lib/db';
import { SettingsService } from '@/src/core/services/SettingsService';
import { readProviderKeyStatuses } from '@/app/api/_lib/project-env-keys';

type CliName = 'copilot' | 'gemini' | 'claude-code' | 'codex' | 'opencode' | 'ollama';
type ProviderName = 'claude' | 'chatgpt' | 'gemini';

// Cache em memória para evitar re-spawns repetidos do copilot
interface CopilotCacheEntry {
    available: boolean;
    expiresAt: number;
}

const copilotAvailabilityCache = new Map<string, CopilotCacheEntry>();
const COPILOT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

function getCopilotCached(command: string, args: string[]): boolean | null {
    const key = `${command}:${args.join(' ')}`;
    const entry = copilotAvailabilityCache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
        return entry.available;
    }
    copilotAvailabilityCache.delete(key);
    return null;
}

function setCopilotCached(command: string, args: string[], available: boolean): void {
    const key = `${command}:${args.join(' ')}`;
    copilotAvailabilityCache.set(key, {
        available,
        expiresAt: Date.now() + COPILOT_CACHE_TTL_MS,
    });
}

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
    const result = spawnSync(checker, [command], {
        stdio: 'ignore',
        windowsHide: true,
        timeout: 3000,
    });
    if (result.status === 0) {
        return true;
    }

    // Try common installation paths
    return findCommandInCommonPaths(command) !== null;
}

function commandWorks(command: string, args: string[]): boolean {
    const isCopilot = command === 'copilot' || (command === 'gh' && args.includes('copilot'));
    if (isCopilot) {
        const cached = getCopilotCached(command, args);
        if (cached !== null) {
            return cached;
        }
    }

    const spawnOpts = {
        stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
        timeout: 3000,
        encoding: 'utf-8' as const,
        windowsHide: true,
    };

    try {
        const result = spawnSync(command, args, spawnOpts);
        // status null means timeout or spawn failure; treat as failure
        if (result.status === 0) {
            if (isCopilot) {
                setCopilotCached(command, args, true);
            }
            return true;
        }

        // Direct command failed, try common installation paths
        const fullPath = findCommandInCommonPaths(command);
        if (fullPath) {
            const fpResult = spawnSync(fullPath, args, spawnOpts);
            if (fpResult.status === 0) {
                if (isCopilot) {
                    setCopilotCached(command, args, true);
                }
                return true;
            }
        }

        // All attempts failed; cache negative result for copilot
        if (isCopilot) {
            setCopilotCached(command, args, false);
        }
        return false;
    } catch {
        if (isCopilot) {
            setCopilotCached(command, args, false);
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
            timeout: 3000,
            windowsHide: true,
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
    const haskairosCode = (
        (commandExists('kairos-code') && commandWorks('kairos-code', ['--version']))
        || (commandExists('kairos') && commandWorks('kairos', ['--version']))
        || (commandExists('kairos-ai') && commandWorks('kairos-ai', ['--version']))
    );
    const hasCodex = commandExists('codex') && commandWorks('codex', ['--version']);

    return {
        copilot: hasCopilotBinary || ghCopilotWorks(),
        gemini: hasGemini,
        'kairos-code': haskairosCode,
        codex: hasCodex,
        ollama: false, // Will be set async
    };
}

function hasProviderKey(provider: ProviderName, keys: Partial<Record<ProviderName, boolean>>): boolean {
    return Boolean(keys[provider]);
}

function isModelAvailable(
    modelId: string,
    provider: string,
    cli: Record<CliName, boolean>,
    keys: Partial<Record<ProviderName, boolean>>,
): boolean {
    const id = modelId.toLowerCase();
    const prov = provider.toLowerCase();

    // Stricter provider-based checking
    switch (prov) {
        case 'kairos':
            return cli['kairos-code'] && hasProviderKey('kairos', keys);
        case 'anthropic':
            return cli['kairos-code'] && hasProviderKey('kairos', keys);
        case 'gemini':
            return cli.gemini && hasProviderKey('gemini', keys);
        case 'google':
            return cli.gemini && hasProviderKey('gemini', keys);
        case 'chatgpt':
        case 'openai':
            // OpenAI via Codex CLI OR Copilot (which can provide GPT)
            if (cli.copilot) {
                return true;
            }
            return cli.codex && hasProviderKey('chatgpt', keys);
        case 'copilot':
        case 'xai':
            // Copilot for GPT/Grok/Raptor
            return cli.copilot;
        case 'ollama':
            return cli.ollama;
        case 'vscode':
        default:
            // VSCode provider - check by model ID patterns
            if (id.includes('kairos')) {
                return cli['kairos-code'] && hasProviderKey('kairos', keys);
            }
            if (id.includes('gemini')) {
                return cli.gemini && hasProviderKey('gemini', keys);
            }
            if (id.includes('gpt')) {
                if (cli.copilot) {
                    return true;
                }
                return cli.codex && hasProviderKey('chatgpt', keys);
            }
            if (id.includes('grok') || id.includes('raptor')) {
                return cli.copilot;
            }
            if (id.includes('ollama') || id.includes('mistral') || id.includes('llama') || id.includes('neural')) {
                return cli.ollama;
            }
            if (id === 'auto') {
                return (
                    cli.copilot
                    || (cli.codex && hasProviderKey('chatgpt', keys))
                    || (cli.gemini && hasProviderKey('gemini', keys))
                    || (cli['kairos-code'] && hasProviderKey('kairos', keys))
                    || cli.ollama
                );
            }
            return false;
    }
}

export async function GET(req: NextRequest) {
    try {
        let cli = detectCliAvailability();

        // Check if Ollama is running
        const ollamaRunning = await isOllamaRunning();
        cli.ollama = ollamaRunning;

        const projectId = req.headers.get('x-project-id') || req.headers.get('X-Project-Id') || '';
        const db = await getDb();
        const settingsService = new SettingsService(db);
        const aiSettings = await settingsService.getAIProviderSettings('system');
        const providerEnabled = {
            copilot: aiSettings['copilot.enabled'] !== false,
            gemini: aiSettings['gemini.enabled'] !== false,
            kairos: aiSettings['kairos.enabled'] !== false,
            codex: aiSettings['codex.enabled'] !== false,
        };

        if (!providerEnabled.copilot) {
            cli.copilot = false;
        }
        if (!providerEnabled.gemini) {
            cli.gemini = false;
        }
        if (!providerEnabled.kairos) {
            cli['kairos-code'] = false;
        }
        if (!providerEnabled.codex) {
            cli.codex = false;
        }

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
            models[model.id] = isModelAvailable(model.id, model.provider, cli, providerKeys);
        }

        const availableCli = (Object.entries(cli)
            .filter(([, present]) => present)
            .map(([name]) => name)) as CliName[];

        return ok({
            cli,
            availableCli,
            providerKeys,
            models,
            providerEnabled,
        });
    } catch (e) {
        if (e instanceof Error) {
            return err('AI_AVAILABILITY_ERROR', e.message, 500);
        }
        return err('INTERNAL_ERROR', 'Failed to detect AI availability', 500);
    }
}
