export const runtime = 'nodejs';

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { NextRequest } from 'next/server';
import { err, ok } from '@/app/api/_lib/response';
import { ensureProactivePlannerStarted, getProactiveApprovalFlow, getProactivePlanner } from '@/app/api/_lib/proactive';
import { vaultAppend } from '@kairos/vault';

const execAsync = promisify(exec);

function resolveActor(req: NextRequest): string {
    return req.headers.get('x-user-id') || req.headers.get('x-workspace-id') || 'ui-user';
}

async function appendDecisionLog(entry: Record<string, unknown>) {
    await vaultAppend('self-optimization/decisions.log', JSON.stringify(entry));
}

export async function GET(req: NextRequest) {
    try {
        await ensureProactivePlannerStarted('system');

        const planner = getProactivePlanner();
        const approvals = getProactiveApprovalFlow();
        const refresh = new URL(req.url).searchParams.get('refresh') === '1';

        const latest = refresh
            ? await planner.runNow('system')
            : (planner.getLatestPlan() ?? await planner.runNow('system'));

        const pending = latest.pendingApprovals.map((item) => {
            const state = approvals.get(item.requestId);
            return {
                ...item,
                status: state?.status ?? 'pending',
                requestedAt: state?.requestedAt?.toISOString?.() ?? null,
                expiresAt: state?.expiresAt?.toISOString?.() ?? null,
                reason: state?.reason ?? item.reason,
            };
        });

        return ok({
            generatedAt: latest.generatedAt,
            provider: latest.provider,
            command: latest.command,
            inputEvents: latest.inputEvents,
            plan: latest.plan,
            pendingApprovals: pending,
            outputFile: latest.outputFile,
        });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to load proactive insights', 500, String(error));
    }
}

export async function POST(req: NextRequest) {
    try {
        await ensureProactivePlannerStarted('system');

        const body = await req.json().catch(() => ({}));
        const action = typeof body?.action === 'string' ? body.action : '';
        const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
        const actor = resolveActor(req);

        const planner = getProactivePlanner();
        const approvals = getProactiveApprovalFlow();

        if (action === 'refresh') {
            const refreshed = await planner.runNow('system');
            return ok({ refreshedAt: refreshed.generatedAt });
        }

        if (action === 'execute-task') {
            const taskTitle = typeof body?.taskTitle === 'string' ? body.taskTitle : '';
            const taskDescription = typeof body?.taskDescription === 'string' ? body.taskDescription : '';

            if (!taskTitle && !taskDescription) {
                return err('TASK_INFO_REQUIRED', 'taskTitle or taskDescription is required', 400);
            }

            const prompt = taskDescription || taskTitle;
            const opencodeBin = process.env.OPENCODE_BIN || 'opencode';
            const { stdout, stderr } = await execAsync(`"${opencodeBin}" "${prompt.replace(/"/g, '\\"')}"`).catch((e) => ({
                stdout: '',
                stderr: String(e),
            }));

            await appendDecisionLog({
                suggestionId: `task-${taskTitle.slice(0, 40)}-${Date.now()}`,
                decision: 'executed',
                actor,
                reason: `Executado por ${actor}: ${taskTitle}`,
                timestamp: new Date().toISOString(),
                stdout: stdout.slice(0, 2000),
                stderr: stderr.slice(0, 2000),
            });

            return ok({
                executed: true,
                taskTitle,
                stdout: stdout.slice(0, 2000),
                stderr: stderr.slice(0, 2000),
            });
        }

        if (!requestId) {
            return err('REQUEST_ID_REQUIRED', 'requestId is required for approval actions', 400);
        }

        if (action === 'approve') {
            approvals.approve(requestId, actor);
            await appendDecisionLog({
                suggestionId: requestId,
                decision: 'accepted',
                actor,
                reason: `Aprovado por ${actor}`,
                timestamp: new Date().toISOString(),
            });
            return ok({ requestId, status: 'approved' });
        }

        if (action === 'reject') {
            const reason = typeof body?.reason === 'string' ? body.reason : `Negado por ${actor}`;
            approvals.deny(requestId, actor, reason);
            await appendDecisionLog({
                suggestionId: requestId,
                decision: 'rejected',
                actor,
                reason,
                timestamp: new Date().toISOString(),
            });
            return ok({ requestId, status: 'denied' });
        }

        if (action === 'postpone') {
            const ttlMs = typeof body?.ttlMs === 'number' ? body.ttlMs : undefined;
            const postponed = approvals.postpone(requestId, actor, ttlMs);
            await appendDecisionLog({
                suggestionId: requestId,
                decision: 'pending',
                actor,
                reason: `Postergado por ${actor}`,
                timestamp: new Date().toISOString(),
            });
            return ok({ requestId, status: postponed.status, expiresAt: postponed.expiresAt.toISOString() });
        }

        return err('INVALID_ACTION', 'Supported actions: refresh, approve, reject, postpone, execute-task', 400);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to process proactive action', 500, String(error));
    }
}
