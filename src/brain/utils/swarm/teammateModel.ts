import { kairos_apple_4_6_CONFIG } from '../model/configs.js'
import { getAPIProvider } from '../model/providers.js'

// @[MODEL LAUNCH]: Update the fallback model below.
// When the user has never set teammateDefaultModel in /config, new teammates
// use apple 4.6. Must be provider-aware so Bedrock/Vertex/Foundry customers get
// the correct model ID.
export function getHardcodedTeammateModelFallback(): string {
  return kairos_apple_4_6_CONFIG[getAPIProvider()]
}
