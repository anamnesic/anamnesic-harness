import { describe, expect, it } from "vitest";
import { buildAnthropicCliBackend } from "./cli-backend.js";
import {
  kairos_CLI_CLEAR_ENV,
  normalizekairosBackendConfig,
  normalizekairosPermissionArgs,
  normalizekairosSettingSourcesArgs,
  resolvekairosPermissionMode,
} from "./cli-shared.js";

describe("normalizekairosPermissionArgs", () => {
  it("leaves args alone when they omit permission flags", () => {
    expect(
      normalizekairosPermissionArgs(["-p", "--output-format", "stream-json", "--verbose"]),
    ).toEqual(["-p", "--output-format", "stream-json", "--verbose"]);
  });

  it("removes legacy skip-permissions without adding bypassPermissions", () => {
    expect(
      normalizekairosPermissionArgs(["-p", "--dangerously-skip-permissions", "--verbose"]),
    ).toEqual(["-p", "--verbose"]);
  });

  it("keeps explicit permission-mode overrides", () => {
    expect(normalizekairosPermissionArgs(["-p", "--permission-mode", "acceptEdits"])).toEqual([
      "-p",
      "--permission-mode",
      "acceptEdits",
    ]);
    expect(normalizekairosPermissionArgs(["-p", "--permission-mode=acceptEdits"])).toEqual([
      "-p",
      "--permission-mode=acceptEdits",
    ]);
  });

  it("drops malformed permission-mode flags in both split and equals forms", () => {
    expect(
      normalizekairosPermissionArgs(["-p", "--permission-mode", "--output-format", "stream-json"]),
    ).toEqual(["-p", "--output-format", "stream-json"]);
    expect(normalizekairosPermissionArgs(["-p", "--permission-mode="])).toEqual(["-p"]);
    expect(normalizekairosPermissionArgs(["-p", "--permission-mode=--output-format"])).toEqual([
      "-p",
    ]);
  });
});

describe("normalizekairosSettingSourcesArgs", () => {
  it("injects user-only setting sources when args omit the flag", () => {
    expect(
      normalizekairosSettingSourcesArgs(["-p", "--output-format", "stream-json", "--verbose"]),
    ).toEqual(["-p", "--output-format", "stream-json", "--verbose", "--setting-sources", "user"]);
  });

  it("forces explicit project or local setting sources back to user-only", () => {
    expect(normalizekairosSettingSourcesArgs(["-p", "--setting-sources", "project"])).toEqual([
      "-p",
      "--setting-sources",
      "user",
    ]);
    expect(normalizekairosSettingSourcesArgs(["-p", "--setting-sources=local,user"])).toEqual([
      "-p",
      "--setting-sources=user",
    ]);
  });

  it("treats a bare setting-sources flag as malformed and falls back to user-only", () => {
    expect(
      normalizekairosSettingSourcesArgs([
        "-p",
        "--setting-sources",
        "--output-format",
        "stream-json",
      ]),
    ).toEqual(["-p", "--output-format", "stream-json", "--setting-sources", "user"]);
  });
});

