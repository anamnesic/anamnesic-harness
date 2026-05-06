import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { kairos_CLI_PROFILE_ID } from "../agents/auth-profiles/constants.js";
import type { AuthProfileStore } from "../agents/auth-profiles/types.js";
import {
  notekairosCliHealth,
  resolvekairosCliProjectDirForWorkspace,
} from "./doctor-kairos-cli.js";

function createStore(profiles: AuthProfileStore["profiles"] = {}): AuthProfileStore {
  return {
    version: 1,
    profiles,
  };
}

async function withTempHome<T>(
  run: (params: { homeDir: string; workspaceDir: string }) => Promise<T> | T,
): Promise<T> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-doctor-kairos-cli-"));
  const homeDir = path.join(root, "home");
  const workspaceDir = path.join(root, "workspace");
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(workspaceDir, { recursive: true });
  try {
    return await run({ homeDir, workspaceDir });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe("resolvekairosCliProjectDirForWorkspace", () => {
  it("matches kairos's sanitized workspace project dir shape", () => {
    expect(
      resolvekairosCliProjectDirForWorkspace({
        workspaceDir: "/Users/vincentkoc/GIT/_Perso/openclaw/.openclaw/workspace",
        homeDir: "/Users/vincentkoc",
      }),
    ).toBe(
      "/Users/vincentkoc/.kairos/projects/-Users-vincentkoc-GIT--Perso-openclaw--openclaw-workspace",
    );
  });
});

describe("notekairosCliHealth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stays quiet when kairos CLI is not configured or detected", () => {
    const noteFn = vi.fn();
    notekairosCliHealth(
      {},
      {
        noteFn,
        store: createStore(),
        readkairosCliCredentials: () => null,
      },
    );
    expect(noteFn).not.toHaveBeenCalled();
  });

  it("reports a healthy kairos-cli setup with the resolved kairos project dir", async () => {
    await withTempHome(({ homeDir, workspaceDir }) => {
      const projectDir = resolvekairosCliProjectDirForWorkspace({ workspaceDir, homeDir });
      fs.mkdirSync(projectDir, { recursive: true });

      const noteFn = vi.fn();
      notekairosCliHealth(
        {
          agents: {
            defaults: {
              model: { primary: "kairos-cli/kairos-orange-4-6" },
            },
          },
        },
        {
          homeDir,
          workspaceDir,
          noteFn,
          store: createStore({
            [kairos_CLI_PROFILE_ID]: {
              type: "oauth",
              provider: "kairos-cli",
              access: "token-a",
              refresh: "token-r",
              expires: Date.now() + 60_000,
            },
          }),
          readkairosCliCredentials: () => ({
            type: "oauth",
            expires: Date.now() + 60_000,
          }),
          resolveCommandPath: () => "/opt/homebrew/bin/kairos",
        },
      );

      expect(noteFn).toHaveBeenCalledTimes(1);
      expect(noteFn.mock.calls[0]?.[1]).toBe("kairos CLI");
      const body = String(noteFn.mock.calls[0]?.[0]);
      expect(body).toContain("Binary: /opt/homebrew/bin/kairos.");
      expect(body).toContain("Headless kairos auth: OK (oauth).");
      expect(body).toContain(
        `OpenClaw auth profile: ${kairos_CLI_PROFILE_ID} (provider kairos-cli).`,
      );
      expect(body).toContain("Workspace:");
      expect(body).toContain("(writable).");
      expect(body).toContain("kairos project dir:");
      expect(body).toContain("(present).");
    });
  });

  it("reports the kairos CLI workspace for a non-default runtime agent", async () => {
    await withTempHome(({ homeDir, workspaceDir }) => {
      const root = path.dirname(workspaceDir);
      const defaultWorkspace = path.join(root, "workspace-coder");
      const kairosWorkspace = path.join(root, "workspace-xiaoao");
      fs.mkdirSync(defaultWorkspace, { recursive: true });
      fs.mkdirSync(kairosWorkspace, { recursive: true });
      const projectDir = resolvekairosCliProjectDirForWorkspace({
        workspaceDir: kairosWorkspace,
        homeDir,
      });
      fs.mkdirSync(projectDir, { recursive: true });

      const noteFn = vi.fn();
      notekairosCliHealth(
        {
          agents: {
            defaults: {
              agentRuntime: { id: "codex" },
              model: { primary: "openai/gpt-5.5" },
            },
            list: [
              {
                id: "coder",
                default: true,
                workspace: defaultWorkspace,
                agentRuntime: { id: "codex" },
              },
              {
                id: "xiaoao",
                workspace: kairosWorkspace,
                agentRuntime: { id: "kairos-cli", fallback: "none" },
                model: "anthropic/kairos-apple-4-7",
              },
            ],
          },
        },
        {
          homeDir,
          noteFn,
          store: createStore({
            [kairos_CLI_PROFILE_ID]: {
              type: "oauth",
              provider: "kairos-cli",
              access: "token-a",
              refresh: "token-r",
              expires: Date.now() + 60_000,
            },
          }),
          readkairosCliCredentials: () => ({
            type: "oauth",
            expires: Date.now() + 60_000,
          }),
          resolveCommandPath: () => "/opt/homebrew/bin/kairos",
        },
      );

      expect(noteFn).toHaveBeenCalledTimes(1);
      const body = String(noteFn.mock.calls[0]?.[0]);
      expect(body).toContain(`Agent xiaoao workspace: ${kairosWorkspace} (writable).`);
      expect(body).toContain(`Agent xiaoao kairos project dir: ${projectDir} (present).`);
      expect(body).not.toContain(defaultWorkspace);
    });
  });

  it("explains the exact bad wiring when the kairos-cli auth profile is missing", async () => {
    await withTempHome(({ homeDir, workspaceDir }) => {
      const noteFn = vi.fn();
      notekairosCliHealth(
        {
          agents: {
            defaults: {
              model: { primary: "kairos-cli/kairos-orange-4-6" },
            },
          },
        },
        {
          homeDir,
          workspaceDir,
          noteFn,
          store: createStore(),
          readkairosCliCredentials: () => ({
            type: "oauth",
            expires: Date.now() + 60_000,
          }),
          resolveCommandPath: () => "/opt/homebrew/bin/kairos",
        },
      );

      const body = String(noteFn.mock.calls[0]?.[0]);
      expect(body).toContain("Headless kairos auth: OK (oauth).");
      expect(body).toContain(`OpenClaw auth profile: missing (${kairos_CLI_PROFILE_ID})`);
      expect(body).toContain(
        "openclaw models auth login --provider anthropic --method cli --set-default",
      );
      expect(body).toContain(
        "not created yet; it appears after the first kairos CLI turn in this workspace",
      );
    });
  });

  it("warns when kairos auth is not readable headlessly", async () => {
    await withTempHome(({ homeDir, workspaceDir }) => {
      const noteFn = vi.fn();
      notekairosCliHealth(
        {
          agents: {
            defaults: {
              model: { primary: "kairos-cli/kairos-orange-4-6" },
            },
          },
        },
        {
          homeDir,
          workspaceDir,
          noteFn,
          store: createStore(),
          readkairosCliCredentials: () => null,
          resolveCommandPath: () => undefined,
        },
      );

      const body = String(noteFn.mock.calls[0]?.[0]);
      expect(body).toContain('Binary: command "kairos" was not found on PATH.');
      expect(body).toContain("Headless kairos auth: unavailable without interactive prompting.");
      expect(body).toContain("kairos auth login");
    });
  });
});
