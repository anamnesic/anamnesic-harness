import { EventEmitter } from 'events';
import {
  IAgent,
  AgentCapability,
  AgentResult,
  IAgentContext,
  AgentState,
} from '../contracts';
import type { MultiProviderSettings } from '../../providers/multi-provider';
import { TaskRunner, type TaskRunnerConfig, type ToolDefinition } from '../../tasks/TaskRunner';
import { ModelFallbackService } from '../../services/ModelFallbackService';
import { Logger } from '../../utils/Logger';
import {
  AgentRuntimeConfig,
  ExecutionLimits,
  ModelSelectionConfig,
  ModelSelectionStrategy,
  RuntimeEvent,
  RuntimeEventType,
  RuntimeEventCallback,
  RuntimeExecutionResult,
  ModelInfo,
} from './types';

// ─── Default Models by Capability ──────────────────────────

const CAPABILITY_MODEL_MAP: Partial<Record<AgentCapability, string>> = {
  [AgentCapability.REASONING]: 'claude-3-opus',
  [AgentCapability.CODE_GENERATION]: 'gpt-4-turbo',
  [AgentCapability.DEBUGGING]: 'gpt-4-turbo',
  [AgentCapability.REFACTORING]: 'gpt-4-turbo',
  [AgentCapability.SECURITY_ANALYSIS]: 'claude-3-opus',
  [AgentCapability.VULNERABILITY_DISCOVERY]: 'claude-3-opus',
  [AgentCapability.MULTIMODAL_ANALYSIS]: 'claude-3-opus',
  [AgentCapability.TASK_DECOMPOSITION]: 'gpt-4-turbo',
  [AgentCapability.WORKFLOW_ORCHESTRATION]: 'gpt-4-turbo',
  [AgentCapability.AUTONOMOUS_OPERATION]: 'claude-3-opus',
  [AgentCapability.CONTEXT_PROCESSING]: 'gpt-4-turbo',
  [AgentCapability.MEMORY_MANAGEMENT]: 'gpt-4-turbo',
  [AgentCapability.DECISION_MAKING]: 'claude-3-opus',
  [AgentCapability.KNOWLEDGE_SYNTHESIS]: 'claude-3-opus',
  [AgentCapability.SYSTEM_ANALYSIS]: 'claude-3-opus',
  [AgentCapability.PERFORMANCE_OPTIMIZATION]: 'gpt-4-turbo',
};

const DEFAULT_FALLBACK_CHAIN = [
  'gpt-4-turbo',
  'claude-3-opus',
  'gpt-4',
  'claude-3-sonnet',
  'gpt-4o-mini',
];

// ─── AgentRuntime ──────────────────────────────────────────

export class AgentRuntime extends EventEmitter {
  private logger = Logger.getInstance();
  private config: AgentRuntimeConfig;
  private eventCallbacks: RuntimeEventCallback[] = [];
  private fallbackService: ModelFallbackService;

  constructor(config: AgentRuntimeConfig) {
    super();
    this.config = {
      limits: {
        maxExecutionTimeMs: 10 * 60 * 1000, // 10 minutes
        maxTurns: 20,
        maxTotalTokens: 200000,
        maxCostUsd: 1.0,
        ...config.limits,
      },
      modelSelection: {
        strategy: 'capability-based',
        ...config.modelSelection,
      },
      enableFallback: config.enableFallback ?? true,
      maxFallbackAttempts: config.maxFallbackAttempts ?? 3,
      ...config,
    };

    // Initialize fallback service with a mock AIProvider for now
    // In production, this would use the actual provider
    this.fallbackService = new ModelFallbackService({
      chat: async () => ({ message: { content: '' } }),
    } as any);
  }

  // ─── Event Handling ──────────────────────────────────────

