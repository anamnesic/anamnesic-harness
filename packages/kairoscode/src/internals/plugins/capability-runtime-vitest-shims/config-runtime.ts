import { resolveActiveTalkProviderConfig } from "../../config/talk.js";
import type { kairosConfig } from "../../config/types.js";

export { resolveActiveTalkProviderConfig };

export function getRuntimeConfigSnapshot(): kairosConfig | null {
  return null;
}
