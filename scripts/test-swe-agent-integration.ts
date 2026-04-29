import { LocalEnvironment, LitellmModel, MiniSweAgent } from '../src/core';
import type { TaskRunnerConfig } from '../src/core/tasks/TaskRunner';
import type { AgentTaskEvent, AgentMessage } from '../src/core/tasks/types';

async function main(): Promise<void> {
  const model = new LitellmModel({
    model: 'test-model',
    providerId: 'ollama',
    baseUrl: 'http://localhost:11434',
    chat: async () => '1. List files',
  });

  const env = LocalEnvironment.create({
    workspaceRoot: process.cwd(),
    pipelineId: 'integration',
    taskId: 'integration-task',
    phaseName: 'integration',
    agentRole: 'mini-swe-agent',
    dryRun: true,
  });

  const taskRunnerFactory = (config: TaskRunnerConfig) => ({
    run: async (_message: string, onEvent: (event: AgentTaskEvent) => void): Promise<AgentMessage[]> => {
      if (!config.toolHandler) throw new Error('toolHandler missing');
      const result = await config.toolHandler('list_files', { path: '.' });
      onEvent({ type: 'tool_end', tool: 'list_files', result, success: true });
      onEvent({ type: 'done', totalTurns: 1 });
      return [{ role: 'assistant', content: 'integration-ok' }];
    },
  });

  const agent = new MiniSweAgent(model, env, undefined, { taskRunnerFactory });
  const result = await agent.runObjective('List files', 1);

  if (result.messages.at(-1)?.content !== 'integration-ok') {
    throw new Error('Unexpected integration result');
  }

  console.log('✓ mini-swe-agent integration harness passed');
}

main().catch((error) => {
  console.error('Integration harness failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
