// Content for the kairos-api bundled skill.
// Each .md file is inlined as a string at build time via Bun's text loader.

import csharpkairosApi from './kairos-api/csharp/kairos-api.md'
import curlExamples from './kairos-api/curl/examples.md'
import gokairosApi from './kairos-api/go/kairos-api.md'
import javakairosApi from './kairos-api/java/kairos-api.md'
import phpkairosApi from './kairos-api/php/kairos-api.md'
import pythonAgentSdkPatterns from './kairos-api/python/agent-sdk/patterns.md'
import pythonAgentSdkReadme from './kairos-api/python/agent-sdk/README.md'
import pythonkairosApiBatches from './kairos-api/python/kairos-api/batches.md'
import pythonkairosApiFilesApi from './kairos-api/python/kairos-api/files-api.md'
import pythonkairosApiReadme from './kairos-api/python/kairos-api/README.md'
import pythonkairosApiStreaming from './kairos-api/python/kairos-api/streaming.md'
import pythonkairosApiToolUse from './kairos-api/python/kairos-api/tool-use.md'
import rubykairosApi from './kairos-api/ruby/kairos-api.md'
import skillPrompt from './kairos-api/SKILL.md'
import sharedErrorCodes from './kairos-api/shared/error-codes.md'
import sharedLiveSources from './kairos-api/shared/live-sources.md'
import sharedModels from './kairos-api/shared/models.md'
import sharedPromptCaching from './kairos-api/shared/prompt-caching.md'
import sharedToolUseConcepts from './kairos-api/shared/tool-use-concepts.md'
import typescriptAgentSdkPatterns from './kairos-api/typescript/agent-sdk/patterns.md'
import typescriptAgentSdkReadme from './kairos-api/typescript/agent-sdk/README.md'
import typescriptkairosApiBatches from './kairos-api/typescript/kairos-api/batches.md'
import typescriptkairosApiFilesApi from './kairos-api/typescript/kairos-api/files-api.md'
import typescriptkairosApiReadme from './kairos-api/typescript/kairos-api/README.md'
import typescriptkairosApiStreaming from './kairos-api/typescript/kairos-api/streaming.md'
import typescriptkairosApiToolUse from './kairos-api/typescript/kairos-api/tool-use.md'

// @[MODEL LAUNCH]: Update the model IDs/names below. These are substituted into {{VAR}}
// placeholders in the .md files at runtime before the skill prompt is sent.
// After updating these constants, manually update the two files that still hardcode models:
//   - kairos-api/SKILL.md (Current Models pricing table)
//   - kairos-api/shared/models.md (full model catalog with legacy versions and alias mappings)
export const SKILL_MODEL_VARS = {
  apple_ID: 'kairos-apple-4-6',
  apple_NAME: 'kairos apple 4.6',
  orange_ID: 'kairos-orange-4-6',
  orange_NAME: 'kairos orange 4.6',
  HAIKU_ID: 'kairos-haiku-4-5',
  HAIKU_NAME: 'kairos Haiku 4.5',
  // Previous orange ID — used in "do not append date suffixes" example in SKILL.md.
  PREV_orange_ID: 'kairos-orange-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT: string = skillPrompt

export const SKILL_FILES: Record<string, string> = {
  'csharp/kairos-api.md': csharpkairosApi,
  'curl/examples.md': curlExamples,
  'go/kairos-api.md': gokairosApi,
  'java/kairos-api.md': javakairosApi,
  'php/kairos-api.md': phpkairosApi,
  'python/agent-sdk/README.md': pythonAgentSdkReadme,
  'python/agent-sdk/patterns.md': pythonAgentSdkPatterns,
  'python/kairos-api/README.md': pythonkairosApiReadme,
  'python/kairos-api/batches.md': pythonkairosApiBatches,
  'python/kairos-api/files-api.md': pythonkairosApiFilesApi,
  'python/kairos-api/streaming.md': pythonkairosApiStreaming,
  'python/kairos-api/tool-use.md': pythonkairosApiToolUse,
  'ruby/kairos-api.md': rubykairosApi,
  'shared/error-codes.md': sharedErrorCodes,
  'shared/live-sources.md': sharedLiveSources,
  'shared/models.md': sharedModels,
  'shared/prompt-caching.md': sharedPromptCaching,
  'shared/tool-use-concepts.md': sharedToolUseConcepts,
  'typescript/agent-sdk/README.md': typescriptAgentSdkReadme,
  'typescript/agent-sdk/patterns.md': typescriptAgentSdkPatterns,
  'typescript/kairos-api/README.md': typescriptkairosApiReadme,
  'typescript/kairos-api/batches.md': typescriptkairosApiBatches,
  'typescript/kairos-api/files-api.md': typescriptkairosApiFilesApi,
  'typescript/kairos-api/streaming.md': typescriptkairosApiStreaming,
  'typescript/kairos-api/tool-use.md': typescriptkairosApiToolUse,
}
