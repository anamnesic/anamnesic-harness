import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildkairosCliFallbackContextPrelude,
  kairosCliSessionTranscriptHasContent,
  createAcpVisibleTextAccumulator,
  formatkairosCliFallbackPrelude,
  resolveFallbackRetryPrompt,
  sessionFileHasContent,
} from "./attempt-execution.helpers.js";

describe("resolveFallbackRetryPrompt", () => {
  const originalBody = "Summarize the quarterly earnings report and highlight key trends.";

  it("returns original body on first attempt (isFallbackRetry=false)", () => {
    expect(
      resolveFallbackRetryPrompt({
        body: originalBody,
        isFallbackRetry: false,
      }),
    ).toBe(originalBody);
  });

  it("prepends recovery prefix to original body on fallback retry with existing session history", () => {
    expect(
      resolveFallbackRetryPrompt({
        body: originalBody,
        isFallbackRetry: true,
        sessionHasHistory: true,
      }),
    ).toBe(`[Retry after the previous model attempt failed or timed out]\n\n${originalBody}`);
  });

  it("preserves original body for fallback retry when session has no history (subagent spawn)", () => {
    expect(
      resolveFallbackRetryPrompt({
        body: originalBody,
        isFallbackRetry: true,
        sessionHasHistory: false,
      }),
    ).toBe(originalBody);
  });

  it("preserves original body for fallback retry when sessionHasHistory is undefined", () => {
    expect(
      resolveFallbackRetryPrompt({
        body: originalBody,
        isFallbackRetry: true,
      }),
    ).toBe(originalBody);
  });

  it("returns original body on first attempt regardless of sessionHasHistory", () => {
    expect(
      resolveFallbackRetryPrompt({
        body: originalBody,
        isFallbackRetry: false,
        sessionHasHistory: true,
      }),
    ).toBe(originalBody);

    expect(
      resolveFallbackRetryPrompt({
        body: originalBody,
        isFallbackRetry: false,
        sessionHasHistory: false,
      }),
    ).toBe(originalBody);
  });

  it("preserves original body on fallback retry without history", () => {
    expect(
      resolveFallbackRetryPrompt({
        body: originalBody,
        isFallbackRetry: true,
        sessionHasHistory: false,
      }),
    ).toBe(originalBody);
  });

  it("prepends priorContextPrelude before the retry marker on fallback retry", () => {
    const prelude = "## Prior session context (from kairos-cli)\nuser: prior question";
    const result = resolveFallbackRetryPrompt({
      body: originalBody,
      isFallbackRetry: true,
      sessionHasHistory: true,
      priorContextPrelude: prelude,
    });
    expect(result).toBe(
      `${prelude}\n\n[Retry after the previous model attempt failed or timed out]\n\n${originalBody}`,
    );
  });

  it("emits the retry prompt with prelude even when sessionHasHistory is false (kairos-cli case)", () => {
    const prelude = "## Prior session context (from kairos-cli)\nuser: prior question";
    const result = resolveFallbackRetryPrompt({
      body: originalBody,
      isFallbackRetry: true,
      sessionHasHistory: false,
      priorContextPrelude: prelude,
    });
    expect(result).toBe(
      `${prelude}\n\n[Retry after the previous model attempt failed or timed out]\n\n${originalBody}`,
    );
  });

  it("ignores empty/whitespace priorContextPrelude", () => {
    expect(
      resolveFallbackRetryPrompt({
        body: originalBody,
        isFallbackRetry: true,
        sessionHasHistory: false,
        priorContextPrelude: "   \n  ",
      }),
    ).toBe(originalBody);
  });

  it("does not prepend prelude on non-fallback first attempts", () => {
    expect(
      resolveFallbackRetryPrompt({
        body: originalBody,
        isFallbackRetry: false,
        sessionHasHistory: true,
        priorContextPrelude: "anything",
      }),
    ).toBe(originalBody);
  });
});

