import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { DataSource } from 'typeorm';
import { z } from 'zod';
import {
  ExecutionLogService,
  LocalEnvironment,
  LitellmModel,
  MiniSweAgent,
  PROVIDER_PRESETS,
} from '../../core';

const router = Router();

let logService: ExecutionLogService;

type RunStatus = {
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  plan?: string[];
  summary?: string;
};

const runStatus = new Map<string, RunStatus>();

const runSchema = z.object({
  objective: z.string().min(1),
  workspaceId: z.string().min(1),
  workspaceRoot: z.string().optional(),
  model: z.string().optional(),
  providerId: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  maxSteps: z.coerce.number().int().positive().optional(),
  maxTokens: z.coerce.number().int().positive().optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
});

export function initializeSweAgentRoutes(db: DataSource) {
  logService = new ExecutionLogService(db);
  return router;
}

router.post('/api/v1/swe-agent/run', async (req: Request, res: Response) => {
  try {
    const body = runSchema.parse(req.body);
    const runId = crypto.randomUUID();

    runStatus.set(runId, { status: 'queued' });

    void runSweAgent(runId, body);

    res.status(202).json({
      success: true,
      data: { runId, status: 'queued' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.flatten() },
        timestamp: new Date().toISOString(),
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to start swe-agent' },
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/api/v1/swe-agent/status/:runId', async (req: Request, res: Response) => {
  const status = runStatus.get(req.params.runId);
  if (!status) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Run not found' },
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    data: status,
    timestamp: new Date().toISOString(),
  });
});

async function runSweAgent(
  runId: string,
  input: z.infer<typeof runSchema>
): Promise<void> {
  runStatus.set(runId, { status: 'running', startedAt: new Date().toISOString() });

  await logService.log({
    workspaceId: input.workspaceId,
    taskId: runId,
    level: 'info',
    phase: 'planning',
    message: `Started swe-agent run: ${runId}`,
    data: { objective: input.objective },
  });

  try {
    const providerId = input.providerId ?? 'openai';
    const providerConfig = PROVIDER_PRESETS[providerId] ?? PROVIDER_PRESETS.openai;
    const model = new LitellmModel({
      model: input.model ?? 'gpt-4o-mini',
      apiKey: input.apiKey ?? '',
      providerId,
      baseUrl: input.baseUrl ?? providerConfig.baseUrl,
      maxTokens: input.maxTokens ?? 1024,
      temperature: input.temperature ?? 0.2,
    });

    const env = LocalEnvironment.create({
      workspaceRoot: input.workspaceRoot ?? process.cwd(),
      pipelineId: runId,
      taskId: runId,
      phaseName: 'swe-agent',
      agentRole: 'mini-swe-agent',
    });

    const agent = new MiniSweAgent(model, env, undefined, {
      executionLogService: logService,
      workspaceId: input.workspaceId,
      agentId: 'mini-swe-agent',
      taskId: runId,
    });

    const result = await agent.runObjective(input.objective, input.maxSteps ?? 8);

    runStatus.set(runId, {
      status: 'completed',
      startedAt: runStatus.get(runId)?.startedAt,
      completedAt: new Date().toISOString(),
      plan: result.plan,
      summary: extractSummary(result.messages),
    });

    await logService.log({
      workspaceId: input.workspaceId,
      taskId: runId,
      level: 'info',
      phase: 'completion',
      message: `Completed swe-agent run: ${runId}`,
      data: { steps: result.plan.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    runStatus.set(runId, {
      status: 'failed',
      startedAt: runStatus.get(runId)?.startedAt,
      completedAt: new Date().toISOString(),
      error: message,
    });

    await logService.log({
      workspaceId: input.workspaceId,
      taskId: runId,
      level: 'error',
      phase: 'execution',
      message: `swe-agent run failed: ${runId}`,
      data: { error: message },
    });
  }
}

function extractSummary(messages: Array<{ role: string; content: unknown }>): string {
  const last = [...messages].reverse().find((msg) => msg.role === 'assistant');
  if (!last) return '';
  if (typeof last.content === 'string') return last.content.trim();
  if (!Array.isArray(last.content)) return String(last.content ?? '').trim();

  return last.content
    .filter((block) => block && typeof block === 'object' && (block as any).type === 'text')
    .map((block) => (block as any).text ?? '')
    .join('')
    .trim();
}
