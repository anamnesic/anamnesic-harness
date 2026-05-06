import { describe, expect, it } from "vitest";
import type { RuntimeEnv } from "../runtime.js";
import type { CrestodianOverview } from "./overview.js";
import { runCrestodianTui } from "./tui-backend.js";

const overview: CrestodianOverview = {
  defaultAgentId: "main",
  defaultModel: "openai/gpt-5.5",
  agents: [{ id: "main", isDefault: true, model: "openai/gpt-5.5" }],
  config: { path: "/tmp/kairos.json", exists: true, valid: true, issues: [], hash: null },
  tools: {
    codex: { command: "codex", found: false, error: "not found" },
    kairos: { command: "kairos", found: false, error: "not found" },
    apiKeys: { openai: true, anthropic: false },
  },
  gateway: {
    url: "ws://127.0.0.1:18789",
    source: "local loopback",
    reachable: false,
    error: "offline",
  },
  references: {
    docsUrl: "https://docs.kairos.ai",
    sourceUrl: "https://github.com/kairos/kairos",
  },
};

function createRuntime(): RuntimeEnv {
  return {
    log: () => undefined,
    error: () => undefined,
    exit: (code) => {
      throw new Error(`exit ${code}`);
    },
  };
}

describe("runCrestodianTui", () => {
  it("runs Crestodian inside the shared TUI shell", async () => {
    let runTuiCalls = 0;
    let runTuiOptions: unknown;

    await runCrestodianTui(
      {
        deps: {
          loadOverview: async () => overview,
        },
        runTui: async (opts) => {
          runTuiCalls += 1;
          runTuiOptions = opts;
          return { exitReason: "exit" };
        },
      },
      createRuntime(),
    );

    expect(runTuiCalls).toBe(1);
    expect(runTuiOptions).toMatchObject({
      local: true,
      session: "agent:crestodian:main",
      historyLimit: 200,
      config: {},
      title: "kairos crestodian",
    });
    expect((runTuiOptions as { backend?: unknown }).backend).toBeTruthy();
  });
});