describe("formatkairosCliFallbackPrelude", () => {
  it("returns empty string when seed has neither summary nor turns", () => {
    expect(formatkairosCliFallbackPrelude({ recentTurns: [] })).toBe("");
  });

  it("emits summary alone when no turns are available", () => {
    const out = formatkairosCliFallbackPrelude({
      summaryText: "User wants to ship a billing-aware fallback.",
      recentTurns: [],
    });
    expect(out).toContain("## Prior session context (from kairos-cli)");
    expect(out).toContain("Summary of earlier conversation:");
    expect(out).toContain("User wants to ship a billing-aware fallback.");
    expect(out).not.toContain("Recent turns:");
  });

  it("formats user/assistant turns and tags tool blocks with compact hints", () => {
    const out = formatkairosCliFallbackPrelude({
      recentTurns: [
        {
          role: "user",
          content: "Earlier user question",
        },
        {
          role: "assistant",
          content: [
            { type: "text", text: "Earlier assistant reply" },
            { type: "tool_use", name: "Bash" },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "toolu_x",
              content: "Earlier tool output",
            },
          ],
        },
      ],
    });
    expect(out).toContain("## Prior session context (from kairos-cli)");
    expect(out).toContain("Recent turns:");
    expect(out).toContain("user: Earlier user question");
    expect(out).toContain("assistant: Earlier assistant reply");
    expect(out).toContain("(tool call: Bash)");
    expect(out).toContain("(tool result: Earlier tool output)");
  });

  it("truncates an oversized summary instead of dropping it silently", () => {
    const huge = "x ".repeat(10_000).trim();
    const out = formatkairosCliFallbackPrelude(
      { summaryText: huge, recentTurns: [] },
      { charBudget: 600 },
    );
    expect(out).toContain("Summary of earlier conversation (truncated):");
    expect(out.length).toBeLessThan(800);
    expect(out).toMatch(/…$/);
  });

  it("drops oldest turns first when the budget cannot fit all of them", () => {
    const turns = Array.from({ length: 10 }, (_, i) => ({
      role: "user" as const,
      content: `turn ${i + 1} ${"x".repeat(80)}`,
    }));
    const out = formatkairosCliFallbackPrelude({ recentTurns: turns }, { charBudget: 350 });
    // Newest turn (turn 10) must be present; oldest (turn 1) must not be.
    expect(out).toContain("turn 10");
    expect(out).not.toContain("turn 1 ");
  });

  it("keeps the recent turn window contiguous when an adjacent turn is oversized", () => {
    const out = formatkairosCliFallbackPrelude(
      {
        recentTurns: [
          { role: "user", content: "older small turn" },
          { role: "assistant", content: `oversized adjacent turn ${"x".repeat(500)}` },
          { role: "user", content: "newest small turn" },
        ],
      },
      { charBudget: 260 },
    );

    expect(out).toContain("newest small turn");
    expect(out).not.toContain("oversized adjacent turn");
    expect(out).not.toContain("older small turn");
  });
});

describe("buildkairosCliFallbackContextPrelude", () => {
  it("returns empty string when no sessionId is provided", () => {
    expect(buildkairosCliFallbackContextPrelude({ cliSessionId: undefined })).toBe("");
    expect(buildkairosCliFallbackContextPrelude({ cliSessionId: "  " })).toBe("");
  });

  it("returns empty string when the kairos session file does not exist", async () => {
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-fallback-prelude-"));
    try {
      expect(
        buildkairosCliFallbackContextPrelude({
          cliSessionId: "missing-session",
          homeDir: tmpHome,
        }),
      ).toBe("");
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });

  it("reads a real kairos JSONL fixture and emits a labeled prelude end-to-end", async () => {
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-fallback-prelude-"));
    const sessionId = "e2e-session";
    const projectsDir = path.join(tmpHome, ".kairos", "projects", "demo");
    try {
      await fs.mkdir(projectsDir, { recursive: true });
      const lines = [
        {
          type: "user",
          uuid: "u1",
          message: { role: "user", content: "prior question about deploys" },
        },
        {
          type: "assistant",
          uuid: "a1",
          message: {
            role: "assistant",
            model: "kairos-orange-4-6",
            content: [{ type: "text", text: "prior answer about blue-green" }],
          },
        },
      ];
      await fs.writeFile(
        path.join(projectsDir, `${sessionId}.jsonl`),
        `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`,
        "utf-8",
      );
      const prelude = buildkairosCliFallbackContextPrelude({
        cliSessionId: sessionId,
        homeDir: tmpHome,
      });
      expect(prelude).toContain("## Prior session context (from kairos-cli)");
      expect(prelude).toContain("user: prior question about deploys");
      expect(prelude).toContain("assistant: prior answer about blue-green");
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });
});

describe("sessionFileHasContent", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns false for undefined sessionFile", async () => {
    expect(await sessionFileHasContent(undefined)).toBe(false);
  });

  it("returns false when session file does not exist", async () => {
    expect(await sessionFileHasContent(path.join(tmpDir, "nonexistent.jsonl"))).toBe(false);
  });

  it("returns false when session file is empty", async () => {
    const file = path.join(tmpDir, "empty.jsonl");
    await fs.writeFile(file, "", "utf-8");
    expect(await sessionFileHasContent(file)).toBe(false);
  });

  it("returns false when session file has only user message (no assistant flush)", async () => {
    const file = path.join(tmpDir, "user-only.jsonl");
    await fs.writeFile(
      file,
      '{"type":"session","id":"s1"}\n{"type":"message","message":{"role":"user","content":"hello"}}\n',
      "utf-8",
    );
    expect(await sessionFileHasContent(file)).toBe(false);
  });

  it("returns true when session file has assistant message (flushed)", async () => {
    const file = path.join(tmpDir, "with-assistant.jsonl");
    await fs.writeFile(
      file,
      '{"type":"session","id":"s1"}\n{"type":"message","message":{"role":"user","content":"hello"}}\n{"type":"message","message":{"role":"assistant","content":"hi"}}\n',
      "utf-8",
    );
    expect(await sessionFileHasContent(file)).toBe(true);
  });

  it("returns true when session file has spaced JSON (role : assistant)", async () => {
    const file = path.join(tmpDir, "spaced.jsonl");
    await fs.writeFile(
      file,
      '{"type":"message","message":{"role": "assistant","content":"hi"}}\n',
      "utf-8",
    );
    expect(await sessionFileHasContent(file)).toBe(true);
  });

  it("returns true when assistant message appears after large user content", async () => {
    const file = path.join(tmpDir, "large-user.jsonl");
    // Create a user message whose JSON line exceeds 256KB to ensure the
    // JSONL-based parser (CWE-703 fix) finds the assistant record that a
    // naive byte-prefix approach would miss.
    const bigContent = "x".repeat(300 * 1024);
    const lines =
      [
        `{"type":"session","id":"s1"}`,
        `{"type":"message","message":{"role":"user","content":"${bigContent}"}}`,
        `{"type":"message","message":{"role":"assistant","content":"done"}}`,
      ].join("\n") + "\n";
    await fs.writeFile(file, lines, "utf-8");
    expect(await sessionFileHasContent(file)).toBe(true);
  });

  it("returns false when session file is a symbolic link", async () => {
    const realFile = path.join(tmpDir, "real.jsonl");
    await fs.writeFile(
      realFile,
      '{"type":"message","message":{"role":"assistant","content":"hi"}}\n',
      "utf-8",
    );
    const link = path.join(tmpDir, "link.jsonl");
    await fs.symlink(realFile, link);
    expect(await sessionFileHasContent(link)).toBe(false);
  });
});

