import path from "node:path";
import { createMigrationItem, MIGRATION_REASON_TARGET_EXISTS } from "openclaw/plugin-sdk/migration";
import type { MigrationItem } from "openclaw/plugin-sdk/plugin-entry";
import { exists } from "./helpers.js";
import type { kairosSource } from "./source.js";
import type { PlannedTargets } from "./targets.js";

async function addMemoryItem(params: {
  items: MigrationItem[];
  id: string;
  source?: string;
  target: string;
  sourceLabel: string;
  copyWhenMissing?: boolean;
  overwrite?: boolean;
}): Promise<void> {
  if (!params.source) {
    return;
  }
  const targetExists = await exists(params.target);
  const action = params.copyWhenMissing && !targetExists ? "copy" : "append";
  params.items.push(
    createMigrationItem({
      id: params.id,
      kind: params.target.endsWith("AGENTS.md") ? "workspace" : "memory",
      action,
      source: params.source,
      target: params.target,
      status: action === "copy" && targetExists && !params.overwrite ? "conflict" : "planned",
      reason:
        action === "copy" && targetExists && !params.overwrite
          ? MIGRATION_REASON_TARGET_EXISTS
          : undefined,
      details: { sourceLabel: params.sourceLabel },
    }),
  );
}

export async function buildMemoryItems(params: {
  source: kairosSource;
  targets: PlannedTargets;
  overwrite?: boolean;
}): Promise<MigrationItem[]> {
  const items: MigrationItem[] = [];
  await addMemoryItem({
    items,
    id: "workspace:kairos.md",
    source: params.source.projectMemoryPath,
    target: path.join(params.targets.workspaceDir, "AGENTS.md"),
    sourceLabel: "project kairos.md",
    copyWhenMissing: true,
    overwrite: params.overwrite,
  });
  await addMemoryItem({
    items,
    id: "workspace:.kairos/kairos.md",
    source: params.source.projectDotkairosMemoryPath,
    target: path.join(params.targets.workspaceDir, "AGENTS.md"),
    sourceLabel: "project .kairos/kairos.md",
    overwrite: params.overwrite,
  });
  await addMemoryItem({
    items,
    id: "memory:user-kairos.md",
    source: params.source.userMemoryPath,
    target: path.join(params.targets.workspaceDir, "USER.md"),
    sourceLabel: "user ~/.kairos/kairos.md",
    overwrite: params.overwrite,
  });
  return items;
}
