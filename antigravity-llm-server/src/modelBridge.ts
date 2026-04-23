import * as vscode from 'vscode';
import type { OllamaChatMessage, OllamaModelInfo } from './types';
import {
    LanguageServerClient,
    LS,
    type CascadeModelConfig,
} from './antigravityClient';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Virtual model name that triggers automatic prompt improvement and model selection. */
export const AUTO_MODEL_NAME = 'auto';

/** Model family used as the router to improve prompts and select the best model. */
export const ROUTER_MODEL_FAMILY = 'gemini-3-flash';

// ─── Model name utilities ─────────────────────────────────────────────────────

/**
 * Converts a VS Code LM model to an Ollama-compatible name.
 * Format: "{family}:{vendor}" — e.g. "gemini-3-flash:antigravity"
 */
export function modelToOllamaName(model: vscode.LanguageModelChat): string {
    return `${model.family}:${model.vendor}`;
}

/** Returns true when the model name refers to the virtual auto-routing model. */
export function isAutoModel(name: string): boolean {
    return name.toLowerCase() === AUTO_MODEL_NAME;
}

// ─── Model discovery ──────────────────────────────────────────────────────────

/**
 * Lists all available Antigravity LM models, plus a virtual "auto" entry
 * at the top of the list.
 *
 * Unlike the VS Code version, this exposes ALL available models rather than
 * filtering to a curated list, since Antigravity already provides a curated set.
 */
