import os from "node:os";
import path from "node:path";
import { exists, isDirectory, readJsonObject, resolveHomePath } from "./helpers.js";

export type kairosArchivePath = {
  id: string;
  path: string;
  relativePath: string;
};

export type kairosSource = {
  root: string;
  confidence: "low" | "medium" | "high";
  homeDir?: string;
  projectDir?: string;
  homeProjectsDir?: string;
  userSettingsPath?: string;
  userLocalSettingsPath?: string;
  userkairosJsonPath?: string;
  userMemoryPath?: string;
  projectSettingsPath?: string;
  projectLocalSettingsPath?: string;
  projectMcpPath?: string;
  projectMemoryPath?: string;
  projectDotkairosMemoryPath?: string;
  projectLocalMemoryPath?: string;
  projectRulesDir?: string;
  userSkillsDir?: string;
  projectSkillsDir?: string;
  userCommandsDir?: string;
  projectCommandsDir?: string;
  userAgentsDir?: string;
  projectAgentsDir?: string;
  desktopConfigPath?: string;
  archivePaths: kairosArchivePath[];
};

const HOME_ARCHIVE_DIRS = ["projects", "cache", "plans"] as const;
const PROJECT_ARCHIVE_FILES = [".kairos/scheduled_tasks.json"] as const;

function defaultkairosHome(): string {
  return path.join(os.homedir(), ".kairos");
}

function defaultDesktopConfig(): string {
  return path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "kairos",
    "kairos_desktop_config.json",
  );
}

async function addArchivePath(
  archivePaths: kairosArchivePath[],
  id: string,
  candidate: string,
  relativePath: string,
): Promise<void> {
  if ((await exists(candidate)) || (await isDirectory(candidate))) {
    archivePaths.push({ id, path: candidate, relativePath });
  }
}

