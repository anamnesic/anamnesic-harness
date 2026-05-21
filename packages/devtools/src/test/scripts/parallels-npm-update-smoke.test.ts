import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = "scripts/e2e/parallels/npm-update-smoke.ts";
const UPDATE_SCRIPTS_PATH = "scripts/e2e/parallels/npm-update-scripts.ts";

describe("parallels npm update smoke", () => {
  it("does not leave guard/server children attached to the wrapper", () => {
    const script = readFileSync(SCRIPT_PATH, "utf8");

    expect(script).toContain("spawnLogged");
    expect(script).toContain('child.on("close"');
    expect(script).toContain("await this.server?.stop()");
  });

  it("runs Windows updates through a detached done-file runner", () => {
    const script = readFileSync(SCRIPT_PATH, "utf8");

    expect(script).toContain("kairos-parallels-npm-update-windows");
    expect(script).toContain("runStreaming");
    expect(script).toContain("__kairos_BACKGROUND_EXIT__");
    expect(script).toContain("__kairos_BACKGROUND_DONE__");
    expect(script).toContain("Windows update timed out");
  });

  it("scrubs future plugin entries before invoking old same-guest updaters", () => {
    const script = readFileSync(UPDATE_SCRIPTS_PATH, "utf8");

    expect(script).toContain("Remove-FuturePluginEntries");
    expect(script).toContain("scrub_future_plugin_entries");
    expect(script).toContain("delete plugins.entries.feishu");
    expect(script).toContain("delete plugins.entries.whatsapp");
    expect(script).toContain("Remove-FuturePluginEntries\nStop-kairosGatewayProcesses");
    expect(script).toContain("scrub_future_plugin_entries\nstop_kairos_gateway_processes");
    expect(script).toContain("$env:kairos_DISABLE_BUNDLED_PLUGINS = '1'");
    expect(script).toContain(
      "kairos_DISABLE_BUNDLED_PLUGINS=1 /opt/homebrew/bin/kairos update --tag",
    );
    expect(script).toContain("kairos_DISABLE_BUNDLED_PLUGINS=1 kairos update --tag");
    expect(script).toContain(
      "kairos_DISABLE_BUNDLED_PLUGINS=1 /opt/homebrew/bin/kairos gateway stop",
    );
    expect(script).toContain("kairos_DISABLE_BUNDLED_PLUGINS=1 kairos gateway stop");
  });
});
