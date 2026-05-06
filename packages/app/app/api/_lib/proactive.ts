import { ProactivePlannerService } from '@/src/core/services/ProactivePlannerService';
import { ApprovalFlow } from '@/src/policies/approvalFlow';

let started = false;
const approvalFlow = new ApprovalFlow();
const proactivePlanner = ProactivePlannerService.getInstance({
    approvalFlow,
    intervalMs: 5 * 60_000,
    recentWindowDays: 2,
    maxEvents: 250,
    requireApprovalForSensitiveTasks: true,
});

export async function ensureProactivePlannerStarted(projectId: string = 'system'): Promise<void> {
    if (started) return;
    await proactivePlanner.start(projectId);
    started = true;
}

export function getProactivePlanner(): ProactivePlannerService {
    return proactivePlanner;
}

export function getProactiveApprovalFlow(): ApprovalFlow {
    return approvalFlow;
}
