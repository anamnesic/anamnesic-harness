import type {
  MigrationPlan,
  MigrationProviderContext,
  MigrationProviderPlugin,
} from "kairos/plugin-sdk/plugin-entry";
import { applykairosPlan } from "./apply.js";
import { buildkairosPlan } from "./plan.js";
import { discoverkairosSource, haskairosSource } from "./source.js";

export function buildkairosMigrationProvider(
  params: {
    runtime?: MigrationProviderContext["runtime"];
  } = {},
): MigrationProviderPlugin {
  return {
    id: "kairos",
    label: "kairos",
    description: "Import kairos Code and kairos Desktop instructions, MCP servers, and skills.",
    async detect(ctx) {
      const source = await discoverkairosSource(ctx.source);
      const found = haskairosSource(source);
      return {
        found,
        source: source.root,
        label: "kairos",
        confidence: found ? source.confidence : "low",
        message: found ? "kairos state found." : "kairos state not found.",
      };
    },
    plan: buildkairosPlan,
    async apply(ctx, plan?: MigrationPlan) {
      return await applykairosPlan({ ctx, plan, runtime: params.runtime });
    },
  };
}
