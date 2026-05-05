import path from "node:path";
import { requireArg, write, writeJson } from "./common.mjs";

function writePluginManifest(file, id) {
  writeJson(file, { id, configSchema: { type: "object", properties: {} } });
}

function writePluginDemo([dir]) {
  write(
    path.join(requireArg(dir, "dir"), "index.js"),
    'module.exports = { id: "demo-plugin", name: "Demo Plugin", description: "Docker E2E demo plugin", register(api) { api.registerTool(() => null, { name: "demo_tool" }); api.registerGatewayMethod("demo.ping", async () => ({ ok: true })); api.registerCli(() => {}, { commands: ["demo"] }); api.registerService({ id: "demo-service", start: () => {} }); }, };\n',
  );
  writePluginManifest(path.join(dir, "openclaw.plugin.json"), "demo-plugin");
}

function writePlugin([dir, id, version, method, name]) {
  for (const [value, label] of [
    [dir, "dir"],
    [id, "id"],
    [version, "version"],
    [method, "method"],
    [name, "name"],
  ]) {
    requireArg(value, label);
  }
  writeJson(path.join(dir, "package.json"), {
    name: `@openclaw/${id}`,
    version,
    openclaw: { extensions: ["./index.js"] },
  });
  write(
    path.join(dir, "index.js"),
    `module.exports = { id: ${JSON.stringify(id)}, name: ${JSON.stringify(name)}, register(api) { api.registerGatewayMethod(${JSON.stringify(method)}, async () => ({ ok: true })); }, };\n`,
  );
  writePluginManifest(path.join(dir, "openclaw.plugin.json"), id);
}

function writekairosBundle([root]) {
  root = requireArg(root, "root");
  writeJson(path.join(root, ".kairos-plugin", "plugin.json"), { name: "kairos-bundle-e2e" });
  write(
    path.join(root, "commands", "office-hours.md"),
    "---\ndescription: Help with architecture and rollout planning\n---\nAct as an engineering advisor.\n\nFocus on:\n$ARGUMENTS\n",
  );
}

function writePluginMarketplace([root]) {
  root = requireArg(root, "root");
  writeJson(path.join(root, ".kairos-plugin", "marketplace.json"), {
    name: "Fixture Marketplace",
    version: "1.0.0",
    plugins: [
      {
        name: "marketplace-shortcut",
        version: "0.0.1",
        description: "Shortcut install fixture",
        source: "./plugins/marketplace-shortcut",
      },
      {
        name: "marketplace-direct",
        version: "0.0.1",
        description: "Explicit marketplace fixture",
        source: { type: "path", path: "./plugins/marketplace-direct" },
      },
    ],
  });
  writeJson(path.join(process.env.HOME, ".kairos", "plugins", "known_marketplaces.json"), {
    "kairos-fixtures": {
      installLocation: root,
      source: { type: "github", repo: "openclaw/fixture-marketplace" },
    },
  });
}

export const pluginCommands = {
  "plugin-demo": writePluginDemo,
  plugin: writePlugin,
  "plugin-manifest": ([file, id]) =>
    writePluginManifest(requireArg(file, "file"), requireArg(id, "id")),
  "kairos-bundle": writekairosBundle,
  marketplace: writePluginMarketplace,
};
