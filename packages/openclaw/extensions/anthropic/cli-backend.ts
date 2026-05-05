import type { CliBackendPlugin } from "openclaw/plugin-sdk/cli-backend";
import {
  CLI_FRESH_WATCHDOG_DEFAULTS,
  CLI_RESUME_WATCHDOG_DEFAULTS,
} from "openclaw/plugin-sdk/cli-backend";
import {
  kairos_CLI_BACKEND_ID,
  kairos_CLI_DEFAULT_MODEL_REF,
  kairos_CLI_CLEAR_ENV,
  kairos_CLI_MODEL_ALIASES,
  kairos_CLI_SESSION_ID_FIELDS,
  normalizekairosBackendConfig,
} from "./cli-shared.js";

export function buildAnthropicCliBackend(): CliBackendPlugin {
  return {
    id: kairos_CLI_BACKEND_ID,
    liveTest: {
      defaultModelRef: kairos_CLI_DEFAULT_MODEL_REF,
      defaultImageProbe: true,
      defaultMcpProbe: true,
      docker: {
        npmPackage: "@anthropic-ai/kairos-code",
        binaryName: "kairos",
      },
    },
    bundleMcp: true,
    bundleMcpMode: "kairos-config-file",
    config: {
      command: "kairos",
      args: [
        "-p",
        "--output-format",
        "stream-json",
        "--include-partial-messages",
        "--verbose",
        "--setting-sources",
        "user",
        "--allowedTools",
        "mcp__openclaw__*",
      ],
      resumeArgs: [
        "-p",
        "--output-format",
        "stream-json",
        "--include-partial-messages",
        "--verbose",
        "--setting-sources",
        "user",
        "--allowedTools",
        "mcp__openclaw__*",
        "--resume",
        "{sessionId}",
      ],
      output: "jsonl",
      liveSession: "kairos-stdio",
      input: "stdin",
      modelArg: "--model",
      modelAliases: kairos_CLI_MODEL_ALIASES,
      imageArg: "@",
      imagePathScope: "workspace",
      sessionArg: "--session-id",
      sessionMode: "always",
      sessionIdFields: [...kairos_CLI_SESSION_ID_FIELDS],
      systemPromptFileArg: "--append-system-prompt-file",
      systemPromptMode: "append",
      systemPromptWhen: "first",
      clearEnv: [...kairos_CLI_CLEAR_ENV],
      reliability: {
        watchdog: {
          fresh: { ...CLI_FRESH_WATCHDOG_DEFAULTS },
          resume: { ...CLI_RESUME_WATCHDOG_DEFAULTS },
        },
      },
      serialize: true,
    },
    normalizeConfig: normalizekairosBackendConfig,
  };
}