/** Slugifies a Cascade model label ("Gemini 3 Flash" -> "gemini-3-flash"). */
function cascadeLabelToFamily(label: string): string {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

/** Listing source used when building /api/tags (for logging/debugging). */
export type ModelListSource = 'vscode.lm' | 'language-server' | 'empty';

function cascadeConfigsToOllamaModels(
    configs: readonly CascadeModelConfig[],
    now: string,
): OllamaModelInfo[] {
    return configs.map((c) => {
        const family = cascadeLabelToFamily(c.label);
        const name = `${family}:antigravity`;
        const modelId = c.modelOrAlias?.model ?? c.modelOrAlias?.alias ?? family;
        const digest = `sha256:${Buffer.from(`${family}antigravity${modelId}`)
            .toString('hex')
            .padEnd(64, '0')
            .slice(0, 64)}`;
        return {
            name,
            model: name,
            modified_at: now,
            size: 0,
            digest,
            details: {
                parent_model: '',
                format: 'api',
                family,
                families: [family],
                parameter_size: 'cascade',
                quantization_level: 'none',
            },
        };
    });
}

export async function listAntigravityModels(): Promise<OllamaModelInfo[]> {
    const all = await vscode.lm.selectChatModels();
    const now = new Date().toISOString();

    // When running inside the Antigravity editor, vscode.lm.selectChatModels()
    // returns empty (the core extension never registers chat models). Fall
    // back to the local language_server.exe which knows about Cascade models.
    if (all.length === 0) {
        try {
            const workspaceFs = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const client = LanguageServerClient.connect(workspaceFs);
            const resp = await LS.cascadeModels(client);
            const configs = resp.clientModelConfigs ?? [];
            if (configs.length > 0) {
                const result = cascadeConfigsToOllamaModels(configs, now);
                result.unshift({
                    name: AUTO_MODEL_NAME,
                    model: AUTO_MODEL_NAME,
                    modified_at: now,
                    size: 0,
                    digest: `sha256:${'61757465'.padEnd(64, '0')}`,
                    details: {
                        parent_model: ROUTER_MODEL_FAMILY,
                        format: 'router',
                        family: AUTO_MODEL_NAME,
                        families: [AUTO_MODEL_NAME],
                        parameter_size: 'router',
                        quantization_level: 'none',
                    },
                });
                return result;
            }
        } catch {
            // Fall through to empty list — upstream will surface a friendly error.
        }
    }

    const result: OllamaModelInfo[] = all.map((m) => {
        const digest = `sha256:${Buffer.from(`${m.family}${m.vendor}${m.version}`).toString('hex').padEnd(64, '0').slice(0, 64)}`;
        return {
            name: modelToOllamaName(m),
            model: modelToOllamaName(m),
            modified_at: now,
            size: 0,
            digest,
            details: {
                parent_model: '',
                format: 'api',
                family: m.family,
                families: [m.family],
                parameter_size: m.maxInputTokens > 0 ? `${m.maxInputTokens}ctx` : 'unknown',
                quantization_level: 'none',
            },
        };
    });

    // Prepend virtual "auto" model
    result.unshift({
        name: AUTO_MODEL_NAME,
        model: AUTO_MODEL_NAME,
        modified_at: now,
        size: 0,
        digest: `sha256:${'61757465'.padEnd(64, '0')}`,
        details: {
            parent_model: ROUTER_MODEL_FAMILY,
            format: 'router',
            family: AUTO_MODEL_NAME,
            families: [AUTO_MODEL_NAME],
            parameter_size: 'router',
            quantization_level: 'none',
        },
    });

    return result;
}

/**
 * Finds an Antigravity LM model by Ollama-style name.
 * Returns undefined for the virtual "auto" model name.
 *
 * Accepts:
 *  - "family"            e.g. "gemini-3-flash"
 *  - "family:latest"     treated same as "family"
 *  - "family:vendor"     e.g. "gemini-3-flash:antigravity"
 */
export async function findModel(
    ollamaModelName: string,
): Promise<vscode.LanguageModelChat | undefined> {
    if (isAutoModel(ollamaModelName)) {
        return undefined;
    }

    const [family, tag] = ollamaModelName.split(':');
    const vendor = tag && tag !== 'latest' ? tag : undefined;

    const selector: vscode.LanguageModelChatSelector = { family };
    if (vendor) {
        selector.vendor = vendor;
    }

    const matched = await vscode.lm.selectChatModels(selector);
    if (matched.length > 0) {
        return matched[0];
    }

    // Fallback: case-insensitive search across all models
    const all = await vscode.lm.selectChatModels();
    const lower = family.toLowerCase();
    return all.find(
        (m) =>
            m.family.toLowerCase() === lower ||
            m.id.toLowerCase() === lower ||
            m.name.toLowerCase().includes(lower),
    );
}

// ─── Auto routing ─────────────────────────────────────────────────────────────

export interface AutoRouteResult {
    model: vscode.LanguageModelChat;
    messages: vscode.LanguageModelChatMessage[];
    selectedModelName: string;
}

/**
 * Routes a request automatically using Gemini 3 Flash to:
 * 1. Improve and clarify the user's prompt.
 * 2. Select the most appropriate model from the available models.
 *
 * Falls back to claude-sonnet-4.6 if the selected model is unavailable.
 */
export async function routeAuto(
    ollamaMessages: OllamaChatMessage[],
    token: vscode.CancellationToken,
): Promise<AutoRouteResult> {
    const router = await findModel(ROUTER_MODEL_FAMILY);
    if (!router) {
        throw new Error(
            `Router model '${ROUTER_MODEL_FAMILY}' not available. Ensure Gemini 3 Flash is enabled in Antigravity.`,
        );
    }

    // Discover all available model families dynamically
    const allModels = await vscode.lm.selectChatModels();
    const availableFamilies = [...new Set(allModels.map((m) => m.family))];
    const availableList = availableFamilies.join(', ');

    const lastUserMsg =
        [...ollamaMessages].reverse().find((m) => m.role === 'user')?.content ?? '';

    const routingPrompt =
        `You are a model router for an AI API server. Analyze the user request and return JSON with the best model and an improved prompt.\n\n` +
        `Available models: ${availableList}\n\n` +
        `Model selection guidelines:\n` +
        `- claude-opus-4.6: complex multi-step reasoning, deep analysis, long documents, high-quality creative writing\n` +
        `- claude-sonnet-4.6: balanced general tasks, coding assistance, detailed instructions — default choice\n` +
        `- gemini-3.1-pro: general purpose with strong reasoning, large context\n` +
        `- gemini-3-flash: fast lightweight responses, simple Q&A, classification\n` +
        `- gpt-oss-120b: strong open-source model, good for general tasks\n` +
        `- For any other model, use your best judgment based on the model name.\n\n` +
        `User request:\n${lastUserMsg}\n\n` +
        `Respond ONLY with a JSON object (no markdown fences, no extra text):\n` +
        `{"model":"<chosen-family>","improvedPrompt":"<improved and detailed version of the user request>"}`;

    const metaMessages = [vscode.LanguageModelChatMessage.User(routingPrompt)];

    const routerResponse = await router.sendRequest(
        metaMessages,
        { justification: 'Auto model routing via Antigravity LLM Server' },
        token,
    );

    let routingText = '';
    for await (const chunk of routerResponse.stream) {
        const text = getChunkText(chunk);
        if (text) routingText += text;
    }

    // Strip markdown code fences if the model wrapped the JSON
    const cleaned = routingText
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '');

    let routing: { model: string; improvedPrompt: string };
    try {
        routing = JSON.parse(cleaned);
    } catch {
        throw new Error(
            `Auto router returned invalid JSON. Raw response: ${routingText.slice(0, 300)}`,
        );
    }

    const targetModel = await findModel(routing.model);
    const resolvedModel = targetModel ?? (await findModel('claude-sonnet-4.6'));
    if (!resolvedModel) {
        throw new Error(`Routed model '${routing.model}' not found and fallback unavailable`);
    }

    const selectedModelName = targetModel ? routing.model : 'claude-sonnet-4.6';
    const messages = buildImprovedMessages(ollamaMessages, routing.improvedPrompt);
    return { model: resolvedModel, messages, selectedModelName };
}

