import os from "node:os";
import { movePathToTrash as movePathToTrashWithAllowedRoots } from "kairos/plugin-sdk/browser-config";
import { resolvePreferredkairosTmpDir } from "kairos/plugin-sdk/temp-path";

export async function movePathToTrash(targetPath: string): Promise<string> {
  return await movePathToTrashWithAllowedRoots(targetPath, {
    allowedRoots: [os.homedir(), resolvePreferredkairosTmpDir()],
  });
}
