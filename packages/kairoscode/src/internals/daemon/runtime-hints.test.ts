import { describe, expect, it } from "vitest";
import { buildPlatformRuntimeLogHints, buildPlatformServiceStartHints } from "./runtime-hints.js";

describe("buildPlatformRuntimeLogHints", () => {
  it("renders launchd log hints on darwin", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "darwin",
        env: {
          kairos_STATE_DIR: "/tmp/kairos-state",
          kairos_LOG_PREFIX: "gateway",
        },
        systemdServiceName: "kairos-gateway",
        windowsTaskName: "kairos Gateway",
      }),
    ).toEqual([
      "Launchd stdout (if installed): /tmp/kairos-state/logs/gateway.log",
      "Launchd stderr (if installed): /tmp/kairos-state/logs/gateway.err.log",
      "Restart attempts: /tmp/kairos-state/logs/gateway-restart.log",
    ]);
  });

  it("renders systemd and windows hints by platform", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "linux",
        env: {
          kairos_STATE_DIR: "/tmp/kairos-state",
        },
        systemdServiceName: "kairos-gateway",
        windowsTaskName: "kairos Gateway",
      }),
    ).toEqual([
      "Logs: journalctl --user -u kairos-gateway.service -n 200 --no-pager",
      "Restart attempts: /tmp/kairos-state/logs/gateway-restart.log",
    ]);
    expect(
      buildPlatformRuntimeLogHints({
        platform: "win32",
        env: {
          kairos_STATE_DIR: "/tmp/kairos-state",
        },
        systemdServiceName: "kairos-gateway",
        windowsTaskName: "kairos Gateway",
      }),
    ).toEqual([
      'Logs: schtasks /Query /TN "kairos Gateway" /V /FO LIST',
      "Restart attempts: /tmp/kairos-state/logs/gateway-restart.log",
    ]);
  });
});

describe("buildPlatformServiceStartHints", () => {
  it("builds platform-specific service start hints", () => {
    expect(
      buildPlatformServiceStartHints({
        platform: "darwin",
        installCommand: "kairos gateway install",
        startCommand: "kairos gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.kairos.gateway.plist",
        systemdServiceName: "kairos-gateway",
        windowsTaskName: "kairos Gateway",
      }),
    ).toEqual([
      "kairos gateway install",
      "kairos gateway",
      "launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.kairos.gateway.plist",
    ]);
    expect(
      buildPlatformServiceStartHints({
        platform: "linux",
        installCommand: "kairos gateway install",
        startCommand: "kairos gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.kairos.gateway.plist",
        systemdServiceName: "kairos-gateway",
        windowsTaskName: "kairos Gateway",
      }),
    ).toEqual([
      "kairos gateway install",
      "kairos gateway",
      "systemctl --user start kairos-gateway.service",
    ]);
  });
});
