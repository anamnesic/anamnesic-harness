export const runtime = 'nodejs';

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';

const DAILY_DIR = path.join(process.cwd(), 'data', 'summaries', 'daily');

async function listDateDirs(): Promise<string[]> {
    try {
        const entries = await fs.readdir(DAILY_DIR, { withFileTypes: true });
        return entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort((a, b) => b.localeCompare(a));
    } catch {
        return [];
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');
        const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '30', 10), 100));

        if (date) {
            const summaryJson = path.join(DAILY_DIR, date, 'daily-summary.json');
            const summaryMarkdown = path.join(DAILY_DIR, date, 'daily-summary.md');

            const [jsonRaw, markdownRaw] = await Promise.all([
                fs.readFile(summaryJson, 'utf8'),
                fs.readFile(summaryMarkdown, 'utf8').catch(() => ''),
            ]);

            return ok({
                date,
                summary: JSON.parse(jsonRaw),
                markdown: markdownRaw,
            });
        }

        const dates = (await listDateDirs()).slice(0, limit);
        const items = await Promise.all(dates.map(async (d) => {
            const file = path.join(DAILY_DIR, d, 'daily-summary.json');
            try {
                const raw = await fs.readFile(file, 'utf8');
                const parsed = JSON.parse(raw) as Record<string, unknown>;
                return {
                    date: d,
                    narrativeSummary: parsed?.output && typeof parsed.output === 'object'
                        ? (parsed.output as Record<string, unknown>).narrativeSummary
                        : undefined,
                    provider: parsed?.provider,
                    exitCode: parsed?.exitCode,
                };
            } catch {
                return {
                    date: d,
                    narrativeSummary: null,
                    provider: null,
                    exitCode: null,
                };
            }
        }));

        return ok({ items, count: items.length });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to load semantic summaries', 500, String(error));
    }
}
