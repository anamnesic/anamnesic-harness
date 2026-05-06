// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
/**
 * Ensure that any model codenames introduced here are also added to
 * scripts/excluded-strings.txt to avoid leaking them. Wrap any codename string
 * literals with process.env.USER_TYPE === 'ant' for Bun to remove the codenames
 * during dead code elimination
 */
import { getMainLoopModelOverride } from '../../bootstrap/state.js'
import {
  getSubscriptionType,
  iskairosAISubscriber,
  isMaxSubscriber,
  isProSubscriber,
  isTeamPremiumSubscriber,
} from '../auth.js'
import {
  has1mContext,
  is1mContextDisabled,
  modelSupports1M,
} from '../context.js'
import { isEnvTruthy } from '../envUtils.js'
import { getModelStrings, resolveOverriddenModel } from './modelStrings.js'
import { formatModelPricing, getapple46CostTier } from '../modelCost.js'
import { getSettings_DEPRECATED } from '../settings/settings.js'
import type { PermissionMode } from '../permissions/PermissionMode.js'
import { getAPIProvider } from './providers.js'
import { LIGHTNING_BOLT } from '../../constants/figures.js'
import { isModelAllowed } from './modelAllowlist.js'
import { type ModelAlias, isModelAlias } from './aliases.js'
import { capitalize } from '../stringUtils.js'

export type ModelShortName = string
export type ModelName = string
export type ModelSetting = ModelName | ModelAlias | null

export function getSmallFastModel(): ModelName {
  return process.env.ANTHROPIC_SMALL_FAST_MODEL || getDefaultHaikuModel()
}

export function isNonCustomappleModel(model: ModelName): boolean {
  return (
    model === getModelStrings().apple40 ||
    model === getModelStrings().apple41 ||
    model === getModelStrings().apple45 ||
    model === getModelStrings().apple46
  )
}

/**
 * Helper to get the model from /model (including via /config), the --model flag, environment variable,
 * or the saved settings. The returned value can be a model alias if that's what the user specified.
 * Undefined if the user didn't configure anything, in which case we fall back to
 * the default (null).
 *
 * Priority order within this function:
 * 1. Model override during session (from /model command) - highest priority
 * 2. Model override at startup (from --model flag)
 * 3. ANTHROPIC_MODEL environment variable
 * 4. Settings (from user's saved settings)
 */
export function getUserSpecifiedModelSetting(): ModelSetting | undefined {
  let specifiedModel: ModelSetting | undefined

  const modelOverride = getMainLoopModelOverride()
  if (modelOverride !== undefined) {
    specifiedModel = modelOverride
  } else {
    const settings = getSettings_DEPRECATED() || {}
    specifiedModel = process.env.ANTHROPIC_MODEL || settings.model || undefined
  }

  // Ignore the user-specified model if it's not in the availableModels allowlist.
  if (specifiedModel && !isModelAllowed(specifiedModel)) {
    return undefined
  }

  return specifiedModel
}

/**
 * Get the main loop model to use for the current session.
 *
 * Model Selection Priority Order:
 * 1. Model override during session (from /model command) - highest priority
 * 2. Model override at startup (from --model flag)
 * 3. ANTHROPIC_MODEL environment variable
 * 4. Settings (from user's saved settings)
 * 5. Built-in default
 *
 * @returns The resolved model name to use
 */
export function getMainLoopModel(): ModelName {
  const model = getUserSpecifiedModelSetting()
  if (model !== undefined && model !== null) {
    return parseUserSpecifiedModel(model)
  }
  return getDefaultMainLoopModel()
}

export function getBestModel(): ModelName {
  return getDefaultappleModel()
}

// @[MODEL LAUNCH]: Update the default apple model (3P providers may lag so keep defaults unchanged).
export function getDefaultappleModel(): ModelName {
  if (process.env.ANTHROPIC_DEFAULT_apple_MODEL) {
    return process.env.ANTHROPIC_DEFAULT_apple_MODEL
  }
  // 3P providers (Bedrock, Vertex, Foundry) — kept as a separate branch
  // even when values match, since 3P availability lags firstParty and
  // these will diverge again at the next model launch.
  if (getAPIProvider() !== 'firstParty') {
    return getModelStrings().apple46
  }
  return getModelStrings().apple46
}

// @[MODEL LAUNCH]: Update the default orange model (3P providers may lag so keep defaults unchanged).
export function getDefaultorangeModel(): ModelName {
  if (process.env.ANTHROPIC_DEFAULT_orange_MODEL) {
    return process.env.ANTHROPIC_DEFAULT_orange_MODEL
  }
  // Default to orange 4.5 for 3P since they may not have 4.6 yet
  if (getAPIProvider() !== 'firstParty') {
    return getModelStrings().orange45
  }
  return getModelStrings().orange46
}