  onRuntimeEvent(callback: RuntimeEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  offRuntimeEvent(callback: RuntimeEventCallback): void {
    const idx = this.eventCallbacks.indexOf(callback);
    if (idx !== -1) this.eventCallbacks.splice(idx, 1);
  }

  private emitEvent(type: RuntimeEventType, data?: Record<string, unknown>): void {
    const event: RuntimeEvent = {
      type,
      timestamp: new Date(),
      agentId: data?.agentId as string | undefined,
      sessionId: data?.sessionId as string | undefined,
      data,
    };

    this.eventCallbacks.forEach(cb => {
      try { cb(event); } catch (e) {
        this.logger.error('Runtime event callback error', e);
      }
    });

    this.emit(type, event);
  }

  // ─── Execute Agent ───────────────────────────────────────

  async execute(
    agent: IAgent,
    input: Record<string, any>,
    context?: Partial<IAgentContext>,
  ): Promise<RuntimeExecutionResult> {
    const startTime = Date.now();
    const sessionId = context?.sessionId ?? `session_${Date.now()}`;
    const agentId = agent.metadata.id;

    this.emitEvent('execution:start', { agentId, sessionId });

    // Check for cancellation
    if (this.config.signal?.aborted) {
      this.emitEvent('execution:cancelled', { agentId, sessionId });
      throw new Error('Execution cancelled');
    }

    try {
      // Select model based on strategy
      const modelSelection = this.selectModel(agent, this.config.modelSelection!);
      const modelToUse = modelSelection.selectedModel;
      const fallbackChain = modelSelection.fallbackChain;

      this.emitEvent('model:selected', {
        agentId,
        sessionId,
        model: modelToUse,
        strategy: this.config.modelSelection!.strategy,
      });

      // Create execution context
      const executionContext: IAgentContext = {
        id: `ctx_${Date.now()}`,
        agentId,
        sessionId,
        input,
        state: {},
        memory: new Map(),
        execution: { steps: [] },
        metadata: {
          createdAt: new Date(),
          lastActivity: new Date(),
          totalSteps: 0,
        },
        ...context,
      };

      // Track limits
      let turnsUsed = 0;
      let totalTokens = 0;
      let estimatedCost = 0;

      // Execute with fallback support
      let lastError: Error | null = null;
      let result: AgentResult | null = null;

      const modelsToTry = [modelToUse, ...fallbackChain];

      for (let attempt = 0; attempt < modelsToTry.length && attempt < (this.config.maxFallbackAttempts ?? 3); attempt++) {
        const currentModel = modelsToTry[attempt];

        if (attempt > 0) {
          this.emitEvent('model:fallback', {
            agentId,
            sessionId,
            failedModel: modelsToTry[attempt - 1],
            fallbackModel: currentModel,
            attempt,
          });
        }

        try {
          // Check execution time limit
          if (this.isTimeLimitReached(startTime)) {
            this.emitEvent('execution:limit-reached', {
              agentId,
              sessionId,
              limit: 'maxExecutionTimeMs',
              elapsed: Date.now() - startTime,
            });
            throw new Error('Execution time limit reached');
          }

          // Initialize agent if needed
          if (agent.state === AgentState.IDLE) {
            await agent.initialize(executionContext);
          }

          // Execute the agent
          result = await this.executeWithModel(agent, input, executionContext, currentModel);

          // Check token limit
          if (result.execution.tokensUsed) {
            totalTokens += result.execution.tokensUsed;
            if (this.config.limits!.maxTotalTokens && totalTokens > this.config.limits!.maxTotalTokens!) {
              this.emitEvent('execution:limit-reached', {
                agentId,
                sessionId,
                limit: 'maxTotalTokens',
                tokensUsed: totalTokens,
              });
              throw new Error('Token limit reached');
            }
          }

          // Check cost limit
          if (result.execution.cost) {
            estimatedCost += result.execution.cost;
            if (this.config.limits!.maxCostUsd && estimatedCost > this.config.limits!.maxCostUsd!) {
              this.emitEvent('execution:limit-reached', {
                agentId,
                sessionId,
                limit: 'maxCostUsd',
                cost: estimatedCost,
              });
              throw new Error('Cost limit reached');
            }
          }

          // Success - break out of fallback loop
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          this.emitEvent('model:failed', {
            agentId,
            sessionId,
            model: currentModel,
            error: lastError.message,
            attempt,
          });

          // If fallback is disabled, don't try more models
          if (!this.config.enableFallback) break;
        }
      }

      if (!result) {
        this.emitEvent('execution:failed', {
          agentId,
          sessionId,
          error: lastError?.message ?? 'All models failed',
        });
        throw lastError ?? new Error('Execution failed');
      }

      const executionTime = Date.now() - startTime;

      const runtimeResult: RuntimeExecutionResult = {
        ...result,
        modelUsed: result.metadata?.agentId ?? modelToUse,
        fallbackChain: modelsToTry,
        limitsEnforced: {
          executionTimeMs: executionTime,
          turnsUsed,
          tokensUsed: totalTokens,
          estimatedCostUsd: estimatedCost,
        },
      };

      this.emitEvent('execution:complete', {
        agentId,
        sessionId,
        result: runtimeResult,
      });

      return runtimeResult;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.emitEvent('execution:failed', {
        agentId,
        sessionId,
        error: err.message,
      });

      throw err;
    }
  }

  // ─── Model Selection ──────────────────────────────────────

  private selectModel(
    agent: IAgent,
    selectionConfig: ModelSelectionConfig,
  ): { selectedModel: string; fallbackChain: string[] } {
    const strategy = selectionConfig.strategy;

    switch (strategy) {
      case 'capability-based':
        return this.selectByCapability(agent, selectionConfig);

      case 'cost-optimized':
        return this.selectCostOptimized(selectionConfig);

      case 'performance':
        return this.selectPerformanceBased(selectionConfig);

      case 'fallback-chain':
        return this.selectFallbackChain(selectionConfig);

      default:
        return { selectedModel: this.config.providerSettings.model, fallbackChain: DEFAULT_FALLBACK_CHAIN };
    }
  }

  private selectByCapability(
    agent: IAgent,
    config: ModelSelectionConfig,
  ): { selectedModel: string; fallbackChain: string[] } {
    // Check for capability-specific overrides
    if (config.capabilityOverrides) {
      const capabilities = agent.metadata.capabilities;
      for (const cap of capabilities) {
        if (config.capabilityOverrides[cap]) {
          return {
            selectedModel: config.capabilityOverrides[cap]!,
            fallbackChain: this.buildFallbackChain(config.capabilityOverrides[cap]!),
          };
        }
      }
    }

    // Use default capability mapping
    const primaryCapability = agent.metadata.capabilities[0];
    const selectedModel = CAPABILITY_MODEL_MAP[primaryCapability] ?? this.config.providerSettings.model;
    const fallbackChain = this.buildFallbackChain(selectedModel);

    return { selectedModel, fallbackChain };
  }

  private selectCostOptimized(
    config: ModelSelectionConfig,
  ): { selectedModel: string; fallbackChain: string[] } {
    // Prefer cheaper models
    const cheapModels = [
      'gpt-4o-mini',
      'gpt-4-turbo',
      'claude-3-haiku',
      'gpt-4',
    ];

    const selectedModel = cheapModels[0];
    return {
      selectedModel,
      fallbackChain: cheapModels.slice(1),
    };
  }

  private selectPerformanceBased(
    config: ModelSelectionConfig,
  ): { selectedModel: string; fallbackChain: string[] } {
    // Prefer high-performance models
    const performantModels = [
      'claude-3-opus',
      'gpt-4-turbo',
      'claude-3-sonnet',
      'gpt-4',
    ];

    const selectedModel = performantModels[0];
    return {
      selectedModel,
      fallbackChain: performantModels.slice(1),
    };
  }

  private selectFallbackChain(
    config: ModelSelectionConfig,
  ): { selectedModel: string; fallbackChain: string[] } {
    const preferred = config.preferredModels ?? [this.config.providerSettings.model];
    const excluded = new Set(config.excludedModels ?? []);

    const filtered = preferred.filter(m => !excluded.has(m));
    const selectedModel = filtered[0] ?? this.config.providerSettings.model;
    const fallbackChain = filtered.slice(1).length > 0
      ? filtered.slice(1)
      : DEFAULT_FALLBACK_CHAIN.filter(m => m !== selectedModel && !excluded.has(m));

    return { selectedModel, fallbackChain };
  }

  private buildFallbackChain(primaryModel: string): string[] {
    return DEFAULT_FALLBACK_CHAIN.filter(m => m !== primaryModel);
  }

  // ─── Execute with Specific Model ─────────────────────────

  private async executeWithModel(
    agent: IAgent,
    input: Record<string, any>,
    context: IAgentContext,
    model: string,
  ): Promise<AgentResult> {
    // Override the model in provider settings
    const settings: MultiProviderSettings = {
      ...this.config.providerSettings,
      model,
    };

    // If agent supports model override, use it
    // Otherwise, use TaskRunner with the specified model
    if (agent.execute.length >= 2) {
      return agent.execute(input, context);
    }

    // Fallback: execute with TaskRunner
    return this.executeWithTaskRunner(settings, input, context);
  }

  private async executeWithTaskRunner(
    settings: MultiProviderSettings,
    input: Record<string, any>,
    context: IAgentContext,
  ): Promise<AgentResult> {
    const startTime = Date.now();

    const runnerConfig: TaskRunnerConfig = {
      settings,
      providerId: this.config.providerId,
      systemPrompt: this.config.systemPrompt,
      maxTurns: this.config.limits?.maxTurns ?? 20,
      tools: this.config.tools as ToolDefinition[] | undefined,
    };

    const runner = new TaskRunner(runnerConfig);
    const messages = await runner.run(
      typeof input.objective === 'string' ? input.objective : JSON.stringify(input),
      (event) => {
        if (event.type === 'tool_start') {
          this.emitEvent('tool:start', { tool: event.tool, input: event.input });
        } else if (event.type === 'tool_end') {
          this.emitEvent('tool:complete', { tool: event.tool, result: event.result, success: event.success });
        } else if (event.type === 'error') {
          this.emitEvent('tool:failed', { error: event.message });
        }
      },
    );

    const duration = Date.now() - startTime;

    return {
      success: true,
      output: { messages },
      execution: {
        totalSteps: messages.length,
        duration,
      },
      metadata: {
        agentId: context.agentId,
        agentVersion: '1.0.0',
        completedAt: new Date(),
      },
    };
  }

  // ─── Limit Checking ──────────────────────────────────────

  private isTimeLimitReached(startTime: number): boolean {
    const limit = this.config.limits?.maxExecutionTimeMs;
    if (!limit) return false;
    return (Date.now() - startTime) > limit;
  }

  // ─── Utility Methods ─────────────────────────────────────

  getModelForCapabilities(capabilities: AgentCapability[]): string {
    for (const cap of capabilities) {
      if (CAPABILITY_MODEL_MAP[cap]) {
        return CAPABILITY_MODEL_MAP[cap]!;
      }
    }
    return this.config.providerSettings.model;
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Simplified cost estimation - in production, use actual model pricing
    const modelCosts: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    };

    const costs = modelCosts[model] ?? { input: 0.01, output: 0.03 };
    return (inputTokens * costs.input + outputTokens * costs.output) / 1000;
  }
}
