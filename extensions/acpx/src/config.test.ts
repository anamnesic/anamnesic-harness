import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAcpxPluginConfig, resolveAcpxPluginRoot } from "./config.js";

describe("embedded acpx plugin config", () => {
  it("resolves workspace stateDir and cwd by default", () => {
    const workspaceDir = "/tmp/kairos-acpx";
    const resolved = resolveAcpxPluginConfig({
      rawConfig: undefined,
      workspaceDir,
    });

    expect(resolved.cwd).toBe(workspaceDir);
    expect(resolved.stateDir).toBe(path.join(workspaceDir, "state"));
    expect(resolved.permissionMode).toBe("approve-reads");
    expect(resolved.nonInteractivePermissions).toBe("fail");
    expect(resolved.timeoutSeconds).toBe(120);
    expect(resolved.agents).toEqual({});
  });

  it("keeps explicit timeoutSeconds config", () => {
    const resolved = resolveAcpxPluginConfig({
      rawConfig: {
        timeoutSeconds: 300,
      },
      workspaceDir: "/tmp/kairos-acpx",
    });

    expect(resolved.timeoutSeconds).toBe(300);
  });

  it("keeps explicit probeAgent config", () => {
    const resolved = resolveAcpxPluginConfig({
      rawConfig: {
        probeAgent: "kairos",
      },
      workspaceDir: "/tmp/kairos-acpx",
    });

    expect(resolved.probeAgent).toBe("kairos");
  });

  it("accepts agent command overrides", () => {
    const resolved = resolveAcpxPluginConfig({
      rawConfig: {
        agents: {
          kairos: { command: "kairos --acp" },
          codex: { command: "codex custom-acp" },
        },
      },
      workspaceDir: "/tmp/kairos-acpx",
    });

    expect(resolved.agents).toEqual({
      kairos: "kairos --acp",
      codex: "codex custom-acp",
    });
  });

  it("leaves probeAgent undefined by default so the runtime picks its built-in probe agent", () => {
    const resolved = resolveAcpxPluginConfig({
      rawConfig: undefined,
      workspaceDir: "/tmp/kairos-acpx",
    });

    expect(resolved.probeAgent).toBeUndefined();
  });

  it("carries an explicit probeAgent through to the resolved plugin config, trimmed and lowercased", () => {
    const resolved = resolveAcpxPluginConfig({
      rawConfig: {
        probeAgent: "  kairos  ",
      },
      workspaceDir: "/tmp/kairos-acpx",
    });

    expect(resolved.probeAgent).toBe("kairos");
  });

  it("rejects an empty probeAgent string", () => {
    expect(() =>
      resolveAcpxPluginConfig({
        rawConfig: {
          probeAgent: "",
        },
        workspaceDir: "/tmp/kairos-acpx",
      }),
    ).toThrow(/probeAgent must be a non-empty string/);
  });

  it("injects the built-in plugin-tools MCP server only when explicitly enabled", () => {
    const resolved = resolveAcpxPluginConfig({
      rawConfig: {
        pluginToolsMcpBridge: true,
      },
      workspaceDir: "/tmp/kairos-acpx",
    });

    const server = resolved.mcpServers["kairos-plugin-tools"];
    expect(server).toBeDefined();
    expect(server.command).toBe(process.execPath);
    expect(Array.isArray(server.args)).toBe(true);
    expect(server.args?.length).toBeGreaterThan(0);
  });

  it("injects the built-in kairos tools MCP server only when explicitly enabled", () => {
    const resolved = resolveAcpxPluginConfig({
      rawConfig: {
        kairosToolsMcpBridge: true,
      },
      workspaceDir: "/tmp/kairos-acpx",
    });

    const server = resolved.mcpServers["kairos-tools"];
    expect(server).toBeDefined();
    expect(server.command).toBe(process.execPath);
    expect(Array.isArray(server.args)).toBe(true);
    expect(server.args?.length).toBeGreaterThan(0);
  });

  it("keeps the runtime json schema in sync with the manifest config schema", () => {
    const pluginRoot = resolveAcpxPluginRoot();
    const manifest = JSON.parse(
      fs.readFileSync(path.join(pluginRoot, "kairos.plugin.json"), "utf8"),
    ) as { configSchema?: unknown };

    expect(manifest.configSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: expect.objectContaining({
        cwd: expect.any(Object),
        stateDir: expect.any(Object),
        probeAgent: expect.any(Object),
        timeoutSeconds: expect.objectContaining({
          default: 120,
        }),
        agents: expect.any(Object),
        mcpServers: expect.any(Object),
        kairosToolsMcpBridge: expect.any(Object),
      }),
    });
  });
});
