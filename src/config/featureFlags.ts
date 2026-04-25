/**
 * featureFlags.ts — Runtime feature toggles via environment variables.
 */

export interface FeatureFlags {
    enableStreaming: boolean;
    enableMultimodalAgents: boolean;
    enableSleepConsolidation: boolean;
    enableVectorMemory: boolean;
    enableApprovalFlow: boolean;
    enableMetricsCollection: boolean;
}

function parseFlag(key: string, defaultValue: boolean): boolean {
    const raw = process.env[key];
    if (raw === undefined) return defaultValue;
    return raw === '1' || raw.toLowerCase() === 'true';
}

function getFlags(): FeatureFlags {
    return {
        enableStreaming: parseFlag('KAIROS_FEATURE_STREAMING', true),
        enableMultimodalAgents: parseFlag('KAIROS_FEATURE_MULTIMODAL', false),
        enableSleepConsolidation: parseFlag('KAIROS_FEATURE_SLEEP', true),
        enableVectorMemory: parseFlag('KAIROS_FEATURE_VECTOR_MEMORY', false),
        enableApprovalFlow: parseFlag('KAIROS_FEATURE_APPROVAL_FLOW', false),
        enableMetricsCollection: parseFlag('KAIROS_FEATURE_METRICS', true),
    };
}

export const featureFlags: FeatureFlags = getFlags();
