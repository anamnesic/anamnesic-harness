import { resolveApprovalOverGateway } from "kairos/plugin-sdk/approval-gateway-runtime";
import type { ExecApprovalReplyDecision } from "kairos/plugin-sdk/approval-runtime";
import type { kairosConfig } from "kairos/plugin-sdk/config-types";
import { isApprovalNotFoundError } from "kairos/plugin-sdk/error-runtime";

export { isApprovalNotFoundError };

export async function resolveMatrixApproval(params: {
  cfg: kairosConfig;
  approvalId: string;
  decision: ExecApprovalReplyDecision;
  senderId?: string | null;
  gatewayUrl?: string;
}): Promise<void> {
  await resolveApprovalOverGateway({
    cfg: params.cfg,
    approvalId: params.approvalId,
    decision: params.decision,
    senderId: params.senderId,
    gatewayUrl: params.gatewayUrl,
    clientDisplayName: `Matrix approval (${params.senderId?.trim() || "unknown"})`,
  });
}
