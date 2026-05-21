import { listSkillCommandsForAgents as listSkillCommandsForAgentsImpl } from "kairos/plugin-sdk/command-auth";

type ListSkillCommandsForAgents =
  typeof import("kairos/plugin-sdk/command-auth").listSkillCommandsForAgents;

export function listSkillCommandsForAgents(
  ...args: Parameters<ListSkillCommandsForAgents>
): ReturnType<ListSkillCommandsForAgents> {
  return listSkillCommandsForAgentsImpl(...args);
}
