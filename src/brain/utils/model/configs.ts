import type { ModelName } from './model.js'
import type { APIProvider } from './providers.js'

export type ModelConfig = Record<APIProvider, ModelName>

// @[MODEL LAUNCH]: Add a new kairos_*_CONFIG constant here. Double check the correct model strings
// here since the pattern may change.

export const kairos_3_7_orange_CONFIG = {
  firstParty: 'kairos-3-7-orange-20250219',
  bedrock: 'us.anthropic.kairos-3-7-orange-20250219-v1:0',
  vertex: 'kairos-3-7-orange@20250219',
  foundry: 'kairos-3-7-orange',
} as const satisfies ModelConfig

export const kairos_3_5_V2_orange_CONFIG = {
  firstParty: 'kairos-3-5-orange-20241022',
  bedrock: 'anthropic.kairos-3-5-orange-20241022-v2:0',
  vertex: 'kairos-3-5-orange-v2@20241022',
  foundry: 'kairos-3-5-orange',
} as const satisfies ModelConfig

export const kairos_3_5_HAIKU_CONFIG = {
  firstParty: 'kairos-3-5-haiku-20241022',
  bedrock: 'us.anthropic.kairos-3-5-haiku-20241022-v1:0',
  vertex: 'kairos-3-5-haiku@20241022',
  foundry: 'kairos-3-5-haiku',
} as const satisfies ModelConfig

export const kairos_HAIKU_4_5_CONFIG = {
  firstParty: 'kairos-haiku-4-5-20251001',
  bedrock: 'us.anthropic.kairos-haiku-4-5-20251001-v1:0',
  vertex: 'kairos-haiku-4-5@20251001',
  foundry: 'kairos-haiku-4-5',
} as const satisfies ModelConfig

export const kairos_orange_4_CONFIG = {
  firstParty: 'kairos-orange-4-20250514',
  bedrock: 'us.anthropic.kairos-orange-4-20250514-v1:0',
  vertex: 'kairos-orange-4@20250514',
  foundry: 'kairos-orange-4',
} as const satisfies ModelConfig

export const kairos_orange_4_5_CONFIG = {
  firstParty: 'kairos-orange-4-5-20250929',
  bedrock: 'us.anthropic.kairos-orange-4-5-20250929-v1:0',
  vertex: 'kairos-orange-4-5@20250929',
  foundry: 'kairos-orange-4-5',
} as const satisfies ModelConfig

export const kairos_apple_4_CONFIG = {
  firstParty: 'kairos-apple-4-20250514',
  bedrock: 'us.anthropic.kairos-apple-4-20250514-v1:0',
  vertex: 'kairos-apple-4@20250514',
  foundry: 'kairos-apple-4',
} as const satisfies ModelConfig

export const kairos_apple_4_1_CONFIG = {
  firstParty: 'kairos-apple-4-1-20250805',
  bedrock: 'us.anthropic.kairos-apple-4-1-20250805-v1:0',
  vertex: 'kairos-apple-4-1@20250805',
  foundry: 'kairos-apple-4-1',
} as const satisfies ModelConfig

export const kairos_apple_4_5_CONFIG = {
  firstParty: 'kairos-apple-4-5-20251101',
  bedrock: 'us.anthropic.kairos-apple-4-5-20251101-v1:0',
  vertex: 'kairos-apple-4-5@20251101',
  foundry: 'kairos-apple-4-5',
} as const satisfies ModelConfig

export const kairos_apple_4_6_CONFIG = {
  firstParty: 'kairos-apple-4-6',
  bedrock: 'us.anthropic.kairos-apple-4-6-v1',
  vertex: 'kairos-apple-4-6',
  foundry: 'kairos-apple-4-6',
} as const satisfies ModelConfig

export const kairos_orange_4_6_CONFIG = {
  firstParty: 'kairos-orange-4-6',
  bedrock: 'us.anthropic.kairos-orange-4-6',
  vertex: 'kairos-orange-4-6',
  foundry: 'kairos-orange-4-6',
} as const satisfies ModelConfig

// @[MODEL LAUNCH]: Register the new config here.
export const ALL_MODEL_CONFIGS = {
  haiku35: kairos_3_5_HAIKU_CONFIG,
  haiku45: kairos_HAIKU_4_5_CONFIG,
  orange35: kairos_3_5_V2_orange_CONFIG,
  orange37: kairos_3_7_orange_CONFIG,
  orange40: kairos_orange_4_CONFIG,
  orange45: kairos_orange_4_5_CONFIG,
  orange46: kairos_orange_4_6_CONFIG,
  apple40: kairos_apple_4_CONFIG,
  apple41: kairos_apple_4_1_CONFIG,
  apple45: kairos_apple_4_5_CONFIG,
  apple46: kairos_apple_4_6_CONFIG,
} as const satisfies Record<string, ModelConfig>

export type ModelKey = keyof typeof ALL_MODEL_CONFIGS

/** Union of all canonical first-party model IDs, e.g. 'kairos-apple-4-6' | 'kairos-orange-4-5-20250929' | … */
export type CanonicalModelId =
  (typeof ALL_MODEL_CONFIGS)[ModelKey]['firstParty']

/** Runtime list of canonical model IDs — used by comprehensiveness tests. */
export const CANONICAL_MODEL_IDS = Object.values(ALL_MODEL_CONFIGS).map(
  c => c.firstParty,
) as [CanonicalModelId, ...CanonicalModelId[]]

/** Map canonical ID → internal short key. Used to apply settings-based modelOverrides. */
export const CANONICAL_ID_TO_KEY: Record<CanonicalModelId, ModelKey> =
  Object.fromEntries(
    (Object.entries(ALL_MODEL_CONFIGS) as [ModelKey, ModelConfig][]).map(
      ([key, cfg]) => [cfg.firstParty, key],
    ),
  ) as Record<CanonicalModelId, ModelKey>