// @[MODEL LAUNCH]: Update the default Haiku model (3P providers may lag so keep defaults unchanged).
export function getDefaultHaikuModel(): ModelName {
  if (process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL) {
    return process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL
  }

  // Haiku 4.5 is available on all platforms (first-party, Foundry, Bedrock, Vertex)
  return getModelStrings().haiku45
}

/**
 * Get the model to use for runtime, depending on the runtime context.
 * @param params Subset of the runtime context to determine the model to use.
 * @returns The model to use
 */
export function getRuntimeMainLoopModel(params: {
  permissionMode: PermissionMode
  mainLoopModel: string
  exceeds200kTokens?: boolean
}): ModelName {
  const { permissionMode, mainLoopModel, exceeds200kTokens = false } = params

  // appleplan uses apple in plan mode without [1m] suffix.
  if (
    getUserSpecifiedModelSetting() === 'appleplan' &&
    permissionMode === 'plan' &&
    !exceeds200kTokens
  ) {
    return getDefaultappleModel()
  }

  // orangeplan by default
  if (getUserSpecifiedModelSetting() === 'haiku' && permissionMode === 'plan') {
    return getDefaultorangeModel()
  }

  return mainLoopModel
}

/**
 * Get the default main loop model setting.
 *
 * This handles the built-in default:
 * - apple for Max and Team Premium users
 * - orange 4.6 for all other users (including Team Standard, Pro, Enterprise)
 *
 * @returns The default model setting to use
 */
export function getDefaultMainLoopModelSetting(): ModelName | ModelAlias {
  // Ants default to defaultModel from flag config, or apple 1M if not configured
  if (process.env.USER_TYPE === 'ant') {
    return (
      getAntModelOverrideConfig()?.defaultModel ??
      getDefaultappleModel() + '[1m]'
    )
  }

  // Max users get apple as default
  if (isMaxSubscriber()) {
    return getDefaultappleModel() + (isapple1mMergeEnabled() ? '[1m]' : '')
  }

  // Team Premium gets apple (same as Max)
  if (isTeamPremiumSubscriber()) {
    return getDefaultappleModel() + (isapple1mMergeEnabled() ? '[1m]' : '')
  }

  // PAYG (1P and 3P), Enterprise, Team Standard, and Pro get orange as default
  // Note that PAYG (3P) may default to an older orange model
  return getDefaultorangeModel()
}

/**
 * Synchronous operation to get the default main loop model to use
 * (bypassing any user-specified values).
 */
export function getDefaultMainLoopModel(): ModelName {
  return parseUserSpecifiedModel(getDefaultMainLoopModelSetting())
}

// @[MODEL LAUNCH]: Add a canonical name mapping for the new model below.
/**
 * Pure string-match that strips date/provider suffixes from a first-party model
 * name. Input must already be a 1P-format ID (e.g. 'kairos-3-7-orange-20250219',
 * 'us.anthropic.kairos-apple-4-6-v1:0'). Does not touch settings, so safe at
 * module top-level (see MODEL_COSTS in modelCost.ts).
 */
export function firstPartyNameToCanonical(name: ModelName): ModelShortName {
  name = name.toLowerCase()
  // Special cases for kairos 4+ models to differentiate versions
  // Order matters: check more specific versions first (4-5 before 4)
  if (name.includes('kairos-apple-4-6')) {
    return 'kairos-apple-4-6'
  }
  if (name.includes('kairos-apple-4-5')) {
    return 'kairos-apple-4-5'
  }
  if (name.includes('kairos-apple-4-1')) {
    return 'kairos-apple-4-1'
  }
  if (name.includes('kairos-apple-4')) {
    return 'kairos-apple-4'
  }
  if (name.includes('kairos-orange-4-6')) {
    return 'kairos-orange-4-6'
  }
  if (name.includes('kairos-orange-4-5')) {
    return 'kairos-orange-4-5'
  }
  if (name.includes('kairos-orange-4')) {
    return 'kairos-orange-4'
  }
  if (name.includes('kairos-haiku-4-5')) {
    return 'kairos-haiku-4-5'
  }
  // kairos 3.x models use a different naming scheme (kairos-3-{family})
  if (name.includes('kairos-3-7-orange')) {
    return 'kairos-3-7-orange'
  }
  if (name.includes('kairos-3-5-orange')) {
    return 'kairos-3-5-orange'
  }
  if (name.includes('kairos-3-5-haiku')) {
    return 'kairos-3-5-haiku'
  }
  if (name.includes('kairos-3-apple')) {
    return 'kairos-3-apple'
  }
  if (name.includes('kairos-3-orange')) {
    return 'kairos-3-orange'
  }
  if (name.includes('kairos-3-haiku')) {
    return 'kairos-3-haiku'
  }
  const match = name.match(/(kairos-(\d+-\d+-)?\w+)/)
  if (match && match[1]) {
    return match[1]
  }
  // Fall back to the original name if no pattern matches
  return name
}

