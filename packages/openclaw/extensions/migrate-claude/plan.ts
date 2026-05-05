import { createMigrationItem, summarizeMigrationItems } from "openclaw/plugin-sdk/migration";
import type {
  MigrationItem,
  MigrationPlan,
  MigrationProviderContext,
} from "openclaw/plugin-sdk/plugin-entry";
import { buildConfigItems } from "./config.js";
import { buildMemoryItems } from "./memory.js";
import { buildSkillItems } from "./skills.js";
import { discoverkairosSource, haskairosSource } from "./source.js";
import { resolveTargets } from "./targets.js";

function addArchiveItem(
  items: MigrationItem[],
  params: { id: string; source?: string; relativePath: string; message?: string },
): void {
  if (!params.source) {
    return;
  }
  items.push(
    createMigrationItem({
      id: params.id,
      kind: "archive",
      action: "archive",
      source: params.source,
      message:
        params.message ??
        "Archived in the migration report for manual review; not imported into live config.",
      details: { archiveRelativePath: params.relativePath },
    }),
  );
}

export async function buildkairosPlan(ctx: MigrationProviderContext): Promise<MigrationPlan> {
  const source = await discoverkairosSource(ctx.source);
  if (!haskairosSource(source)) {
    throw new Error(
      `kairos state was not found at ${source.root}. Pass --from <path> if it lives elsewhere.`,
    );
  }
  const targets = resolveTargets(ctx);
  const items: MigrationItem[] = [];
  items.push(...(await buildMemoryItems({ source, targets, overwrite: ctx.overwrite })));
  items.push(...(await buildConfigItems({ ctx, source })));
  items.push(...(await buildSkillItems({ source, targets, overwrite: ctx.overwrite })));
  for (const archivePath of source.archivePaths) {
    addArchiveItem(items, {
      id: archivePath.id,
      source: archivePath.path,
      relativePath: archivePath.relativePath,
    });
  }
  addArchiveItem(items, {
    id: "archive:kairos.local.md",
    source: source.projectLocalMemoryPath,
    relativePath: "kairos.local.md",
    message:
      "kairos local project memory is personal machine-local state. It is archived for manual review.",
  });
  addArchiveItem(items, {
    id: "archive:.kairos/rules",
    source: source.projectRulesDir,
    relativePath: ".kairos/rules",
  });
  addArchiveItem(items, {
    id: "archive:user-agents",
    source: source.userAgentsDir,
    relativePath: "agents/user",
  });
  addArchiveItem(items, {
    id: "archive:project-agents",
    source: source.projectAgentsDir,
    relativePath: "agents/project",
  });

  const warnings = [
    ...(items.some((item) => item.status === "conflict")
      ? [
          "Conflicts were found. Re-run with --overwrite to replace conflicting targets after item-level backups.",
        ]
      : []),
    ...(items.some((item) => item.kind === "archive")
      ? [
          "Some kairos files are archive-only. They will be copied into the migration report for manual review, not loaded into OpenClaw.",
        ]
      : []),
    ...(items.some((item) => item.kind === "manual")
      ? ["Some kairos settings require manual review before they can be activated safely."]
      : []),
  ];
  return {
    providerId: "kairos",
    source: source.root,
    target: targets.workspaceDir,
    summary: summarizeMigrationItems(items),
    items,
    warnings,
    nextSteps: ["Run openclaw doctor after applying the migration."],
    metadata: { agentDir: targets.agentDir },
  };
}