describe("normalizekairosBackendConfig", () => {
  it("normalizes both args and resumeArgs for custom overrides", () => {
    const normalized = normalizekairosBackendConfig({
      command: "kairos",
      args: ["-p", "--output-format", "stream-json", "--verbose"],
      resumeArgs: ["-p", "--output-format", "stream-json", "--verbose", "--resume", "{sessionId}"],
    });

    expect(normalized.args).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--setting-sources",
      "user",
      "--permission-mode",
      "bypassPermissions",
    ]);
    expect(normalized.resumeArgs).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--resume",
      "{sessionId}",
      "--setting-sources",
      "user",
      "--permission-mode",
      "bypassPermissions",
    ]);
    expect(normalized.output).toBe("jsonl");
    expect(normalized.liveSession).toBe("kairos-stdio");
    expect(normalized.input).toBe("stdin");
  });

  it("derives kairos bypass from OpenClaw YOLO policy and disables it for safer policy", () => {
    expect(resolvekairosPermissionMode({ backendId: "kairos-cli" })).toEqual({
      mode: "bypassPermissions",
      overrideExisting: false,
    });
    expect(
      resolvekairosPermissionMode({
        backendId: "kairos-cli",
        config: { tools: { exec: { security: "allowlist", ask: "on-miss" } } },
      }),
    ).toEqual({ overrideExisting: false });
  });

  it("derives kairos bypass from per-agent OpenClaw exec policy", () => {
    expect(
      resolvekairosPermissionMode({
        backendId: "kairos-cli",
        agentId: "safe-agent",
        config: {
          tools: { exec: { security: "full", ask: "off" } },
          agents: {
            list: [
              {
                id: "safe-agent",
                tools: { exec: { security: "allowlist", ask: "on-miss" } },
              },
            ],
          },
        },
      }),
    ).toEqual({ overrideExisting: false });
    expect(
      resolvekairosPermissionMode({
        backendId: "kairos-cli",
        agentId: "yolo-agent",
        config: {
          tools: { exec: { security: "allowlist", ask: "on-miss" } },
          agents: {
            list: [
              {
                id: "yolo-agent",
                tools: { exec: { security: "full", ask: "off" } },
              },
            ],
          },
        },
      }),
    ).toEqual({
      mode: "bypassPermissions",
      overrideExisting: false,
    });
  });

  it("does not infer live stdio when explicit transport overrides are incompatible", () => {
    const normalized = normalizekairosBackendConfig({
      command: "kairos",
      output: "json",
      input: "arg",
    });

    expect(normalized.output).toBe("json");
    expect(normalized.liveSession).toBeUndefined();
    expect(normalized.input).toBe("arg");
  });

  it("is wired through the anthropic cli backend normalize hook", () => {
    const backend = buildAnthropicCliBackend();
    const normalizeConfig = backend.normalizeConfig;

    expect(normalizeConfig).toBeTypeOf("function");

    const normalized = normalizeConfig?.({
      ...backend.config,
      args: ["-p", "--output-format", "stream-json", "--verbose"],
      resumeArgs: ["-p", "--output-format", "stream-json", "--verbose", "--resume", "{sessionId}"],
    });

    expect(normalized?.args).toContain("--setting-sources");
    expect(normalized?.args).toContain("user");
    expect(normalized?.args).toContain("--permission-mode");
    expect(normalized?.args).toContain("bypassPermissions");
    expect(normalized?.resumeArgs).toContain("--setting-sources");
    expect(normalized?.resumeArgs).toContain("user");
    expect(normalized?.resumeArgs).toContain("--permission-mode");
    expect(normalized?.resumeArgs).toContain("bypassPermissions");
    expect(normalized?.liveSession).toBe("kairos-stdio");
  });

  it("leaves kairos cli subscription-managed, restricts setting sources, and clears inherited env overrides", () => {
    const backend = buildAnthropicCliBackend();

    expect(backend.config.env).toBeUndefined();
    expect(backend.config.liveSession).toBe("kairos-stdio");
    expect(backend.config.output).toBe("jsonl");
    expect(backend.config.input).toBe("stdin");
    expect(backend.config.args).toContain("--setting-sources");
    expect(backend.config.args).toContain("user");
    expect(backend.config.resumeArgs).toContain("--setting-sources");
    expect(backend.config.resumeArgs).toContain("user");
    expect(backend.config.clearEnv).toEqual([...kairos_CLI_CLEAR_ENV]);
    expect(backend.config.clearEnv).toContain("ANTHROPIC_API_TOKEN");
    expect(backend.config.clearEnv).toContain("ANTHROPIC_BASE_URL");
    expect(backend.config.clearEnv).toContain("ANTHROPIC_CUSTOM_HEADERS");
    expect(backend.config.clearEnv).toContain("ANTHROPIC_OAUTH_TOKEN");
    expect(backend.config.clearEnv).toContain("kairos_CONFIG_DIR");
    expect(backend.config.clearEnv).toContain("kairos_CODE_USE_BEDROCK");
    expect(backend.config.clearEnv).toContain("kairos_CODE_OAUTH_TOKEN");
    expect(backend.config.clearEnv).toContain("kairos_CODE_PLUGIN_CACHE_DIR");
    expect(backend.config.clearEnv).toContain("kairos_CODE_PLUGIN_SEED_DIR");
    expect(backend.config.clearEnv).toContain("kairos_CODE_REMOTE");
    expect(backend.config.clearEnv).toContain("kairos_CODE_USE_COWORK_PLUGINS");
    expect(backend.config.clearEnv).toContain("OTEL_METRICS_EXPORTER");
    expect(backend.config.clearEnv).toContain("OTEL_EXPORTER_OTLP_PROTOCOL");
    expect(backend.config.clearEnv).toContain("OTEL_SDK_DISABLED");
  });
});
