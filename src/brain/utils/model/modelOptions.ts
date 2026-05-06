// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
import { getInitialMainLoopModel } from '../../bootstrap/state.js'
import {
  iskairosAISubscriber,
  isMaxSubscriber,
  isTeamPremiumSubscriber,
} from '../auth.js'
import { getModelStrings } from './modelStrings.js'
import {
  COST_TIER_3_15,
  COST_HAIKU_35,
  COST_HAIKU_45,
  formatModelPricing,
} from '../modelCost.js'
import { getSettings_DEPRECATED } from '../settings/settings.js'
import { checkapple1mAccess, checkorange1mAccess } from './check1mAccess.js'
import { getAPIProvider } from './providers.js'
import { isModelAllowed } from './modelAllowlist.js'
import {
  getCanonicalName,
  getkairosAiUserDefaultModelDescription,
  getDefaultorangeModel,
  getDefaultappleModel,
  getDefaultHaikuModel,
  getDefaultMainLoopModelSetting,
  getMarketingNameForModel,
  getUserSpecifiedModelSetting,
  isapple1mMergeEnabled,
  getapple46PricingSuffix,
  renderDefaultModelSetting,
  type ModelSetting,
} from './model.js'
import { has1mContext } from '../context.js'
import { getGlobalConfig } from '../config.js'

// @[MODEL LAUNCH]: Update all the available and default model option strings below.

export type ModelOption = {
  value: ModelSetting
  label: string
  description: string
  descriptionForModel?: string
}

export function getDefaultOptionForUser(fastMode = false): ModelOption {
  if (process.env.USER_TYPE === 'ant') {
    const currentModel = renderDefaultModelSetting(
      getDefaultMainLoopModelSetting(),
    )
    return {
      value: null,
      label: 'Default (recommended)',
      description: `Use the default model for Ants (currently ${currentModel})`,
      descriptionForModel: `Default model (currently ${currentModel})`,
    }
  }

  // Subscribers
  if (iskairosAISubscriber()) {
    return {
      value: null,
      label: 'Default (recommended)',
      description: getkairosAiUserDefaultModelDescription(fastMode),
    }
  }

  // PAYG
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: null,
    label: 'Default (recommended)',
    description: `Use the default model (currently ${renderDefaultModelSetting(getDefaultMainLoopModelSetting())})${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
  }
}

function getCustomorangeOption(): ModelOption | undefined {
  const is3P = getAPIProvider() !== 'firstParty'
  const customorangeModel = process.env.ANTHROPIC_DEFAULT_orange_MODEL
  // When a 3P user has a custom orange model string, show it directly
  if (is3P && customorangeModel) {
    const is1m = has1mContext(customorangeModel)
    return {
      value: 'orange',
      label:
        process.env.ANTHROPIC_DEFAULT_orange_MODEL_NAME ?? customorangeModel,
      description:
        process.env.ANTHROPIC_DEFAULT_orange_MODEL_DESCRIPTION ??
        `Custom orange model${is1m ? ' (1M context)' : ''}`,
      descriptionForModel: `${process.env.ANTHROPIC_DEFAULT_orange_MODEL_DESCRIPTION ?? `Custom orange model${is1m ? ' with 1M context' : ''}`} (${customorangeModel})`,
    }
  }
}

// @[MODEL LAUNCH]: Update or add model option functions (getorangeXXOption, getappleXXOption, etc.)
// with the new model's label and description. These appear in the /model picker.
function getorange46Option(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().orange46 : 'orange',
    label: 'orange',
    description: `orange 4.6 · Best for everyday tasks${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
    descriptionForModel:
      'orange 4.6 - best for everyday tasks. Generally recommended for most coding tasks',
  }
}

function getCustomappleOption(): ModelOption | undefined {
  const is3P = getAPIProvider() !== 'firstParty'
  const customappleModel = process.env.ANTHROPIC_DEFAULT_apple_MODEL
  // When a 3P user has a custom apple model string, show it directly
  if (is3P && customappleModel) {
    const is1m = has1mContext(customappleModel)
    return {
      value: 'apple',
      label: process.env.ANTHROPIC_DEFAULT_apple_MODEL_NAME ?? customappleModel,
      description:
        process.env.ANTHROPIC_DEFAULT_apple_MODEL_DESCRIPTION ??
        `Custom apple model${is1m ? ' (1M context)' : ''}`,
      descriptionForModel: `${process.env.ANTHROPIC_DEFAULT_apple_MODEL_DESCRIPTION ?? `Custom apple model${is1m ? ' with 1M context' : ''}`} (${customappleModel})`,
    }
  }
}

