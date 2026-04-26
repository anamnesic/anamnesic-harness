export const runtime = 'nodejs';

import { spawnSync } from 'node:child_process';
import { ok, err } from '@/app/api/_lib/response';
import { AVAILABLE_MODELS } from '@/src/config/models';

type CliName = 'copilot' | 'gemini' | 'claude-code' | 'codex';

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

function isModelAvailable(modelId: string, cli: Record<CliName, boolean>): boolean {
    const id = modelId.toLowerCase();

    if (id.includes('claude')) {
        return cli['claude-code'];
    }

    if (id.includes('gemini')) {
        return cli.gemini;
    }

    if (id.includes('codex')) {
        return cli.codex;
    }

    if (id.includes('gpt')) {
        return cli.codex || cli.copilot;
    }

    if (id.includes('grok') || id.includes('raptor')) {
        return cli.copilot;
    }

    if (id === 'auto') {
        return cli.copilot || cli.codex || cli.gemini || cli['claude-code'];
    }

    return false;
}

export async function GET() {
    try {
        const cli = detectCliAvailability();
        const models: Record<string, boolean> = {};

        for (const model of AVAILABLE_MODELS) {
            models[model.id] = isModelAvailable(model.id, cli);
        }

        const availableCli = (Object.entries(cli)
            .filter(([, present]) => present)
            .map(([name]) => name)) as CliName[];

        return ok({
            cli,
            availableCli,
            models,
        });
    } catch (e) {
        if (e instanceof Error) {
            return err('AI_AVAILABILITY_ERROR', e.message, 500);
        }
        return err('INTERNAL_ERROR', 'Failed to detect AI availability', 500);
    }
}