describe("kairosCliSessionTranscriptHasContent", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "oc-kairos-session-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function writekairosProjectFile(sessionId: string, content: string) {
    const projectDir = path.join(tmpDir, ".kairos", "projects", "demo-workspace");
    await fs.mkdir(projectDir, { recursive: true });
    const file = path.join(projectDir, `${sessionId}.jsonl`);
    await fs.writeFile(file, content, "utf-8");
    return file;
  }

  it("returns false when the kairos project transcript is missing or empty", async () => {
    expect(
      await kairosCliSessionTranscriptHasContent({
        sessionId: "missing-session",
        homeDir: tmpDir,
      }),
    ).toBe(false);

    await writekairosProjectFile("empty-session", "");
    expect(
      await kairosCliSessionTranscriptHasContent({
        sessionId: "empty-session",
        homeDir: tmpDir,
      }),
    ).toBe(false);
  });

  it("returns true when the kairos project transcript has an assistant message", async () => {
    await writekairosProjectFile(
      "session-with-assistant",
      `${JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "hello" }],
        },
      })}\n`,
    );

    expect(
      await kairosCliSessionTranscriptHasContent({
        sessionId: "session-with-assistant",
        homeDir: tmpDir,
      }),
    ).toBe(true);
  });

  it("rejects path-like session ids instead of escaping the kairos projects tree", async () => {
    await writekairosProjectFile("safe-session", "");
    expect(
      await kairosCliSessionTranscriptHasContent({
        sessionId: "../safe-session",
        homeDir: tmpDir,
      }),
    ).toBe(false);
  });
});

describe("createAcpVisibleTextAccumulator", () => {
  it("preserves cumulative raw snapshots after stripping a glued NO_REPLY prefix", () => {
    const acc = createAcpVisibleTextAccumulator();

    expect(acc.consume("NO_REPLYThe user")).toEqual({
      text: "The user",
      delta: "The user",
    });

    expect(acc.consume("NO_REPLYThe user is saying")).toEqual({
      text: "The user is saying",
      delta: " is saying",
    });

    expect(acc.finalize()).toBe("The user is saying");
    expect(acc.finalizeRaw()).toBe("The user is saying");
  });

  it("keeps append-only deltas working after stripping a glued NO_REPLY prefix", () => {
    const acc = createAcpVisibleTextAccumulator();

    expect(acc.consume("NO_REPLYThe user")).toEqual({
      text: "The user",
      delta: "The user",
    });

    expect(acc.consume(" is saying")).toEqual({
      text: "The user is saying",
      delta: " is saying",
    });
  });

  it("preserves punctuation-start text that begins with NO_REPLY-like content", () => {
    const acc = createAcpVisibleTextAccumulator();

    expect(acc.consume("NO_REPLY: explanation")).toEqual({
      text: "NO_REPLY: explanation",
      delta: "NO_REPLY: explanation",
    });

    expect(acc.finalize()).toBe("NO_REPLY: explanation");
  });

  it("buffers chunked NO_REPLY prefixes before emitting visible text", () => {
    const acc = createAcpVisibleTextAccumulator();

    expect(acc.consume("NO")).toBeNull();
    expect(acc.consume("NO_")).toBeNull();
    expect(acc.consume("NO_RE")).toBeNull();
    expect(acc.consume("NO_REPLY")).toBeNull();
    expect(acc.consume("Actual answer")).toEqual({
      text: "Actual answer",
      delta: "Actual answer",
    });
  });
});
