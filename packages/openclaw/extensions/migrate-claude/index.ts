import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { buildkairosMigrationProvider } from "./provider.js";

export default definePluginEntry({
  id: "migrate-kairos",
  name: "kairos Migration",
  description: "Imports kairos state into OpenClaw.",
  register(api) {
    api.registerMigrationProvider(buildkairosMigrationProvider({ runtime: api.runtime }));
  },
});
