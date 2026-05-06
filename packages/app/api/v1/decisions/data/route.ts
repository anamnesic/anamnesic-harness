export const runtime = 'nodejs';

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ok, err } from '@/app/api/_lib/response';
import { vaultDataDir, vaultReadEnc } from '@kairos/vault';

type DecisionSource = 'proactive' | 'self-optimization' | 'decision-log' | 'system-log' | 'audit';

type DecisionStatus = 'pending' | 'accepted' | 'rejected' | 'high' | 'medium' | 'low' | 'info';

interface DecisionFeedItem {
    id: string;
    source: DecisionSource;
    category: string;
    title: string;
    summary: string;
    status: DecisionStatus;
    timestamp: string;
    sourceFile: string;
    metadata?: Record<string, unknown>;
}

interface SourceInventory {
    files: number;
    latestFile: string | null;
    latestTimestamp: string | null;
}

function normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
}

function relativeDataPath(absolutePath: string, dataDir: string): string {
    return normalizePath(path.relative(dataDir, absolutePath));
}

function toIsoDate(input: unknown): string | null {
    if (typeof input !== 'string' || !input.trim()) return null;
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

function shortText(value: unknown, fallback = 'Sem detalhe disponível', maxLen = 220): string {
    const text = typeof value === 'string' ? value : fallback;
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen - 1)}...`;
}

async function listJsonFiles(dirPath: string, limit: number): Promise<string[]> {
    const all = await fs.readdir(dirPath, { recursive: true, withFileTypes: true }).catch(() => []);
    const files: Array<{ filePath: string; mtimeMs: number }> = [];

    for (const entry of all) {
        if (!entry.isFile()) continue;
        const name = entry.name.toLowerCase();
        if (!name.endsWith('.json.enc') && !name.endsWith('.json')) continue;
        const filePath = path.join(entry.parentPath, entry.name);
        const stat = await fs.stat(filePath).catch(() => null);
        if (!stat) continue;
        files.push({ filePath, mtimeMs: stat.mtimeMs });
    }

    files.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return files.slice(0, limit).map((item) => item.filePath);
}

async function readJson(filePath: string): Promise<Record<string, unknown> | null> {
    try {
        const raw = filePath.endsWith('.enc')
            ? await vaultReadEnc(filePath)
            : await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object') {
            return parsed as Record<string, unknown>;
        }
        return null;
    } catch {
        return null;
    }
}

function ensureArray<T = unknown>(input: unknown): T[] {
    return Array.isArray(input) ? input as T[] : [];
}

function asObject(input: unknown): Record<string, unknown> | null {
    return input && typeof input === 'object' && !Array.isArray(input)
        ? input as Record<string, unknown>
        : null;
}

function buildItemId(file: string, suffix: string): string {
    return `${normalizePath(file)}::${suffix}`;
}

async function parseProactiveFiles(
    dataDir: string,
    proactiveDir: string,
    maxFiles: number,
): Promise<DecisionFeedItem[]> {
    const files = await listJsonFiles(proactiveDir, maxFiles);
    const items: DecisionFeedItem[] = [];

    for (const filePath of files) {
        const doc = await readJson(filePath);
        if (!doc) continue;

        const generatedAt = toIsoDate(doc.generatedAt) ?? new Date().toISOString();
        const sourceFile = relativeDataPath(filePath, dataDir);
        const plan = asObject(doc.plan) ?? {};

        const risks = ensureArray<Record<string, unknown>>(plan.risks);
        const opportunities = ensureArray<Record<string, unknown>>(plan.opportunities);
        const tasks = ensureArray<Record<string, unknown>>(plan.taskCandidates);
        const recommendations = ensureArray<Record<string, unknown>>(plan.recommendations);
        const approvals = ensureArray<Record<string, unknown>>(doc.pendingApprovals);

        recommendations.forEach((rec, idx) => {
            items.push({
                id: buildItemId(sourceFile, `recommendation-${idx}`),
                source: 'proactive',
                category: 'recommendation',
                title: shortText(rec.title, 'Recomendação proativa'),
                summary: shortText(rec.rationale, shortText(rec.action, 'Sem racional informado')),
                status: 'info',
                timestamp: generatedAt,
                sourceFile,
                metadata: {
                    action: rec.action,
                    provider: doc.provider,
                    command: doc.command,
                    exitCode: doc.exitCode,
                },
            });
        });

        risks.forEach((risk, idx) => {
            const severity = typeof risk.severity === 'string' ? risk.severity.toLowerCase() : 'medium';
            const status: DecisionStatus = severity === 'high' || severity === 'critical'
                ? 'high'
                : severity === 'low'
                    ? 'low'
                    : 'medium';

            items.push({
                id: buildItemId(sourceFile, `risk-${idx}`),
                source: 'proactive',
                category: 'risk',
                title: shortText(risk.title, 'Risco identificado'),
                summary: shortText(risk.evidence, shortText(risk.recommendedAction, 'Sem evidência')),
                status,
                timestamp: generatedAt,
                sourceFile,
                metadata: {
                    recommendedAction: risk.recommendedAction,
                    provider: doc.provider,
                },
            });
        });

        opportunities.forEach((opportunity, idx) => {
            items.push({
                id: buildItemId(sourceFile, `opportunity-${idx}`),
                source: 'proactive',
                category: 'opportunity',
                title: shortText(opportunity.title, 'Oportunidade identificada'),
                summary: shortText(opportunity.evidence, shortText(opportunity.suggestedAction, 'Sem detalhe')),
                status: 'info',
                timestamp: generatedAt,
                sourceFile,
                metadata: {
                    impact: opportunity.impact,
                    suggestedAction: opportunity.suggestedAction,
                },
            });
        });

        tasks.forEach((task, idx) => {
            items.push({
                id: buildItemId(sourceFile, `task-${idx}`),
                source: 'proactive',
                category: 'task-candidate',
                title: shortText(task.title, 'Tarefa candidata'),
                summary: shortText(task.rationale, shortText(task.description, 'Sem racional informado')),
                status: 'pending',
                timestamp: generatedAt,
                sourceFile,
                metadata: {
                    priority: task.priority,
                    sensitivity: task.sensitivity,
                    requiresApproval: task.requiresApproval,
                },
            });
        });

        approvals.forEach((approval, idx) => {
            items.push({
                id: buildItemId(sourceFile, `approval-${idx}`),
                source: 'proactive',
                category: 'pending-approval',
                title: shortText(approval.taskTitle, 'Aprovação pendente'),
                summary: shortText(approval.reason, 'Sem motivo informado'),
                status: 'pending',
                timestamp: generatedAt,
                sourceFile,
                metadata: {
                    requestId: approval.requestId,
                    status: approval.status,
                },
            });
        });
    }

    return items;
}

async function parseSelfOptimizationFiles(
    dataDir: string,
    selfDir: string,
    maxFiles: number,
): Promise<DecisionFeedItem[]> {
    const files = await listJsonFiles(selfDir, maxFiles);
    const items: DecisionFeedItem[] = [];

    for (const filePath of files) {
        const doc = await readJson(filePath);
        if (!doc) continue;

        const generatedAt = toIsoDate(doc.generatedAt) ?? new Date().toISOString();
        const sourceFile = relativeDataPath(filePath, dataDir);

        const suggestions = ensureArray<Record<string, unknown>>(doc.suggestions);
        const plan = asObject(doc.plan) ?? {};
        const configImprovements = ensureArray<Record<string, unknown>>(plan.configImprovements);
        const policyChanges = ensureArray<Record<string, unknown>>(plan.policyChanges);
        const routingChanges = ensureArray<Record<string, unknown>>(plan.routingChanges);

        suggestions.forEach((suggestion, idx) => {
            const suggestionStatus = typeof suggestion.status === 'string' ? suggestion.status.toLowerCase() : 'pending';
            const status: DecisionStatus = suggestionStatus === 'accepted'
                ? 'accepted'
                : suggestionStatus === 'rejected'
                    ? 'rejected'
                    : 'pending';

            items.push({
                id: buildItemId(sourceFile, `suggestion-${idx}`),
                source: 'self-optimization',
                category: typeof suggestion.category === 'string' ? suggestion.category : 'suggestion',
                title: shortText(suggestion.title, 'Sugestão de otimização'),
                summary: shortText(suggestion.summary, 'Sem resumo informado'),
                status,
                timestamp: toIsoDate(suggestion.createdAt) ?? generatedAt,
                sourceFile,
                metadata: {
                    provider: doc.provider,
                    command: doc.command,
                    exitCode: doc.exitCode,
                },
            });
        });

        configImprovements.forEach((item, idx) => {
            items.push({
                id: buildItemId(sourceFile, `config-${idx}`),
                source: 'self-optimization',
                category: 'config-improvement',
                title: shortText(item.title, 'Melhoria de configuração'),
                summary: shortText(item.expectedImpact, shortText(item.rationale, 'Sem impacto informado')),
                status: 'pending',
                timestamp: generatedAt,
                sourceFile,
                metadata: {
                    settingKey: item.settingKey,
                    proposedValue: item.proposedValue,
                },
            });
        });

        policyChanges.forEach((item, idx) => {
            items.push({
                id: buildItemId(sourceFile, `policy-${idx}`),
                source: 'self-optimization',
                category: 'policy-change',
                title: shortText(item.title, 'Mudança de política'),
                summary: shortText(item.rationale, shortText(item.change, 'Sem justificativa')),
                status: typeof item.riskLevel === 'string' && item.riskLevel.toLowerCase() === 'high' ? 'high' : 'medium',
                timestamp: generatedAt,
                sourceFile,
                metadata: {
                    policyArea: item.policyArea,
                    riskLevel: item.riskLevel,
                },
            });
        });

        routingChanges.forEach((item, idx) => {
            items.push({
                id: buildItemId(sourceFile, `routing-${idx}`),
                source: 'self-optimization',
                category: 'routing-change',
                title: `Roteamento: ${shortText(item.taskType, 'task')}`,
                summary: shortText(item.rationale, 'Sem justificativa'),
                status: 'info',
                timestamp: generatedAt,
                sourceFile,
                metadata: {
                    recommendedProvider: item.recommendedProvider,
                    confidence: item.confidence,
                },
            });
        });
    }

    return items;
}

async function parseDecisionLog(dataDir: string, selfDir: string, maxRows: number): Promise<DecisionFeedItem[]> {
    const logPath = path.join(selfDir, 'decisions.log.enc');
    const raw = await vaultReadEnc(logPath).catch(
        () => fs.readFile(path.join(selfDir, 'decisions.log'), 'utf8').catch(() => ''),
    );
    if (!raw.trim()) return [];

    const lines = raw.split(/\r?\n/).filter(Boolean);
    const recent = lines.slice(-maxRows).reverse();
    const sourceFile = relativeDataPath(logPath, dataDir);

    return recent.flatMap((line, idx) => {
        try {
            const row = JSON.parse(line) as Record<string, unknown>;
            const decisionValue = typeof row.decision === 'string' ? row.decision.toLowerCase() : 'pending';
            const status: DecisionStatus = decisionValue === 'accepted'
                ? 'accepted'
                : decisionValue === 'rejected'
                    ? 'rejected'
                    : 'pending';

            return [{
                id: buildItemId(sourceFile, `decision-log-${idx}`),
                source: 'decision-log' as const,
                category: 'optimization-decision',
                title: `Sugestão ${decisionValue}`,
                summary: shortText(row.reason, `suggestionId=${String(row.suggestionId ?? 'unknown')}`),
                status,
                timestamp: toIsoDate(row.timestamp) ?? new Date().toISOString(),
                sourceFile,
                metadata: {
                    suggestionId: row.suggestionId,
                    actor: row.actor,
                },
            }];
        } catch {
            return [];
        }
    });
}

async function readTailLines(filePath: string, maxBytes: number, maxLines: number): Promise<string[]> {
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) return [];

    const bytesToRead = Math.min(stat.size, maxBytes);
    const handle = await fs.open(filePath, 'r').catch(() => null);
    if (!handle) return [];

    try {
        const buffer = Buffer.alloc(bytesToRead);
        await handle.read(buffer, 0, bytesToRead, stat.size - bytesToRead);
        const raw = buffer.toString('utf8');
        const lines = raw.split(/\r?\n/).filter(Boolean);
        return lines.slice(-maxLines);
    } finally {
        await handle.close();
    }
}

async function parseJsonLineLogs(
    dataDir: string,
    logFilePath: string,
    source: DecisionSource,
    category: string,
    maxLines: number,
): Promise<DecisionFeedItem[]> {
    const lines = await readTailLines(logFilePath, 512 * 1024, maxLines);
    const sourceFile = relativeDataPath(logFilePath, dataDir);

    return lines.flatMap((line, idx) => {
        try {
            const row = JSON.parse(line) as Record<string, unknown>;
            const timestamp = toIsoDate(row.timestamp) ?? new Date().toISOString();
            const sourceLabel = typeof row.source === 'string' ? row.source : source;
            const content = shortText(row.content, 'Evento registrado');

            return [{
                id: buildItemId(sourceFile, `${category}-${idx}`),
                source,
                category,
                title: `Evento: ${sourceLabel}`,
                summary: content,
                status: 'info' as const,
                timestamp,
                sourceFile,
                metadata: {
                    rawId: row.id,
                },
            }];
        } catch {
            return [];
        }
    });
}

async function collectInventory(dataDir: string): Promise<Record<string, SourceInventory>> {
    const sourceDirs = ['proactive', 'self-optimization', 'audit', 'logs', 'index', 'summaries'];
    const inventory: Record<string, SourceInventory> = {};

    for (const dirName of sourceDirs) {
        const dirPath = path.join(dataDir, dirName);
        const files = await fs.readdir(dirPath, { recursive: true, withFileTypes: true }).catch(() => []);

        let latestFile: string | null = null;
        let latestTimestamp: string | null = null;
        let count = 0;

        for (const file of files) {
            if (!file.isFile()) continue;
            count += 1;
            const filePath = path.join(file.parentPath, file.name);
            const stat = await fs.stat(filePath).catch(() => null);
            if (!stat) continue;
            if (!latestTimestamp || stat.mtime.toISOString() > latestTimestamp) {
                latestTimestamp = stat.mtime.toISOString();
                latestFile = relativeDataPath(filePath, dataDir);
            }
        }

        inventory[dirName] = {
            files: count,
            latestFile,
            latestTimestamp,
        };
    }

    return inventory;
}

export async function GET() {
    try {
        const dataDir = vaultDataDir();
        const proactiveDir = path.join(dataDir, 'proactive');
        const selfDir = path.join(dataDir, 'self-optimization');
        const logsDir = path.join(dataDir, 'logs');
        const auditDir = path.join(dataDir, 'audit', 'llm-cli');

        const [
            proactiveItems,
            optimizationItems,
            decisionLogItems,
            systemLogItems,
            auditItems,
            inventory,
        ] = await Promise.all([
            parseProactiveFiles(dataDir, proactiveDir, 120),
            parseSelfOptimizationFiles(dataDir, selfDir, 80),
            parseDecisionLog(dataDir, selfDir, 80),
            parseJsonLineLogs(dataDir, path.join(logsDir, `${new Date().toISOString().slice(0, 10)}.log`), 'system-log', 'observer-event', 80),
            parseJsonLineLogs(dataDir, path.join(auditDir, `${new Date().toISOString().slice(0, 10)}`, 'inference.log'), 'audit', 'llm-inference', 60),
            collectInventory(dataDir),
        ]);

        const items = [
            ...proactiveItems,
            ...optimizationItems,
            ...decisionLogItems,
            ...systemLogItems,
            ...auditItems,
        ]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 500);

        const bySource = items.reduce<Record<string, number>>((acc, item) => {
            acc[item.source] = (acc[item.source] ?? 0) + 1;
            return acc;
        }, {});

        const byStatus = items.reduce<Record<string, number>>((acc, item) => {
            acc[item.status] = (acc[item.status] ?? 0) + 1;
            return acc;
        }, {});

        return ok({
            generatedAt: new Date().toISOString(),
            total: items.length,
            bySource,
            byStatus,
            inventory,
            items,
        });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to build AI decisions feed from data directory', 500, String(error));
    }
}