// ─── Message conversion ───────────────────────────────────────────────────────

/**
 * Replaces the last user message with an improved prompt while preserving
 * prior conversation history.
 */
function buildImprovedMessages(
    originalMessages: OllamaChatMessage[],
    improvedLastPrompt: string,
): vscode.LanguageModelChatMessage[] {
    let lastUserIdx = -1;
    for (let i = originalMessages.length - 1; i >= 0; i--) {
        if (originalMessages[i].role === 'user') {
            lastUserIdx = i;
            break;
        }
    }

    const result: vscode.LanguageModelChatMessage[] = [];
    for (let i = 0; i < originalMessages.length; i++) {
        const msg = originalMessages[i];
        if (msg.role === 'tool') continue;
        if (i === lastUserIdx) {
            result.push(vscode.LanguageModelChatMessage.User(improvedLastPrompt));
        } else if (msg.role === 'assistant') {
            result.push(vscode.LanguageModelChatMessage.Assistant(msg.content));
        } else {
            result.push(vscode.LanguageModelChatMessage.User(msg.content));
        }
    }
    return result;
}

/**
 * Converts Ollama chat messages to VS Code LM chat messages.
 * - "system" and "user" roles map to User messages
 * - "assistant" role maps to Assistant messages
 * - "tool" role is ignored (not supported by VS Code LM API)
 */
export function toVSCodeMessages(
    messages: OllamaChatMessage[],
): vscode.LanguageModelChatMessage[] {
    const result: vscode.LanguageModelChatMessage[] = [];
    for (const msg of messages) {
        if (msg.role === 'tool') {
            continue;
        }
        if (msg.role === 'assistant') {
            result.push(vscode.LanguageModelChatMessage.Assistant(msg.content));
        } else {
            result.push(vscode.LanguageModelChatMessage.User(msg.content));
        }
    }
    return result;
}

/**
 * Extracts text value from a VS Code LM stream chunk.
 * Returns undefined if the chunk is not a text part.
 */
export function getChunkText(chunk: unknown): string | undefined {
    // vscode.LanguageModelTextPart has a `value` string property
    if (chunk && typeof (chunk as { value?: unknown }).value === 'string') {
        return (chunk as { value: string }).value;
    }
    return undefined;
}

/**
 * Computes total character count across Ollama chat messages (used as a
 * rough prompt_eval_count proxy since token counts are unavailable).
 */
export function countMessageChars(messages: OllamaChatMessage[]): number {
    return messages.reduce((sum, m) => sum + m.content.length, 0);
}