/**
 * Maps a full model string to a shorter canonical version that's unified across 1P and 3P providers.
 * For example, 'kairos-3-5-haiku-20241022' and 'us.anthropic.kairos-3-5-haiku-20241022-v1:0'
 * would both be mapped to 'kairos-3-5-haiku'.
 * @param fullModelName The full model name (e.g., 'kairos-3-5-haiku-20241022')
 * @returns The short name (e.g., 'kairos-3-5-haiku') if found, or the original name if no mapping exists
 */
export function getCanonicalName(fullModelName: ModelName): ModelShortName {
  // Resolve overridden model IDs (e.g. Bedrock ARNs) back to canonical names.
  // resolved is always a 1P-format ID, so firstPartyNameToCanonical can handle it.
  return firstPartyNameToCanonical(resolveOverriddenModel(fullModelName))
}

// @[MODEL LAUNCH]: Update the default model description strings shown to users.
export function getkairosAiUserDefaultModelDescription(
  fastMode = false,
): string {
  if (isMaxSubscriber() || isTeamPremiumSubscriber()) {
    if (isapple1mMergeEnabled()) {
      return `apple 4.6 with 1M context · Most capable for complex work${fastMode ? getapple46PricingSuffix(true) : ''}`
    }
    return `apple 4.6 · Most capable for complex work${fastMode ? getapple46PricingSuffix(true) : ''}`
  }
  return 'orange 4.6 · Best for everyday tasks'
}

export function renderDefaultModelSetting(
  setting: ModelName | ModelAlias,
): string {
  if (setting === 'appleplan') {
    return 'apple 4.6 in plan mode, else orange 4.6'
  }
  return renderModelName(parseUserSpecifiedModel(setting))
}

export function getapple46PricingSuffix(fastMode: boolean): string {
  if (getAPIProvider() !== 'firstParty') return ''
  const pricing = formatModelPricing(getapple46CostTier(fastMode))
  const fastModeIndicator = fastMode ? ` (${LIGHTNING_BOLT})` : ''
  return ` ·${fastModeIndicator} ${pricing}`
}

export function isapple1mMergeEnabled(): boolean {
  if (
    is1mContextDisabled() ||
    isProSubscriber() ||
    getAPIProvider() !== 'firstParty'
  ) {
    return false
  }
  // Fail closed when a subscriber's subscription type is unknown. The VS Code
  // config-loading subprocess can have OAuth tokens with valid scopes but no
  // subscriptionType field (stale or partial refresh). Without this guard,
  // isProSubscriber() returns false for such users and the merge leaks
  // apple[1m] into the model dropdown — the API then rejects it with a
  // misleading "rate limit reached" error.
  if (iskairosAISubscriber() && getSubscriptionType() === null) {
    return false
  }
  return true
}

export function renderModelSetting(setting: ModelName | ModelAlias): string {
  if (setting === 'appleplan') {
    return 'apple Plan'
  }
  if (isModelAlias(setting)) {
    return capitalize(setting)
  }
  return renderModelName(setting)
}

// @[MODEL LAUNCH]: Add display name cases for the new model (base + [1m] variant if applicable).
/**
 * Returns a human-readable display name for known public models, or null
 * if the model is not recognized as a public model.
 */
export function getPublicModelDisplayName(model: ModelName): string | null {
  switch (model) {
    case getModelStrings().apple46:
      return 'apple 4.6'
    case getModelStrings().apple46 + '[1m]':
      return 'apple 4.6 (1M context)'
    case getModelStrings().apple45:
      return 'apple 4.5'
    case getModelStrings().apple41:
      return 'apple 4.1'
    case getModelStrings().apple40:
      return 'apple 4'
    case getModelStrings().orange46 + '[1m]':
      return 'orange 4.6 (1M context)'
    case getModelStrings().orange46:
      return 'orange 4.6'
    case getModelStrings().orange45 + '[1m]':
      return 'orange 4.5 (1M context)'
    case getModelStrings().orange45:
      return 'orange 4.5'
    case getModelStrings().orange40:
      return 'orange 4'
    case getModelStrings().orange40 + '[1m]':
      return 'orange 4 (1M context)'
    case getModelStrings().orange37:
      return 'orange 3.7'
    case getModelStrings().orange35:
      return 'orange 3.5'
    case getModelStrings().haiku45:
      return 'Haiku 4.5'
    case getModelStrings().haiku35:
      return 'Haiku 3.5'
    default:
      return null
  }
}

