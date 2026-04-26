/**
 * Kairos model catalog.
 * Ported from packages/cowork/src/stores/settings.ts
 */

export interface ModelInfo {
    id: string;
    name: string;
    description: string;
    provider: string;
    baseUrl: string;
    group: 'auto' | 'recommended' | 'other';
}

/**
 * Runtime-populated catalog.
 * Intentionally starts empty to avoid hardcoded model lists.
 */
export let AVAILABLE_MODELS: ModelInfo[] = [];

/**
 * Replace the model catalog at runtime.
 */
export function setAvailableModels(models: ModelInfo[]): void {
    AVAILABLE_MODELS = [...models];
}

/**
 * Get model metadata by id. Returns undefined if not in catalog.
 */
export function getModelInfo(id: string): ModelInfo | undefined {
    return AVAILABLE_MODELS.find(m => m.id === id);
}

/**
 * Get the default base URL for a model.
 */
export function getDefaultBaseUrl(id: string): string {
    return getModelInfo(id)?.baseUrl ?? 'http://localhost:11434';
}

/**
 * Whether the model uses the OpenAI Responses API (`/v1/responses`).
 * True for GPT-5 series.
 */
export function usesResponsesApi(id: string): boolean {
    const lower = id.toLowerCase();
    return lower.startsWith('gpt-5') || /^gpt-5[\.-]/.test(lower);
}

/**
 * Get the provider id for a given model id.
 */
export function getProviderFromModel(id: string): string {
    return getModelInfo(id)?.provider ?? 'anthropic';
}

/**
 * All models in a given group.
 */
export function getModelsByGroup(group: ModelInfo['group']): ModelInfo[] {
    return AVAILABLE_MODELS.filter(m => m.group === group);
}

/**
 * The default model id.
 */
export const DEFAULT_MODEL = 'auto';
