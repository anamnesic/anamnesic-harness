export {
  implicitMentionKindWhen,
  resolveInboundMentionDecision,
} from "kairos/plugin-sdk/channel-mention-gating";
export { hasControlCommand } from "kairos/plugin-sdk/command-detection";
export { recordPendingHistoryEntryIfEnabled } from "kairos/plugin-sdk/reply-history";
export { parseActivationCommand } from "kairos/plugin-sdk/group-activation";
export { normalizeE164 } from "../../text-runtime.js";
