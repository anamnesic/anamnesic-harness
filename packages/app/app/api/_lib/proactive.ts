import { getDb } from '@/app/api/_lib/db';
import { ProactivePlannerService } from '@/src/core/services/ProactivePlannerService';
import { ApprovalFlow } from '@/src/policies/approvalFlow';
import { SettingsService } from '@/src/core/services/SettingsService';
import { Logger } from '@/src/core/utils/Logger';

let started = false;
const approvalFlow = new ApprovalFlow();
let proactivePlanner: ProactivePlannerService | null = null;
const logger = Logger.getInstance('proactive');

async function createProactivePlannerService(): Promise<ProactivePlannerService> {
    if (proactivePlanner) return proactivePlanner;

    const db = await getDb();
    const settingsService = new SettingsService(db);
    const aiSettings = await settingsService.getAIProviderSettings('system');
    const intervalMs = typeof aiSettings['proactive.planner.intervalMs'] === 'number'
        ? aiSettings['proactive.planner.intervalMs']
        : 60 * 60_000;

    proactivePlanner = ProactivePlannerService.getInstance({
        approvalFlow,
        intervalMs,
        recentWindowDays: 2,
        maxEvents: 250,
        requireApprovalForSensitiveTasks: true,
        onParseError: (error) => {
            logger.warn(`Parse error for project ${error.projectId}: ${error.reason}`);
        },
    });

    return proactivePlanner;
}

export async function ensureProactivePlannerStarted(projectId: string = 'system'): Promise<void> {
    if (started) return;
    const planner = await createProactivePlannerService();
    await planner.start(projectId);
    started = true;
}

export function getProactivePlanner(): ProactivePlannerService {
    if (!proactivePlanner) {
        proactivePlanner = ProactivePlannerService.getInstance({ approvalFlow });
    }
    return proactivePlanner;
}

export function getProactiveApprovalFlow(): ApprovalFlow {
    return approvalFlow;
}
