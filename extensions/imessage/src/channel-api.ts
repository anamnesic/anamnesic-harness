import { formatTrimmedAllowFromEntries } from "kairos/plugin-sdk/channel-config-helpers";
import type { ChannelStatusIssue } from "kairos/plugin-sdk/channel-contract";
import { PAIRING_APPROVED_MESSAGE } from "kairos/plugin-sdk/channel-status";
import {
  DEFAULT_ACCOUNT_ID,
  getChatChannelMeta,
  type ChannelPlugin,
  type kairosConfig,
} from "kairos/plugin-sdk/core";
import { resolveChannelMediaMaxBytes } from "kairos/plugin-sdk/media-runtime";
import { collectStatusIssuesFromLastError } from "kairos/plugin-sdk/status-helpers";
import {
  resolveIMessageConfigAllowFrom,
  resolveIMessageConfigDefaultTo,
} from "./config-accessors.js";
import { looksLikeIMessageTargetId, normalizeIMessageMessagingTarget } from "./normalize.js";
export { chunkTextForOutbound } from "kairos/plugin-sdk/text-chunking";

export {
  collectStatusIssuesFromLastError,
  DEFAULT_ACCOUNT_ID,
  formatTrimmedAllowFromEntries,
  getChatChannelMeta,
  looksLikeIMessageTargetId,
  normalizeIMessageMessagingTarget,
  PAIRING_APPROVED_MESSAGE,
  resolveChannelMediaMaxBytes,
  resolveIMessageConfigAllowFrom,
  resolveIMessageConfigDefaultTo,
};

export type { ChannelPlugin, ChannelStatusIssue, kairosConfig };
