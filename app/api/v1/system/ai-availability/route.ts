export const runtime = 'nodejs';

import { spawnSync } from 'node:child_process';
import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { AVAILABLE_MODELS } from '@/src/config/models';
import { readProviderKeyStatuses } from '@/app/api/_lib/project-env-keys';

type CliName = 'copilot' | 'gemini' | 'claude-code' | 'codex';
type ProviderName = 'claude' | 'chatgpt' | 'gemini';

function commandExists(command: string): boolean {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(checker, [command], { stdio: 'ignore' });
    return result.status === 0;
}

function hasGhCopilotExtension(): boolean {
    if (!commandExists('gh')) {
        return false;
    }

    const result = spawnSync('gh', ['extension', 'list'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
    });

    if (result.status !== 0) {
        return false;
    }

    const output = typeof result.stdout === 'string' ? result.stdout.toLowerCase() : '';
    return output.includes('gh-copilot') || output.includes('github/gh-copilot');
}

function commandWorks(command: string, args: string[]): boolean {
    const result = spawnSync(command, args, {
        stdio: 'ignore',
        timeout: 4000,
    });
    return result.status === 0;
}

function ghCopilotWorks(): boolean {
    if (!commandExists('gh') || !hasGhCopilotExtension()) {
        return false;
    }

    return commandWorks('gh', ['copilot', '--help']);
}

function detectCliAvailability(): Record<CliName, boolean> {
    const hasCopilotBinary = commandExists('copilot') && commandWorks('copilot', ['--version']);
    const hasGemini = commandExists('gemini') && commandWorks('gemini', ['--version']);
    const hasClaudeCode = (
        (commandExists('claude-code') && commandWorks('claude-code', ['--version']))
        || (commandExists('claude') && commandWorks('claude', ['--version']))
    );
    const hasCodex = commandExists('codex') && commandWorks('codex', ['--version']);

    return {
        copilot: hasCopilotBinary || ghCopilotWorks(),
        gemini: hasGemini,
        'claude-code': hasClaudeCode,
        codex: hasCodex,
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

    if (id === 'auto') {
        return (
            cli.copilot
            || (cli.codex && hasProviderKey('chatgpt', keys))
            || (cli.gemini && hasProviderKey('gemini', keys))
            || (cli['claude-code'] && hasProviderKey('claude', keys))
        );
    }

    return false;
}

export async function GET(req: NextRequest) {
    try {
        const cli = detectCliAvailability();
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
