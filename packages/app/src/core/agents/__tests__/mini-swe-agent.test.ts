import { describe, it, expect } from 'vitest';
import { LocalEnvironment } from '../../environments/LocalEnvironment';
import { LitellmModel } from '../../models/LitellmModel';
import { MiniSweAgent } from '../implementations/mini-swe-agent';
import type { TaskRunnerConfig } from '../../tasks/TaskRunner';
import type { AgentTaskEvent, AgentMessage } from '../../tasks/types';

function createTestModel(responseText: string): LitellmModel {
  return new LitellmModel({
    model: 'test-model',
    providerId: 'ollama',
    baseUrl: 'http://localhost:11434',
    chat: async () => responseText,
  });
}

describe('MiniSweAgent', () => {
  it('parses a numbered plan from model output', async () => {
    const model = createTestModel('1. First step\n2. Second step');
    const env = LocalEnvironment.create({
      workspaceRoot: process.cwd(),
      pipelineId: 'test-plan',
      taskId: 'task-1',
      phaseName: 'test',
      agentRole: 'mini-swe-agent',
      dryRun: true,
    });

    const agent = new MiniSweAgent(model, env);
    const plan = await agent.plan('Do a thing');

    expect(plan).toEqual(['First step', 'Second step']);
  });

  it('runs an objective with a custom task runner', async () => {
    const model = createTestModel('1. List files');
    const env = LocalEnvironment.create({
      workspaceRoot: process.cwd(),
      pipelineId: 'test-run',
      taskId: 'task-2',
      phaseName: 'test',
      agentRole: 'mini-swe-agent',
      dryRun: true,
    });

    const taskRunnerFactory = (config: TaskRunnerConfig) => {
      return {
        run: async (_message: string, onEvent: (event: AgentTaskEvent) => void): Promise<AgentMessage[]> => {
          if (!config.toolHandler) throw new Error('toolHandler missing');
          const result = await config.toolHandler('list_files', { path: '.' });
          onEvent({ type: 'tool_end', tool: 'list_files', result, success: true });
          onEvent({ type: 'done', totalTurns: 1 });
          return [{ role: 'assistant', content: 'done' }];
        },
      };
    };

    const agent = new MiniSweAgent(model, env, undefined, { taskRunnerFactory });
    const result = await agent.runObjective('List files', 1);

    expect(result.plan).toEqual(['List files']);
    expect(result.messages[result.messages.length - 1]?.content).toBe('done');
  });
});
