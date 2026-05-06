import type { AgentTaskEvent, AgentMessage } from '../../tasks/types';
import { TaskRunner, type TaskRunnerConfig, type ToolDefinition } from '../../tasks/TaskRunner';
import {
  BaseAgent,
  type AgentMetadata,
  AgentCapability,
  type AgentResult,
  type IAgentContext,
} from '../contracts';
import type { MultiProviderMessage } from '../../providers/multi-provider';
import { ExecutionLogService } from '../../services/ExecutionLogService';
import { LocalEnvironment } from '../../environments/LocalEnvironment';
import { LitellmModel } from '../../models/LitellmModel';

export interface MiniSweAgentOptions {
  maxTurns?: number;
  executionLogService?: ExecutionLogService;
  taskRunnerFactory?: (config: TaskRunnerConfig) => TaskRunnerLike;
  workspaceId?: string;
  agentId?: string;
  taskId?: string;
}

export interface MiniSweAgentRunResult {
  plan: string[];
  messages: AgentMessage[];
}

interface TaskRunnerLike {
  run(message: string, onEvent: (event: AgentTaskEvent) => void): Promise<AgentMessage[]>;
}

const MINI_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file in the workspace. Supports optional line range.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file' },
        start_line: { type: 'number', description: 'First line to read (1-based, inclusive)' },
        end_line: { type: 'number', description: 'Last line to read (1-based, inclusive)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a file with the given content. Creates parent directories as needed.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the file' },
        content: { type: 'string', description: 'File content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files and directories under a path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative directory path (default: workspace root)' },
        recursive: { type: 'boolean', description: 'List recursively (default: false)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command in the workspace. Destructive commands require confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        cwd: { type: 'string', description: 'Working directory (relative to workspace root, default: workspace root)' },
        timeout: { type: 'number', description: 'Timeout in milliseconds (default: 30000)' },
      },
      required: ['command'],
    },
  },
];

export class MiniSweAgent extends BaseAgent {
  private model: LitellmModel;
  private env: LocalEnvironment;
  private options: MiniSweAgentOptions;

  constructor(model: LitellmModel, env: LocalEnvironment, metadata?: AgentMetadata, options?: MiniSweAgentOptions) {
    super(metadata ?? createMiniSweAgentMetadata());
    this.model = model;
    this.env = env;
    this.options = options ?? {};
  }

  async execute(input: Record<string, any>, context: IAgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const objective = String(input.objective ?? '').trim();

    if (!objective) {
      return {
        success: false,
        output: { error: 'objective is required' },
        execution: {
          totalSteps: 0,
          duration: Date.now() - startTime,
          tokensUsed: 0,
          cost: 0,
        },
        metadata: {
          agentId: this.metadata.id,
          agentVersion: this.metadata.version,
          completedAt: new Date(),
          errors: ['objective is required'],
        },
      };
    }

    context.execution.startedAt = new Date();
    context.metadata.lastActivity = new Date();

    const maxSteps = Number(input.maxSteps ?? this.options.maxTurns ?? 8);
    const result = await this.runObjective(objective, maxSteps);

    context.execution.completedAt = new Date();
    context.execution.duration = Date.now() - startTime;

    return {
      success: true,
      output: {
        objective,
        plan: result.plan,
        summary: extractFinalSummary(result.messages),
      },
      execution: {
        totalSteps: result.plan.length,
        duration: Date.now() - startTime,
      },
      metadata: {
        agentId: this.metadata.id,
        agentVersion: this.metadata.version,
        completedAt: new Date(),
      },
    };
  }

  async plan(objective: string): Promise<string[]> {
    const messages: MultiProviderMessage[] = [
      {
        role: 'system',
        content: 'You are a minimal SWE agent. Return a short numbered plan with one step per line.',
      },
      {
        role: 'user',
        content: `Objective: ${objective}`,
      },
    ];

    const planText = await this.model.chat(messages);
    const steps = parsePlanLines(planText);
    return steps.length > 0 ? steps : [objective];
  }

