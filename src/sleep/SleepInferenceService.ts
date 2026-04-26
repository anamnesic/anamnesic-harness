import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { CliInferenceService, type LlmCliProvider } from '../core/llm-cli';
import { Logger } from '../core/utils/Logger';
import { memoryManager } from '../memory/memoryManager';
import { Consolidator } from './consolidator';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DAILY_DIR = path.join(DATA_DIR, 'summaries', 'daily');

const contradictionSchema = z.object({
    existingFact: z.string().min(1),
    newFact: z.string().min(1),
    reason: z.string().min(1),
    severity: z.enum(['low', 'medium', 'high']),
});

const pruningSuggestionSchema = z.object({
    target: z.string().min(1),
    reason: z.string().min(1),
    score: z.number().min(0).max(1),
});

const permanentFactSchema = z.object({
    fact: z.string().min(1),
    score: z.number().min(0).max(1),
    rationale: z.string().min(1),
});

const sleepInferenceSchema = z.object({
    narrativeSummary: z.string().min(1),
    keyChanges: z.array(z.string().min(1)).max(20),
    permanentFacts: z.array(permanentFactSchema).max(30),
    contradictions: z.array(contradictionSchema).max(30),
    pruningSuggestions: z.array(pruningSuggestionSchema).max(30),
});

export type SleepInferenceOutput = z.infer<typeof sleepInferenceSchema>;

export interface SleepInferenceRunResult {
    date: string;
    output: SleepInferenceOutput;
    promotedFacts: Array<{ fact: string; score: number; rationale: string }>;
    files: {
        summaryMarkdown: string;
        summaryJson: string;
        promotedFactsJson: string;
        contradictionsJson: string;
    };
}

export interface SleepInferenceServiceOptions {
    preferredProvider?: LlmCliProvider;
    fallbackProviders?: LlmCliProvider[];
    minFactScore?: number;
}

export class SleepInferenceService {
    private readonly logger = Logger.getInstance('SleepInferenceService');
    private readonly preferredProvider: LlmCliProvider;
    private readonly fallbackProviders: LlmCliProvider[];
    private readonly minFactScore: number;

    constructor(
        private readonly inference = new CliInferenceService(),
        options: SleepInferenceServiceOptions = {},
    ) {
        this.preferredProvider = options.preferredProvider ?? 'gemini';
        this.fallbackProviders = options.fallbackProviders ?? ['claude', 'copilot', 'codex'];
        this.minFactScore = options.minFactScore ?? 0.65;
    }

    async run(date?: string): Promise<SleepInferenceRunResult> {
        const targetDate = date ?? new Date().toISOString().slice(0, 10);
        const entries = await memoryManager.readLog(targetDate);
        const consolidation = await new Consolidator().consolidate(targetDate);

        const prompt = this.buildPrompt(targetDate, entries, consolidation);
        const result = await this.inference.executePrompt({
            preferredProvider: this.preferredProvider,
            fallbackProviders: this.fallbackProviders,
            prompt,
        });

        const parsed = this.parseResult(result.rawText || result.stdout || '', targetDate, consolidation.totalEntries);
        const promotedFacts = parsed.permanentFacts.filter((f) => f.score >= this.minFactScore);

        const baseDir = path.join(DAILY_DIR, targetDate);
        await fs.mkdir(baseDir, { recursive: true });

        const summaryMarkdown = path.join(baseDir, 'daily-summary.md');
        const summaryJson = path.join(baseDir, 'daily-summary.json');
        const promotedFactsJson = path.join(baseDir, 'promoted-facts.json');
        const contradictionsJson = path.join(baseDir, 'contradictions.json');

        const markdown = this.toMarkdown(targetDate, parsed, promotedFacts);
        await fs.writeFile(summaryMarkdown, markdown, 'utf8');
        await fs.writeFile(summaryJson, JSON.stringify({
            date: targetDate,
            provider: result.provider,
            command: result.command,
            exitCode: result.exitCode,
            output: parsed,
        }, null, 2), 'utf8');
        await fs.writeFile(promotedFactsJson, JSON.stringify(promotedFacts, null, 2), 'utf8');
        await fs.writeFile(contradictionsJson, JSON.stringify(parsed.contradictions, null, 2), 'utf8');

        this.logger.info(`Sleep inference artifacts generated for ${targetDate}`);

        return {
            date: targetDate,
            output: parsed,
            promotedFacts,
            files: {
                summaryMarkdown,
                summaryJson,
                promotedFactsJson,
                contradictionsJson,
            },
        };
    }

