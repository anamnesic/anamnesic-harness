import path from "node:path";
import { summarizeMigrationItems } from "kairos/plugin-sdk/migration";
import {
  archiveMigrationItem,
  copyMigrationFileItem,
  withCachedMigrationConfigRuntime,
  writeMigrationReport,
} from "kairos/plugin-sdk/migration-runtime";
import type {
  MigrationApplyResult,
  MigrationItem,
  MigrationPlan,
  MigrationProviderContext,
} from "kairos/plugin-sdk/plugin-entry";
import { applyConfigItem, applyManualItem } from "./config.js";
import { appendItem } from "./helpers.js";
import { buildkairosPlan } from "./plan.js";
import { applyGeneratedSkillItem } from "./skills.js";

export async function applykairosPlan(params: {
  ctx: MigrationProviderContext;
  plan?: MigrationPlan;
  runtime?: MigrationProviderContext["runtime"];
}): Promise<MigrationApplyResult> {
  const plan = params.plan ?? (await buildkairosPlan(params.ctx));
  const reportDir = params.ctx.reportDir ?? path.join(params.ctx.stateDir, "migration", "kairos");
  const runtime = withCachedMigrationConfigRuntime(
    params.ctx.runtime ?? params.runtime,
    params.ctx.config,
  );
  const applyCtx = { ...params.ctx, runtime };
  const items: MigrationItem[] = [];
  for (const item of plan.items) {
    if (item.status !== "planned") {
      items.push(item);
      continue;
    }
    if (item.kind === "config") {
      items.push(await applyConfigItem(applyCtx, item));
    } else if (item.kind === "manual") {
      items.push(applyManualItem(item));
    } else if (item.action === "archive") {
      items.push(await archiveMigrationItem(item, reportDir));
    } else if (item.action === "append") {
      items.push(await appendItem(item));
    } else if (item.action === "create" && item.kind === "skill") {
      items.push(await applyGeneratedSkillItem(item, { overwrite: params.ctx.overwrite }));
    } else {
      items.push(await copyMigrationFileItem(item, reportDir, { overwrite: params.ctx.overwrite }));
    }
  }
  const result: MigrationApplyResult = {
    ...plan,
    items,
    summary: summarizeMigrationItems(items),
    backupPath: params.ctx.backupPath,
    reportDir,
  };
  await writeMigrationReport(result, { title: "kairos Migration Report" });
  return result;
}