  async runObjective(
    objective: string,
    maxSteps: number = this.options.maxTurns ?? 8,
    onEvent?: (event: AgentTaskEvent) => void
  ): Promise<MiniSweAgentRunResult> {
    const plan = await this.plan(objective);
    const systemPrompt = buildSystemPrompt(objective, plan);

    const toolHandler = async (name: string, input: Record<string, unknown>): Promise<string> => {
      switch (name) {
        case 'read_file': {
          const r = await this.env.readFile({
            path: String(input.path ?? ''),
            startLine: toNumber(input.start_line),
            endLine: toNumber(input.end_line),
          });
          return r.success ? r.output : `Error: ${r.error}`;
        }
        case 'write_file': {
          const r = await this.env.writeFile({
            path: String(input.path ?? ''),
            content: String(input.content ?? ''),
          });
          return r.success ? r.output : `Error: ${r.error}`;
        }
        case 'list_files': {
          const r = await this.env.listDirectory({
            path: String(input.path ?? '.'),
            recursive: Boolean(input.recursive),
          });
          return r.success ? r.output : `Error: ${r.error}`;
        }
        case 'run_command': {
          const r = await this.env.executeCommand({
            command: String(input.command ?? ''),
            cwd: input.cwd ? String(input.cwd) : undefined,
            timeout: toNumber(input.timeout),
          });
          return r.success ? r.output : `Error: ${r.error}`;
        }
        default:
          return `Unknown tool: ${name}`;
      }
    };

    const runner = this.createTaskRunner({
      settings: this.model.getSettings(),
      providerId: this.model.getProviderId(),
      systemPrompt,
      maxTurns: maxSteps,
      tools: MINI_TOOL_DEFINITIONS,
      toolHandler,
    });

    const messages = await runner.run(objective, (event) => {
      if (this.options.executionLogService) {
        void this.logEvent(event);
      }
      if (onEvent) onEvent(event);
    });

    return { plan, messages };
  }

  private createTaskRunner(config: TaskRunnerConfig): TaskRunnerLike {
    if (this.options.taskRunnerFactory) {
      return this.options.taskRunnerFactory(config);
    }
    return new TaskRunner(config);
  }

  private async logEvent(event: AgentTaskEvent): Promise<void> {
    const service = this.options.executionLogService;
    if (!service) return;

    const workspaceId = this.options.workspaceId ?? 'default';
    const taskId = this.options.taskId ?? this.metadata.id;

    await service.log({
      workspaceId,
      taskId,
      agentId: this.options.agentId ?? this.metadata.id,
      level: event.type === 'error' ? 'error' : 'info',
      phase: event.type === 'plan' ? 'planning' : 'execution',
      message: formatEventMessage(event),
      data: 'content' in event ? { content: event.content } : undefined,
    });
  }
}

function createMiniSweAgentMetadata(): AgentMetadata {
  return {
    id: 'mini-swe-agent',
    name: 'Mini SWE Agent',
    description: 'Minimal SWE-style agent for code tasks with local tool access.',
    version: '0.1.0',
    author: 'Kairos',
    capabilities: [
      AgentCapability.REASONING,
      AgentCapability.CODE_GENERATION,
      AgentCapability.DEBUGGING,
      AgentCapability.TASK_DECOMPOSITION,
      AgentCapability.WORKFLOW_ORCHESTRATION,
    ],
    maxExecutionTime: 10 * 60 * 1000,
    tags: ['mini', 'swe', 'local'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildSystemPrompt(objective: string, plan: string[]): string {
  const planText = plan.map((step, idx) => `${idx + 1}. ${step}`).join('\n');
  return [
    'You are a minimal SWE agent running locally with file and shell tools.',
    'Keep responses short and take the smallest steps needed to complete the objective.',
    `Objective: ${objective}`,
    'Plan:',
    planText,
  ].join('\n');
}

function parsePlanLines(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const steps: string[] = [];
  for (const line of lines) {
    const match = /^\d+\.?\s+(.*)$/.exec(line) ?? /^[-*]\s+(.*)$/.exec(line);
    if (match && match[1]) steps.push(match[1].trim());
  }
  return steps;
}

function extractFinalSummary(messages: AgentMessage[]): string {
  const last = [...messages].reverse().find((msg) => msg.role === 'assistant');
  if (!last) return '';
  if (typeof last.content === 'string') return last.content.trim();
  const blocks = last.content as Array<{ type: string; text?: string }>;
  return blocks.filter((b) => b.type === 'text' && b.text).map((b) => b.text).join('').trim();
}

function formatEventMessage(event: AgentTaskEvent): string {
  switch (event.type) {
    case 'text':
      return 'Agent response text';
    case 'plan':
      return `Plan emitted (${event.steps.length} steps)`;
    case 'tool_start':
      return `Tool start: ${event.tool}`;
    case 'tool_end':
      return `Tool end: ${event.tool}`;
    case 'error':
      return `Error: ${event.message}`;
    default:
      return `Event: ${event.type}`;
  }
}

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}