    private buildPrompt(date: string, entries: Array<{ id: string; content: string; source: string; projectId?: string; timestamp: Date }>, consolidation: { totalEntries: number; bySource: Record<string, number>; byProject: Record<string, number> }): string {
        const compactEntries = entries.slice(0, 300).map((e) => ({
            id: e.id,
            source: e.source,
            projectId: e.projectId ?? '',
            content: e.content,
            timestamp: new Date(e.timestamp).toISOString(),
        }));

        return [
            'You are the sleep-cycle summarization engine for an autonomous agent.',
            'Return ONLY a JSON object with this exact shape:',
            '{"narrativeSummary":"...","keyChanges":["..."],"permanentFacts":[{"fact":"...","score":0.0,"rationale":"..."}],"contradictions":[{"existingFact":"...","newFact":"...","reason":"...","severity":"low|medium|high"}],"pruningSuggestions":[{"target":"...","reason":"...","score":0.0}]}',
            'Rules:',
            '- Keep content concise and concrete.',
            '- Keep score fields between 0 and 1.',
            '- If no contradictions exist, return an empty array.',
            '- If there are no strong permanent facts, keep scores low.',
            '',
            `DATE=${date}`,
            `CONSOLIDATION=${JSON.stringify(consolidation)}`,
            `EVENTS=${JSON.stringify(compactEntries)}`,
        ].join('\n');
    }

    private parseResult(raw: string, date: string, totalEntries: number): SleepInferenceOutput {
        const candidate = this.extractJsonObject(raw);
        if (candidate) {
            try {
                const parsed = JSON.parse(candidate);
                const validated = sleepInferenceSchema.safeParse(parsed);
                if (validated.success) {
                    return validated.data;
                }
            } catch {
                // ignore parse failures and fall back
            }
        }

        return {
            narrativeSummary: totalEntries === 0
                ? `No relevant activity recorded for ${date}.`
                : `${totalEntries} events were processed for ${date}. Manual review recommended due to non-structured model output.`,
            keyChanges: totalEntries === 0 ? [] : ['Activity detected but structured summary could not be parsed.'],
            permanentFacts: [],
            contradictions: [],
            pruningSuggestions: totalEntries === 0
                ? []
                : [{
                    target: 'low-signal transient events',
                    reason: 'Model output was not structured; prioritize pruning noisy entries first.',
                    score: 0.5,
                }],
        };
    }

    private extractJsonObject(raw: string): string | null {
        const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
        if (fenced?.[1]) return fenced[1].trim();

        const first = raw.indexOf('{');
        const last = raw.lastIndexOf('}');
        if (first !== -1 && last > first) {
            return raw.slice(first, last + 1).trim();
        }
        return null;
    }

    private toMarkdown(
        date: string,
        output: SleepInferenceOutput,
        promotedFacts: Array<{ fact: string; score: number; rationale: string }>,
    ): string {
        const lines: string[] = [
            `# Daily Summary - ${date}`,
            '',
            output.narrativeSummary,
            '',
            '## Key Changes',
            ...(output.keyChanges.length ? output.keyChanges.map((change) => `- ${change}`) : ['- No key changes detected.']),
            '',
            '## Promoted Facts',
            ...(promotedFacts.length
                ? promotedFacts.map((fact) => `- ${fact.fact} (score=${fact.score.toFixed(2)}): ${fact.rationale}`)
                : ['- No facts above promotion threshold.']),
            '',
            '## Contradictions',
            ...(output.contradictions.length
                ? output.contradictions.map((c) => `- [${c.severity}] ${c.reason} | existing="${c.existingFact}" | new="${c.newFact}"`)
                : ['- No contradictions detected.']),
            '',
            '## Pruning Suggestions',
            ...(output.pruningSuggestions.length
                ? output.pruningSuggestions.map((s) => `- ${s.target} (score=${s.score.toFixed(2)}): ${s.reason}`)
                : ['- No pruning suggestions generated.']),
            '',
        ];

        return lines.join('\n');
    }
}
