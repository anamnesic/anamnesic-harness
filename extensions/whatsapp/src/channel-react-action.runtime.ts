import { readStringOrNumberParam, readStringParam } from "kairos/plugin-sdk/channel-actions";
import type { kairosConfig } from "kairos/plugin-sdk/config-types";

export { resolveReactionMessageId } from "kairos/plugin-sdk/channel-actions";
export { handleWhatsAppAction } from "./action-runtime.js";
export { isWhatsAppGroupJid, normalizeWhatsAppTarget } from "./normalize.js";
export { readStringOrNumberParam, readStringParam, type kairosConfig };