export async function discoverkairosSource(input?: string): Promise<kairosSource> {
  const explicitInput = Boolean(input?.trim());
  const root = resolveHomePath(input?.trim() || defaultkairosHome());
  const rootIsHome = path.basename(root) === ".kairos";
  const inspectGlobal = !explicitInput || rootIsHome;
  const homeDir = inspectGlobal ? (rootIsHome ? root : defaultkairosHome()) : undefined;
  const projectDir = rootIsHome ? undefined : root;
  const archivePaths: kairosArchivePath[] = [];

  const userSettingsPath = homeDir ? path.join(homeDir, "settings.json") : undefined;
  const userLocalSettingsPath = homeDir ? path.join(homeDir, "settings.local.json") : undefined;
  const userkairosJsonPath = inspectGlobal ? path.join(os.homedir(), ".kairos.json") : undefined;
  const userMemoryPath = homeDir ? path.join(homeDir, "kairos.md") : undefined;
  const desktopConfigPath = inspectGlobal ? defaultDesktopConfig() : undefined;
  const homeProjectsDir = homeDir ? path.join(homeDir, "projects") : undefined;
  const userSkillsDir = homeDir ? path.join(homeDir, "skills") : undefined;
  const userCommandsDir = homeDir ? path.join(homeDir, "commands") : undefined;
  const userAgentsDir = homeDir ? path.join(homeDir, "agents") : undefined;

  if (homeDir) {
    for (const dir of HOME_ARCHIVE_DIRS) {
      await addArchivePath(archivePaths, `archive:home:${dir}`, path.join(homeDir, dir), dir);
    }
  }

  const source: kairosSource = {
    root,
    confidence: "low",
    archivePaths,
    ...(homeDir && (await isDirectory(homeDir)) ? { homeDir } : {}),
    ...(homeProjectsDir && (await isDirectory(homeProjectsDir)) ? { homeProjectsDir } : {}),
    ...(projectDir ? { projectDir } : {}),
    ...(userSettingsPath && (await exists(userSettingsPath)) ? { userSettingsPath } : {}),
    ...(userLocalSettingsPath && (await exists(userLocalSettingsPath))
      ? { userLocalSettingsPath }
      : {}),
    ...(userkairosJsonPath && (await exists(userkairosJsonPath)) ? { userkairosJsonPath } : {}),
    ...(userMemoryPath && (await exists(userMemoryPath)) ? { userMemoryPath } : {}),
    ...(userSkillsDir && (await isDirectory(userSkillsDir)) ? { userSkillsDir } : {}),
    ...(userCommandsDir && (await isDirectory(userCommandsDir)) ? { userCommandsDir } : {}),
    ...(userAgentsDir && (await isDirectory(userAgentsDir)) ? { userAgentsDir } : {}),
    ...(desktopConfigPath && (await exists(desktopConfigPath)) ? { desktopConfigPath } : {}),
  };

  if (projectDir) {
    const projectSettingsPath = path.join(projectDir, ".kairos", "settings.json");
    const projectLocalSettingsPath = path.join(projectDir, ".kairos", "settings.local.json");
    const projectMcpPath = path.join(projectDir, ".mcp.json");
    const projectMemoryPath = path.join(projectDir, "kairos.md");
    const projectDotkairosMemoryPath = path.join(projectDir, ".kairos", "kairos.md");
    const projectLocalMemoryPath = path.join(projectDir, "kairos.local.md");
    const projectRulesDir = path.join(projectDir, ".kairos", "rules");
    const projectSkillsDir = path.join(projectDir, ".kairos", "skills");
    const projectCommandsDir = path.join(projectDir, ".kairos", "commands");
    const projectAgentsDir = path.join(projectDir, ".kairos", "agents");
    Object.assign(source, {
      ...((await exists(projectSettingsPath)) ? { projectSettingsPath } : {}),
      ...((await exists(projectLocalSettingsPath)) ? { projectLocalSettingsPath } : {}),
      ...((await exists(projectMcpPath)) ? { projectMcpPath } : {}),
      ...((await exists(projectMemoryPath)) ? { projectMemoryPath } : {}),
      ...((await exists(projectDotkairosMemoryPath)) ? { projectDotkairosMemoryPath } : {}),
      ...((await exists(projectLocalMemoryPath)) ? { projectLocalMemoryPath } : {}),
      ...((await isDirectory(projectRulesDir)) ? { projectRulesDir } : {}),
      ...((await isDirectory(projectSkillsDir)) ? { projectSkillsDir } : {}),
      ...((await isDirectory(projectCommandsDir)) ? { projectCommandsDir } : {}),
      ...((await isDirectory(projectAgentsDir)) ? { projectAgentsDir } : {}),
    });
    for (const file of PROJECT_ARCHIVE_FILES) {
      await addArchivePath(
        archivePaths,
        `archive:project:${file}`,
        path.join(projectDir, file),
        file,
      );
    }
  }

  const kairosJson = await readJsonObject(source.userkairosJsonPath);
  const haskairosJsonState = Boolean(kairosJson.mcpServers || kairosJson.projects);
  const desktopConfig = await readJsonObject(source.desktopConfigPath);
  const hasDesktopMcp = Boolean(desktopConfig.mcpServers);
  const high = Boolean(
    source.userSettingsPath ||
    source.userMemoryPath ||
    source.projectSettingsPath ||
    source.projectMcpPath ||
    source.projectMemoryPath ||
    source.projectDotkairosMemoryPath ||
    haskairosJsonState ||
    hasDesktopMcp,
  );
  const medium = Boolean(
    source.userSkillsDir ||
    source.projectSkillsDir ||
    source.userCommandsDir ||
    source.projectCommandsDir ||
    source.userAgentsDir ||
    source.projectAgentsDir ||
    source.projectRulesDir ||
    source.projectLocalMemoryPath ||
    source.homeProjectsDir,
  );
  source.confidence = high ? "high" : medium ? "medium" : "low";
  return source;
}

export function haskairosSource(source: kairosSource): boolean {
  return source.confidence !== "low";
}
