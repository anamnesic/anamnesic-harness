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
    enableAutonomousModification: boolean;
    enableDeepRetrieval: boolean;
    enableJitEngine: boolean;
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
        enableAutonomousModification: parseFlag('KAIROS_FEATURE_AUTONOMOUS', false),
        enableDeepRetrieval: parseFlag('KAIROS_FEATURE_DEEP_RETRIEVAL', true),
        enableJitEngine: parseFlag('KAIROS_FEATURE_JIT', true),
    };
}

export const featureFlags: FeatureFlags = getFlags();