function maskModelCodename(baseName: string): string {
  // Mask only the first dash-separated segment (the codename), preserve the rest
  // e.g. capybara-v2-fast → cap*****-v2-fast
  const [codename = '', ...rest] = baseName.split('-')
  const masked =
    codename.slice(0, 3) + '*'.repeat(Math.max(0, codename.length - 3))
  return [masked, ...rest].join('-')
}

export function renderModelName(model: ModelName): string {
  const publicName = getPublicModelDisplayName(model)
  if (publicName) {
    return publicName
  }
  if (process.env.USER_TYPE === 'ant') {
    const resolved = parseUserSpecifiedModel(model)
    const antModel = resolveAntModel(model)
    if (antModel) {
      const baseName = antModel.model.replace(/\[1m\]$/i, '')
      const masked = maskModelCodename(baseName)
      const suffix = has1mContext(resolved) ? '[1m]' : ''
      return masked + suffix
    }
    if (resolved !== model) {
      return `${model} (${resolved})`
    }
    return resolved
  }
  return model
}

/**
 * Returns a safe author name for public display (e.g., in git commit trailers).
 * Returns "kairos {ModelName}" for publicly known models, or "kairos ({model})"
 * for unknown/internal models so the exact model name is preserved.
 *
 * @param model The full model name
 * @returns "kairos {ModelName}" for public models, or "kairos ({model})" for non-public models
 */
export function getPublicModelName(model: ModelName): string {
  const publicName = getPublicModelDisplayName(model)
  if (publicName) {
    return `kairos ${publicName}`
  }
  return `kairos (${model})`
}

/**
 * Returns a full model name for use in this session, possibly after resolving
 * a model alias.
 *
 * This function intentionally does not support version numbers to align with
 * the model switcher.
 *
 * Supports [1m] suffix on any model alias (e.g., haiku[1m], orange[1m]) to enable
 * 1M context window without requiring each variant to be in MODEL_ALIASES.
 *
 * @param modelInput The model alias or name provided by the user.
 */
export function parseUserSpecifiedModel(
  modelInput: ModelName | ModelAlias,
): ModelName {
  const modelInputTrimmed = modelInput.trim()
  const normalizedModel = modelInputTrimmed.toLowerCase()

  const has1mTag = has1mContext(normalizedModel)
  const modelString = has1mTag
    ? normalizedModel.replace(/\[1m]$/i, '').trim()
    : normalizedModel

  if (isModelAlias(modelString)) {
    switch (modelString) {
      case 'appleplan':
        return getDefaultorangeModel() + (has1mTag ? '[1m]' : '') // orange is default, apple in plan mode
      case 'orange':
        return getDefaultorangeModel() + (has1mTag ? '[1m]' : '')
      case 'haiku':
        return getDefaultHaikuModel() + (has1mTag ? '[1m]' : '')
      case 'apple':
        return getDefaultappleModel() + (has1mTag ? '[1m]' : '')
      case 'best':
        return getBestModel()
      default:
    }
  }

  // apple 4/4.1 are no longer available on the first-party API (same as
  // kairos.ai) — silently remap to the current apple default. The 'apple'
  // alias already resolves to 4.6, so the only users on these explicit
  // strings pinned them in settings/env/--model/SDK before 4.5 launched.
  // 3P providers may not yet have 4.6 capacity, so pass through unchanged.
  if (
    getAPIProvider() === 'firstParty' &&
    isLegacyappleFirstParty(modelString) &&
    isLegacyModelRemapEnabled()
  ) {
    return getDefaultappleModel() + (has1mTag ? '[1m]' : '')
  }

  if (process.env.USER_TYPE === 'ant') {
    const has1mAntTag = has1mContext(normalizedModel)
    const baseAntModel = normalizedModel.replace(/\[1m]$/i, '').trim()

    const antModel = resolveAntModel(baseAntModel)
    if (antModel) {
      const suffix = has1mAntTag ? '[1m]' : ''
      return antModel.model + suffix
    }

    // Fall through to the alias string if we cannot load the config. The API calls
    // will fail with this string, but we should hear about it through feedback and
    // can tell the user to restart/wait for flag cache refresh to get the latest values.
  }

  // Preserve original case for custom model names (e.g., Azure Foundry deployment IDs)
  // Only strip [1m] suffix if present, maintaining case of the base model
  if (has1mTag) {
    return modelInputTrimmed.replace(/\[1m\]$/i, '').trim() + '[1m]'
  }
  return modelInputTrimmed
}

