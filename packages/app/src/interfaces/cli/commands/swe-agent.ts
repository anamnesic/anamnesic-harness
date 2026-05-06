import { Command } from 'commander';
import {
  LocalEnvironment,
  LitellmModel,
  MiniSweAgent,
  PROVIDER_PRESETS,
} from '../../../core';

export function registerSweAgentCommands(program: Command): void {
  const swe = program.command('swe-agent').description('Run the mini SWE agent');

  swe
    .command('run')
    .description('Run the mini SWE agent for an objective')
    .requiredOption('--objective <text>', 'Objective to solve')
    .option('--model <name>', 'Model name (e.g. gpt-4o-mini)', process.env.KAIROS_MODEL)
    .option('--provider <id>', 'Provider id (openai, anthropic, ollama, custom)', process.env.KAIROS_PROVIDER)
    .option('--api-key <key>', 'API key (or KAIROS_API_KEY env var)')
    .option('--base-url <url>', 'Base URL for provider (or KAIROS_BASE_URL env var)')
    .option('--max-steps <number>', 'Maximum turns/steps', '8')
    .option('--max-tokens <number>', 'Max completion tokens', '1024')
    .option('--temperature <number>', 'Sampling temperature', '0.2')
    .option('--workspace <path>', 'Workspace root (defaults to cwd)')
    .action(async (options) => {
      try {
        const objective = String(options.objective ?? '').trim();
        if (!objective) {
          console.error('Error: --objective is required');
          process.exit(1);
        }

        const providerId = options.provider || 'openai';
        const providerConfig = PROVIDER_PRESETS[providerId] ?? PROVIDER_PRESETS.openai;
        const baseUrl = options.baseUrl || process.env.KAIROS_BASE_URL || providerConfig.baseUrl;
        const apiKey = options.apiKey || process.env.KAIROS_API_KEY || '';

        const maxSteps = toNumberOrDefault(options.maxSteps, 8);
        const maxTokens = toNumberOrDefault(options.maxTokens, 1024);
        const temperature = toNumberOrDefault(options.temperature, 0.2);

        const model = new LitellmModel({
          model: options.model || process.env.KAIROS_MODEL || 'gpt-4o-mini',
          apiKey,
          providerId,
          baseUrl,
          maxTokens,
          temperature,
        });

        const workspaceRoot = options.workspace || process.cwd();
        const env = LocalEnvironment.create({
          workspaceRoot,
          pipelineId: 'cli-swe-agent',
          taskId: `cli-${Date.now()}`,
          phaseName: 'cli',
          agentRole: 'mini-swe-agent',
        });

        const agent = new MiniSweAgent(model, env);

        console.log(`\nObjective: ${objective}`);
        const result = await agent.runObjective(objective, maxSteps, (event) => {
          if (event.type === 'plan') {
            console.log('\nPlan:');
            for (const step of event.steps) {
              console.log(`  ${step.step}. ${step.description}`);
            }
          }
          if (event.type === 'text' && event.content.trim()) {
            console.log(`\n${event.content.trim()}`);
          }
          if (event.type === 'error') {
            console.error(`\nError: ${event.message}`);
          }
        });

        console.log('\n✓ Completed');
        if (result.plan.length > 0) {
          console.log(`Plan steps: ${result.plan.length}`);
        }
      } catch (error) {
        console.error('Error running swe-agent:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

function toNumberOrDefault(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}