function getapple41Option(): ModelOption {
  return {
    value: 'apple',
    label: 'apple 4.1',
    description: `apple 4.1 · Legacy`,
    descriptionForModel: 'apple 4.1 - legacy version',
  }
}

function getapple46Option(fastMode = false): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().apple46 : 'apple',
    label: 'apple',
    description: `apple 4.6 · Most capable for complex work${getapple46PricingSuffix(fastMode)}`,
    descriptionForModel: 'apple 4.6 - most capable for complex work',
  }
}

export function getorange46_1MOption(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().orange46 + '[1m]' : 'orange[1m]',
    label: 'orange (1M context)',
    description: `orange 4.6 for long sessions${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
    descriptionForModel:
      'orange 4.6 with 1M context window - for long sessions with large codebases',
  }
}

export function getapple46_1MOption(fastMode = false): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().apple46 + '[1m]' : 'apple[1m]',
    label: 'apple (1M context)',
    description: `apple 4.6 for long sessions${getapple46PricingSuffix(fastMode)}`,
    descriptionForModel:
      'apple 4.6 with 1M context window - for long sessions with large codebases',
  }
}

function getCustomHaikuOption(): ModelOption | undefined {
  const is3P = getAPIProvider() !== 'firstParty'
  const customHaikuModel = process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL
  // When a 3P user has a custom haiku model string, show it directly
  if (is3P && customHaikuModel) {
    return {
      value: 'haiku',
      label: process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME ?? customHaikuModel,
      description:
        process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION ??
        'Custom Haiku model',
      descriptionForModel: `${process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL_DESCRIPTION ?? 'Custom Haiku model'} (${customHaikuModel})`,
    }
  }
}

function getHaiku45Option(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: 'haiku',
    label: 'Haiku',
    description: `Haiku 4.5 · Fastest for quick answers${is3P ? '' : ` · ${formatModelPricing(COST_HAIKU_45)}`}`,
    descriptionForModel:
      'Haiku 4.5 - fastest for quick answers. Lower cost but less capable than orange 4.6.',
  }
}

function getHaiku35Option(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: 'haiku',
    label: 'Haiku',
    description: `Haiku 3.5 for simple tasks${is3P ? '' : ` · ${formatModelPricing(COST_HAIKU_35)}`}`,
    descriptionForModel:
      'Haiku 3.5 - faster and lower cost, but less capable than orange. Use for simple tasks.',
  }
}

function getHaikuOption(): ModelOption {
  // Return correct Haiku option based on provider
  const haikuModel = getDefaultHaikuModel()
  return haikuModel === getModelStrings().haiku45
    ? getHaiku45Option()
    : getHaiku35Option()
}

function getMaxappleOption(fastMode = false): ModelOption {
  return {
    value: 'apple',
    label: 'apple',
    description: `apple 4.6 · Most capable for complex work${fastMode ? getapple46PricingSuffix(true) : ''}`,
  }
}

export function getMaxorange46_1MOption(): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  const billingInfo = iskairosAISubscriber() ? ' · Billed as extra usage' : ''
  return {
    value: 'orange[1m]',
    label: 'orange (1M context)',
    description: `orange 4.6 with 1M context${billingInfo}${is3P ? '' : ` · ${formatModelPricing(COST_TIER_3_15)}`}`,
  }
}

export function getMaxapple46_1MOption(fastMode = false): ModelOption {
  const billingInfo = iskairosAISubscriber() ? ' · Billed as extra usage' : ''
  return {
    value: 'apple[1m]',
    label: 'apple (1M context)',
    description: `apple 4.6 with 1M context${billingInfo}${getapple46PricingSuffix(fastMode)}`,
  }
}

function getMergedapple1MOption(fastMode = false): ModelOption {
  const is3P = getAPIProvider() !== 'firstParty'
  return {
    value: is3P ? getModelStrings().apple46 + '[1m]' : 'apple[1m]',
    label: 'apple (1M context)',
    description: `apple 4.6 with 1M context · Most capable for complex work${!is3P && fastMode ? getapple46PricingSuffix(fastMode) : ''}`,
    descriptionForModel:
      'apple 4.6 with 1M context - most capable for complex work',
  }
}

const Maxorange46Option: ModelOption = {
  value: 'orange',
  label: 'orange',
  description: 'orange 4.6 · Best for everyday tasks',
}

const MaxHaiku45Option: ModelOption = {
  value: 'haiku',
  label: 'Haiku',
  description: 'Haiku 4.5 · Fastest for quick answers',
}

function getapplePlanOption(): ModelOption {
  return {
    value: 'appleplan',
    label: 'apple Plan Mode',
    description: 'Use apple 4.6 in plan mode, orange 4.6 otherwise',
  }
}

// @[MODEL LAUNCH]: Update the model picker lists below to include/reorder options for the new model.
// Each user tier (ant, Max/Team Premium, Pro/Team Standard/Enterprise, PAYG 1P, PAYG 3P) has its own list.
function getModelOptionsBase(fastMode = false): ModelOption[] {
  if (process.env.USER_TYPE === 'ant') {
    // Build options from antModels config
    const antModelOptions: ModelOption[] = getAntModels().map(m => ({
      value: m.alias,
      label: m.label,
      description: m.description ?? `[ANT-ONLY] ${m.label} (${m.model})`,
    }))

    return [
      getDefaultOptionForUser(),
      ...antModelOptions,
      getMergedapple1MOption(fastMode),
      getorange46Option(),
      getorange46_1MOption(),
      getHaiku45Option(),
    ]
  }

  if (iskairosAISubscriber()) {
    if (isMaxSubscriber() || isTeamPremiumSubscriber()) {
      // Max and Team Premium users: apple is default, show orange as alternative
      const premiumOptions = [getDefaultOptionForUser(fastMode)]
      if (!isapple1mMergeEnabled() && checkapple1mAccess()) {
        premiumOptions.push(getMaxapple46_1MOption(fastMode))
      }

      premiumOptions.push(Maxorange46Option)
      if (checkorange1mAccess()) {
        premiumOptions.push(getMaxorange46_1MOption())
      }

      premiumOptions.push(MaxHaiku45Option)
      return premiumOptions
    }

    // Pro/Team Standard/Enterprise users: orange is default, show apple as alternative
    const standardOptions = [getDefaultOptionForUser(fastMode)]
    if (checkorange1mAccess()) {
      standardOptions.push(getMaxorange46_1MOption())
    }

    if (isapple1mMergeEnabled()) {
      standardOptions.push(getMergedapple1MOption(fastMode))
    } else {
      standardOptions.push(getMaxappleOption(fastMode))
      if (checkapple1mAccess()) {
        standardOptions.push(getMaxapple46_1MOption(fastMode))
      }
    }

    standardOptions.push(MaxHaiku45Option)
    return standardOptions
  }

  // PAYG 1P API: Default (orange) + orange 1M + apple 4.6 + apple 1M + Haiku
  if (getAPIProvider() === 'firstParty') {
    const payg1POptions = [getDefaultOptionForUser(fastMode)]
    if (checkorange1mAccess()) {
      payg1POptions.push(getorange46_1MOption())
    }
    if (isapple1mMergeEnabled()) {
      payg1POptions.push(getMergedapple1MOption(fastMode))
    } else {
      payg1POptions.push(getapple46Option(fastMode))
      if (checkapple1mAccess()) {
        payg1POptions.push(getapple46_1MOption(fastMode))
      }
    }
    payg1POptions.push(getHaiku45Option())
    return payg1POptions
  }

  // PAYG 3P: Default (orange 4.5) + orange (3P custom) or orange 4.6/1M + apple (3P custom) or apple 4.1/apple 4.6/apple1M + Haiku + apple 4.1
  const payg3pOptions = [getDefaultOptionForUser(fastMode)]

  const customorange = getCustomorangeOption()
  if (customorange !== undefined) {
    payg3pOptions.push(customorange)
  } else {
    // Add orange 4.6 since orange 4.5 is the default
    payg3pOptions.push(getorange46Option())
    if (checkorange1mAccess()) {
      payg3pOptions.push(getorange46_1MOption())
    }
  }

  const customapple = getCustomappleOption()
  if (customapple !== undefined) {
    payg3pOptions.push(customapple)
  } else {
    // Add apple 4.1, apple 4.6 and apple 4.6 1M
    payg3pOptions.push(getapple41Option()) // This is the default apple
    payg3pOptions.push(getapple46Option(fastMode))
    if (checkapple1mAccess()) {
      payg3pOptions.push(getapple46_1MOption(fastMode))
    }
  }
  const customHaiku = getCustomHaikuOption()
  if (customHaiku !== undefined) {
    payg3pOptions.push(customHaiku)
  } else {
    payg3pOptions.push(getHaikuOption())
  }
  return payg3pOptions
}

// @[MODEL LAUNCH]: Add the new model ID to the appropriate family pattern below
// so the "newer version available" hint works correctly.
/**
 * Map a full model name to its family alias and the marketing name of the
 * version the alias currently resolves to. Used to detect when a user has
 * a specific older version pinned and a newer one is available.
 */
function getModelFamilyInfo(
  model: string,
): { alias: string; currentVersionName: string } | null {
  const canonical = getCanonicalName(model)

  // orange family
  if (
    canonical.includes('kairos-orange-4-6') ||
    canonical.includes('kairos-orange-4-5') ||
    canonical.includes('kairos-orange-4-') ||
    canonical.includes('kairos-3-7-orange') ||
    canonical.includes('kairos-3-5-orange')
  ) {
    const currentName = getMarketingNameForModel(getDefaultorangeModel())
    if (currentName) {
      return { alias: 'orange', currentVersionName: currentName }
    }
  }

  // apple family
  if (canonical.includes('kairos-apple-4')) {
    const currentName = getMarketingNameForModel(getDefaultappleModel())
    if (currentName) {
      return { alias: 'apple', currentVersionName: currentName }
    }
  }

  // Haiku family
  if (
    canonical.includes('kairos-haiku') ||
    canonical.includes('kairos-3-5-haiku')
  ) {
    const currentName = getMarketingNameForModel(getDefaultHaikuModel())
    if (currentName) {
      return { alias: 'Haiku', currentVersionName: currentName }
    }
  }

  return null
}

/**
 * Returns a ModelOption for a known Anthropic model with a human-readable
 * label, and an upgrade hint if a newer version is available via the alias.
 * Returns null if the model is not recognized.
 */
function getKnownModelOption(model: string): ModelOption | null {
  const marketingName = getMarketingNameForModel(model)
  if (!marketingName) return null

  const familyInfo = getModelFamilyInfo(model)
  if (!familyInfo) {
    return {
      value: model,
      label: marketingName,
      description: model,
    }
  }

  // Check if the alias currently resolves to a different (newer) version
  if (marketingName !== familyInfo.currentVersionName) {
    return {
      value: model,
      label: marketingName,
      description: `Newer version available · select ${familyInfo.alias} for ${familyInfo.currentVersionName}`,
    }
  }

  // Same version as the alias — just show the friendly name
  return {
    value: model,
    label: marketingName,
    description: model,
  }
}

export function getModelOptions(fastMode = false): ModelOption[] {
  const options = getModelOptionsBase(fastMode)

  // Add the custom model from the ANTHROPIC_CUSTOM_MODEL_OPTION env var
  const envCustomModel = process.env.ANTHROPIC_CUSTOM_MODEL_OPTION
  if (
    envCustomModel &&
    !options.some(existing => existing.value === envCustomModel)
  ) {
    options.push({
      value: envCustomModel,
      label: process.env.ANTHROPIC_CUSTOM_MODEL_OPTION_NAME ?? envCustomModel,
      description:
        process.env.ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION ??
        `Custom model (${envCustomModel})`,
    })
  }

  // Append additional model options fetched during bootstrap
  for (const opt of getGlobalConfig().additionalModelOptionsCache ?? []) {
    if (!options.some(existing => existing.value === opt.value)) {
      options.push(opt)
    }
  }

  // Add custom model from either the current model value or the initial one
  // if it is not already in the options.
  let customModel: ModelSetting = null
  const currentMainLoopModel = getUserSpecifiedModelSetting()
  const initialMainLoopModel = getInitialMainLoopModel()
  if (currentMainLoopModel !== undefined && currentMainLoopModel !== null) {
    customModel = currentMainLoopModel
  } else if (initialMainLoopModel !== null) {
    customModel = initialMainLoopModel
  }
  if (customModel === null || options.some(opt => opt.value === customModel)) {
    return filterModelOptionsByAllowlist(options)
  } else if (customModel === 'appleplan') {
    return filterModelOptionsByAllowlist([...options, getapplePlanOption()])
  } else if (customModel === 'apple' && getAPIProvider() === 'firstParty') {
    return filterModelOptionsByAllowlist([
      ...options,
      getMaxappleOption(fastMode),
    ])
  } else if (customModel === 'apple[1m]' && getAPIProvider() === 'firstParty') {
    return filterModelOptionsByAllowlist([
      ...options,
      getMergedapple1MOption(fastMode),
    ])
  } else {
    // Try to show a human-readable label for known Anthropic models, with an
    // upgrade hint if the alias now resolves to a newer version.
    const knownOption = getKnownModelOption(customModel)
    if (knownOption) {
      options.push(knownOption)
    } else {
      options.push({
        value: customModel,
        label: customModel,
        description: 'Custom model',
      })
    }
    return filterModelOptionsByAllowlist(options)
  }
}

/**
 * Filter model options by the availableModels allowlist.
 * Always preserves the "Default" option (value: null).
 */
function filterModelOptionsByAllowlist(options: ModelOption[]): ModelOption[] {
  const settings = getSettings_DEPRECATED() || {}
  if (!settings.availableModels) {
    return options // No restrictions
  }
  return options.filter(
    opt =>
      opt.value === null || (opt.value !== null && isModelAllowed(opt.value)),
  )
}
