import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe.sequential('SleepInferenceService', () => {
    const originalCwd = process.cwd();
    let tempRoot = '';

    beforeEach(async () => {
        tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kairos-sleep-inference-'));
        process.chdir(tempRoot);
        vi.resetModules();
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        if (tempRoot) {
            await fs.rm(tempRoot, { recursive: true, force: true });
        }
    });

    it('generates daily sleep artifacts using structured LLM output', async () => {
        const executePrompt = vi.fn().mockResolvedValue({
            provider: 'gemini',
            command: 'gemini',
            args: ['-p', '...'],
            stdout: '',
            stderr: '',
            rawText: JSON.stringify({
                narrativeSummary: 'A day with meaningful code and API changes.',
                keyChanges: ['Code observer captured module refactors', 'API errors dropped after fix'],
                permanentFacts: [
                    { fact: 'Project uses observer-driven memory logging', score: 0.92, rationale: 'Repeatedly observed' },
                    { fact: 'Transient timeout spikes occur during sync', score: 0.58, rationale: 'Low confidence anomaly' },
                ],
                contradictions: [
                    {
                        existingFact: 'API monitor is always stable',
                        newFact: 'API had recurring timeout spikes',
                        reason: 'Recent runs showed repeated timeout alerts',
                        severity: 'medium',
                    },
                ],
                pruningSuggestions: [
                    { target: 'trivial auto-sync noise', reason: 'Low information density', score: 0.77 },
                ],
            }),
            exitCode: 0,
            success: true,
            durationMs: 42,
            timedOut: false,
            retriesUsed: 0,
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
        });

        const { memoryManager } = await import('../../memory/memoryManager');
        const { SleepInferenceService } = await import('../SleepInferenceService');

        await memoryManager.log({
            id: 'evt-1',
            content: 'Code changed: src/core/services/ObserverService.ts',
            source: 'code-observer',
            projectId: 'project-a',
            timestamp: new Date('2026-04-26T09:00:00.000Z'),
        });

        const service = new SleepInferenceService({ executePrompt } as any, {
            preferredProvider: 'gemini',
            minFactScore: 0.65,
        });

        const result = await service.run('2026-04-26');

        expect(result.date).toBe('2026-04-26');
        expect(result.output.narrativeSummary).toContain('meaningful code');
        expect(result.promotedFacts).toHaveLength(1);
        expect(result.promotedFacts[0].fact).toContain('observer-driven memory logging');

        const md = await fs.readFile(result.files.summaryMarkdown, 'utf8');
        const json = JSON.parse(await fs.readFile(result.files.summaryJson, 'utf8'));
        const promoted = JSON.parse(await fs.readFile(result.files.promotedFactsJson, 'utf8'));
        const contradictions = JSON.parse(await fs.readFile(result.files.contradictionsJson, 'utf8'));

        expect(md).toContain('Daily Summary - 2026-04-26');
        expect(json.output.keyChanges).toHaveLength(2);
        expect(promoted).toHaveLength(1);
        expect(contradictions).toHaveLength(1);

        expect(executePrompt).toHaveBeenCalledTimes(1);
        const requestArg = executePrompt.mock.calls[0][0];
        expect(requestArg.preferredProvider).toBe('gemini');
        expect(requestArg.prompt).toContain('CONSOLIDATION=');
        expect(requestArg.prompt).toContain('EVENTS=');
    });

    it('falls back to heuristic summary when model output is not structured JSON', async () => {
        const executePrompt = vi.fn().mockResolvedValue({
            provider: 'gemini',
            command: 'gemini',
            args: ['-p', '...'],
            stdout: 'non-json answer',
            stderr: '',
            rawText: 'non-json answer',
            exitCode: 0,
            success: true,
            durationMs: 42,
            timedOut: false,
            retriesUsed: 0,
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
        });

        const { SleepInferenceService } = await import('../SleepInferenceService');
        const service = new SleepInferenceService({ executePrompt } as any);

        const result = await service.run('2026-04-26');
        expect(result.output.narrativeSummary).toContain('No relevant activity recorded');

        const promoted = JSON.parse(await fs.readFile(result.files.promotedFactsJson, 'utf8'));
        expect(promoted).toHaveLength(0);
    });
});