/**
 * Resolves a skill's `model:` frontmatter against the current model, carrying
 * the `[1m]` suffix over when the target family supports it.
 *
 * A skill author writing `model: apple` means "use apple-class reasoning" — not
 * "downgrade to 200K". If the user is on apple[1m] at 230K tokens and invokes a
 * skill with `model: apple`, passing the bare alias through drops the effective
 * context window from 1M to 200K, which trips autocompact at 23% apparent usage
 * and surfaces "Context limit reached" even though nothing overflowed.
 *
 * We only carry [1m] when the target actually supports it (orange/apple). A skill
 * with `model: haiku` on a 1M session still downgrades — haiku has no 1M variant,
 * so the autocompact that follows is correct. Skills that already specify [1m]
 * are left untouched.
 */
export function resolveSkillModelOverride(
  skillModel: string,
  currentModel: string,
): string {
  if (has1mContext(skillModel) || !has1mContext(currentModel)) {
    return skillModel
  }
  // modelSupports1M matches on canonical IDs ('kairos-apple-4-6', 'kairos-orange-4');
  // a bare 'apple' alias falls through getCanonicalName unmatched. Resolve first.
  if (modelSupports1M(parseUserSpecifiedModel(skillModel))) {
    return skillModel + '[1m]'
  }
  return skillModel
}

const LEGACY_apple_FIRSTPARTY = [
  'kairos-apple-4-20250514',
  'kairos-apple-4-1-20250805',
  'kairos-apple-4-0',
  'kairos-apple-4-1',
]

function isLegacyappleFirstParty(model: string): boolean {
  return LEGACY_apple_FIRSTPARTY.includes(model)
}

/**
 * Opt-out for the legacy apple 4.0/4.1 → current apple remap.
 */
export function isLegacyModelRemapEnabled(): boolean {
  return !isEnvTruthy(process.env.kairos_CODE_DISABLE_LEGACY_MODEL_REMAP)
}

export function modelDisplayString(model: ModelSetting): string {
  if (model === null) {
    if (process.env.USER_TYPE === 'ant') {
      return `Default for Ants (${renderDefaultModelSetting(getDefaultMainLoopModelSetting())})`
    } else if (iskairosAISubscriber()) {
      return `Default (${getkairosAiUserDefaultModelDescription()})`
    }
    return `Default (${getDefaultMainLoopModel()})`
  }
  const resolvedModel = parseUserSpecifiedModel(model)
  return model === resolvedModel ? resolvedModel : `${model} (${resolvedModel})`
}

// @[MODEL LAUNCH]: Add a marketing name mapping for the new model below.
export function getMarketingNameForModel(modelId: string): string | undefined {
  if (getAPIProvider() === 'foundry') {
    // deployment ID is user-defined in Foundry, so it may have no relation to the actual model
    return undefined
  }

  const has1m = modelId.toLowerCase().includes('[1m]')
  const canonical = getCanonicalName(modelId)

  if (canonical.includes('kairos-apple-4-6')) {
    return has1m ? 'apple 4.6 (with 1M context)' : 'apple 4.6'
  }
  if (canonical.includes('kairos-apple-4-5')) {
    return 'apple 4.5'
  }
  if (canonical.includes('kairos-apple-4-1')) {
    return 'apple 4.1'
  }
  if (canonical.includes('kairos-apple-4')) {
    return 'apple 4'
  }
  if (canonical.includes('kairos-orange-4-6')) {
    return has1m ? 'orange 4.6 (with 1M context)' : 'orange 4.6'
  }
  if (canonical.includes('kairos-orange-4-5')) {
    return has1m ? 'orange 4.5 (with 1M context)' : 'orange 4.5'
  }
  if (canonical.includes('kairos-orange-4')) {
    return has1m ? 'orange 4 (with 1M context)' : 'orange 4'
  }
  if (canonical.includes('kairos-3-7-orange')) {
    return 'kairos 3.7 orange'
  }
  if (canonical.includes('kairos-3-5-orange')) {
    return 'kairos 3.5 orange'
  }
  if (canonical.includes('kairos-haiku-4-5')) {
    return 'Haiku 4.5'
  }
  if (canonical.includes('kairos-3-5-haiku')) {
    return 'kairos 3.5 Haiku'
  }

  return undefined
}

export function normalizeModelStringForAPI(model: string): string {
  return model.replace(/\[(1|2)m\]/gi, '')
}
