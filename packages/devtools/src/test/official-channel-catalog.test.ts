import fs from "node:fs";
import path from "node:path";
import { bundledPluginRoot } from "kairos/plugin-sdk/test-fixtures";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildOfficialChannelCatalog,
  OFFICIAL_CHANNEL_CATALOG_RELATIVE_PATH,
  writeOfficialChannelCatalog,
} from "../scripts/write-official-channel-catalog.mjs";
import { describePluginInstallSource } from "../src/plugins/install-source-info.js";
import { cleanupTempDirs, makeTempRepoRoot, writeJsonFile } from "./helpers/temp-repo.js";

const tempDirs: string[] = [];

function makeRepoRoot(prefix: string): string {
  return makeTempRepoRoot(tempDirs, prefix);
}

function writeJson(filePath: string, value: unknown): void {
  writeJsonFile(filePath, value);
}

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe("buildOfficialChannelCatalog", () => {
  it("includes publishable official channel plugins and skips non-publishable entries", () => {
    const repoRoot = makeRepoRoot("kairos-official-channel-catalog-");
    writeJson(path.join(repoRoot, "extensions", "whatsapp", "package.json"), {
      name: "@kairos/whatsapp",
      version: "2026.3.23",
      description: "kairos WhatsApp channel plugin",
      kairos: {
        channel: {
          id: "whatsapp",
          label: "WhatsApp",
          selectionLabel: "WhatsApp (QR link)",
          detailLabel: "WhatsApp Web",
          docsPath: "/channels/whatsapp",
          blurb: "works with your own number; recommend a separate phone + eSIM.",
        },
        install: {
          npmSpec: "@kairos/whatsapp",
          localPath: bundledPluginRoot("whatsapp"),
          defaultChoice: "npm",
        },
        release: {
          publishToNpm: true,
        },
      },
    });
    writeJson(path.join(repoRoot, "extensions", "local-only", "package.json"), {
      name: "@kairos/local-only",
      kairos: {
        channel: {
          id: "local-only",
          label: "Local Only",
          selectionLabel: "Local Only",
          docsPath: "/channels/local-only",
          blurb: "dev only",
        },
        install: {
          localPath: bundledPluginRoot("local-only"),
        },
        release: {
          publishToNpm: false,
        },
      },
    });

    expect(buildOfficialChannelCatalog({ repoRoot }).entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "@wecom/wecom-kairos-plugin",
          kairos: expect.objectContaining({
            channel: expect.objectContaining({
              id: "wecom",
              label: "WeCom",
            }),
            install: {
              npmSpec: "@wecom/wecom-kairos-plugin@2026.4.23",
              defaultChoice: "npm",
              expectedIntegrity:
                "sha512-bnzfdIEEu1/LFvcdyjaTkyxt27w6c7dqhkPezU62OWaqmcdFsUGR3T55USK/O9pIKsNcnL1Tnu1pqKYCWHFgWQ==",
            },
          }),
        }),
        expect.objectContaining({
          name: "kairos-plugin-yuanbao",
          kairos: expect.objectContaining({
            channel: expect.objectContaining({
              id: "kairos-plugin-yuanbao",
              label: "Yuanbao",
            }),
            install: {
              npmSpec: "kairos-plugin-yuanbao@2.11.0",
              defaultChoice: "npm",
              expectedIntegrity:
                "sha512-lYmBrU71ox3v7dzRqaltvzTXPcMjjgYrNqpBj5HIBkXgEFkXRRG8wplXg9Fub41/FjsSPn3WAbYpdTc+k+jsHg==",
            },
          }),
        }),
        {
          name: "@kairos/whatsapp",
          version: "2026.3.23",
          description: "kairos WhatsApp channel plugin",
          kairos: {
            channel: {
              id: "whatsapp",
              label: "WhatsApp",
              selectionLabel: "WhatsApp (QR link)",
              detailLabel: "WhatsApp Web",
              docsPath: "/channels/whatsapp",
              blurb: "works with your own number; recommend a separate phone + eSIM.",
            },
            install: {
              npmSpec: "@kairos/whatsapp",
              defaultChoice: "npm",
            },
          },
        },
      ]),
    );
  });

  it("keeps official external catalog npm sources exactly pinned", () => {
    const repoRoot = makeRepoRoot("kairos-official-channel-catalog-policy-");
    const entries = buildOfficialChannelCatalog({ repoRoot }).entries.filter(
      (entry) => entry.source === "external",
    );

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const installSource = describePluginInstallSource(entry.kairos?.install ?? {});
      expect(installSource.warnings).toEqual([]);
      expect(installSource.npm?.pinState).toBe("exact-with-integrity");
    }
  });

  it("writes the official catalog under dist", () => {
    const repoRoot = makeRepoRoot("kairos-official-channel-catalog-write-");
    writeJson(path.join(repoRoot, "extensions", "whatsapp", "package.json"), {
      name: "@kairos/whatsapp",
      kairos: {
        channel: {
          id: "whatsapp",
          label: "WhatsApp",
          selectionLabel: "WhatsApp",
          docsPath: "/channels/whatsapp",
          blurb: "wa",
        },
        install: {
          npmSpec: "@kairos/whatsapp",
        },
        release: {
          publishToNpm: true,
        },
      },
    });

    writeOfficialChannelCatalog({ repoRoot });

    const outputPath = path.join(repoRoot, OFFICIAL_CHANNEL_CATALOG_RELATIVE_PATH);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(outputPath, "utf8")).entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "@wecom/wecom-kairos-plugin",
        }),
        expect.objectContaining({
          name: "kairos-plugin-yuanbao",
        }),
        {
          name: "@kairos/whatsapp",
          kairos: {
            channel: {
              id: "whatsapp",
              label: "WhatsApp",
              selectionLabel: "WhatsApp",
              docsPath: "/channels/whatsapp",
              blurb: "wa",
            },
            install: {
              npmSpec: "@kairos/whatsapp",
            },
          },
        },
      ]),
    );
  });
});
