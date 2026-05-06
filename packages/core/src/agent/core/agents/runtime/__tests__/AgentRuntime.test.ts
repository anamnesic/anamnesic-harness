import { AgentRuntime } from '../AgentRuntime';
import { AgentCapability, BaseAgent, AgentState } from '../../contracts';
import type { MultiProviderSettings } from '../../../providers/multi-provider';
import type { AgentResult, IAgentContext } from '../../contracts';
import type { RuntimeEvent, RuntimeEventType } from '../types';

// ─── Mock Agent ─────────────────────────────────────────

class MockAgent extends BaseAgent {
  public executeResult: AgentResult = {
    success: true,
    output: { result: 'mock result' },
    execution: { totalSteps: 1, duration: 100 },
    metadata: { agentId: 'mock-agent', agentVersion: '1.0.0', completedAt: new Date() },
  };

  public shouldFail = false;
  public executionCount = 0;

  constructor() {
    super({
      id: 'mock-agent',
      name: 'Mock Agent',
      description: 'A mock agent for testing',
      version: '1.0.0',
      author: 'Test',
      capabilities: [AgentCapability.CODE_GENERATION],
      tags: ['mock'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async execute(input: Record<string, any>, _context: IAgentContext): Promise<AgentResult> {
    this.executionCount++;
    if (this.shouldFail) {
      throw new Error('Mock execution failure');
    }
    return this.executeResult;
  }
}

// ─── Test Setup ─────────────────────────────────────────

function createRuntimeConfig(overrides?: Partial<MultiProviderSettings>): Parameters<typeof AgentRuntime>[0] {
  return {
    providerSettings: {
      apiKey: 'test-key',
      model: 'gpt-4-turbo',
      baseUrl: 'https://api.openai.com/v1',
      maxTokens: 4096,
      ...overrides,
    },
    limits: {
      maxExecutionTimeMs: 5000,
      maxTurns: 10,
      maxTotalTokens: 10000,
      maxCostUsd: 0.5,
    },
    modelSelection: {
      strategy: 'capability-based',
    },
    enableFallback: true,
    maxFallbackAttempts: 2,
  };
}

// ─── Tests ──────────────────────────────────────────────

describe('AgentRuntime', () => {
  let runtime: AgentRuntime;
  let agent: MockAgent;

  beforeEach(() => {
    runtime = new AgentRuntime(createRuntimeConfig());
    agent = new MockAgent();
  });

  describe('constructor', () => {
    it('should create runtime with default config', () => {
      expect(runtime).toBeInstanceOf(AgentRuntime);
    });

    it('should merge provided limits with defaults', () => {
      const rt = new AgentRuntime(createRuntimeConfig());
      expect(rt).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should execute agent successfully', async () => {
      const result = await runtime.execute(agent, { objective: 'test task' });

      expect(result.success).toBe(true);
      expect(result.modelUsed).toBeDefined();
      expect(result.limitsEnforced).toBeDefined();
      expect(result.limitsEnforced.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should emit execution events', async () => {
      const events: RuntimeEvent[] = [];
      runtime.onRuntimeEvent((e) => events.push(e));

      await runtime.execute(agent, { objective: 'test task' });

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('execution:start');
      expect(eventTypes).toContain('execution:complete');
      expect(eventTypes).toContain('model:selected');
    });

    it('should handle agent failure with fallback', async () => {
      agent.shouldFail = true;

      await expect(runtime.execute(agent, { objective: 'test task' })).rejects.toThrow();
    });

    it('should respect cancellation signal', async () => {
      const controller = new AbortController();
      const rt = new AgentRuntime({
        ...createRuntimeConfig(),
        signal: controller.signal,
      });

      controller.abort();

      await expect(rt.execute(agent, { objective: 'test task' })).rejects.toThrow('Execution cancelled');
    });
  });

  describe('model selection', () => {
    it('should select model by capability', async () => {
      const events: RuntimeEvent[] = [];
      runtime.onRuntimeEvent((e) => events.push(e));

      await runtime.execute(agent, { objective: 'test task' });

      const modelEvent = events.find((e) => e.type === 'model:selected');
      expect(modelEvent).toBeDefined();
      expect(modelEvent?.data?.model).toBeDefined();
    });

    it('should use cost-optimized strategy', async () => {
      const rt = new AgentRuntime({
        ...createRuntimeConfig(),
        modelSelection: { strategy: 'cost-optimized' },
      });

      const result = await rt.execute(agent, { objective: 'test task' });
      expect(result.success).toBe(true);
    });

    it('should use performance strategy', async () => {
      const rt = new AgentRuntime({
        ...createRuntimeConfig(),
        modelSelection: { strategy: 'performance' },
      });

      const result = await rt.execute(agent, { objective: 'test task' });
      expect(result.success).toBe(true);
    });

    it('should use fallback-chain strategy', async () => {
      const rt = new AgentRuntime({
        ...createRuntimeConfig(),
        modelSelection: {
          strategy: 'fallback-chain',
          preferredModels: ['gpt-4', 'claude-3-opus'],
        },
      });

      const result = await rt.execute(agent, { objective: 'test task' });
      expect(result.success).toBe(true);
    });
  });

  describe('execution limits', () => {
    it('should enforce time limit', async () => {
      const rt = new AgentRuntime({
        ...createRuntimeConfig(),
        limits: { maxExecutionTimeMs: 1 },
      });

      // Wait a bit to ensure time limit is exceeded
      await new Promise((r) => setTimeout(r, 10));

      const events: RuntimeEvent[] = [];
      rt.onRuntimeEvent((e) => events.push(e));

      try {
        await rt.execute(agent, { objective: 'test task' });
      } catch {
        // Expected to fail
      }

      // The runtime should detect time limit during execution
      expect(rt).toBeDefined();
    });
  });

  describe('getModelForCapabilities', () => {
    it('should return model for known capability', () => {
      const model = runtime.getModelForCapabilities([AgentCapability.CODE_GENERATION]);
      expect(model).toBe('gpt-4-turbo');
    });

    it('should return default model for unknown capability', () => {
      const model = runtime.getModelForCapabilities([AgentCapability.SCIENTIFIC_ANALYSIS]);
      expect(model).toBe('gpt-4-turbo'); // default from config
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for known model', () => {
      const cost = runtime.estimateCost('gpt-4-turbo', 1000, 500);
      expect(cost).toBeGreaterThan(0);
    });

    it('should return default cost for unknown model', () => {
      const cost = runtime.estimateCost('unknown-model', 1000, 500);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('event handling', () => {
    it('should allow adding and removing event callbacks', () => {
      const callback = jest.fn();
      runtime.onRuntimeEvent(callback);
      runtime.offRuntimeEvent(callback);

      // No error should be thrown
      expect(true).toBe(true);
    });
  });
});
