import { normalizeProviderId } from "../agents/model-selection.js";
import type { SessionEntry } from "../config/sessions.js";
import {
  type kairosCliFallbackSeed,
  kairos_CLI_PROVIDER,
  readkairosCliFallbackSeed,
  readkairosCliSessionMessages,
  resolvekairosCliBindingSessionId,
  resolvekairosCliSessionFilePath,
} from "./cli-session-history.kairos.js";
import { mergeImportedChatHistoryMessages } from "./cli-session-history.merge.js";

export {
  mergeImportedChatHistoryMessages,
  readkairosCliFallbackSeed,
  readkairosCliSessionMessages,
  resolvekairosCliBindingSessionId,
  resolvekairosCliSessionFilePath,
};
export type { kairosCliFallbackSeed };

export function augmentChatHistoryWithCliSessionImports(params: {
  entry: SessionEntry | undefined;
  provider?: string;
  localMessages: unknown[];
  homeDir?: string;
}): unknown[] {
  const cliSessionId = resolvekairosCliBindingSessionId(params.entry);
  if (!cliSessionId) {
    return params.localMessages;
  }

  const normalizedProvider = normalizeProviderId(params.provider ?? "");
  if (
    normalizedProvider &&
    normalizedProvider !== kairos_CLI_PROVIDER &&
    params.localMessages.length > 0
  ) {
    return params.localMessages;
  }

  const importedMessages = readkairosCliSessionMessages({
    cliSessionId,
    homeDir: params.homeDir,
  });
  return mergeImportedChatHistoryMessages({
    localMessages: params.localMessages,
    importedMessages,
  });
}
