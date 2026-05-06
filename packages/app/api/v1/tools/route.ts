export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getToolRegistry, ToolExecutionService } from '@/src/core/agents/tools';
import type { Role } from '@/src/core/tools/types';

export async function GET(req: NextRequest) {
  const registry = getToolRegistry();
  const role = (req.nextUrl.searchParams.get('role') as Role) ?? 'developer';
  
  const tools = registry.list().map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    permissions: tool.permissions ?? [],
    riskLevel: tool.riskLevel ?? 'safe',
    hasStreaming: typeof tool.executeStreaming === 'function',
  }));

  const executionService = new ToolExecutionService();
  const availability = executionService.listAvailableTools(role);

  return Response.json({
    tools,
    availability: availability.map(({ tool, canExecute }) => ({
      name: tool.name,
      canExecute,
    })),
  });
}

export async function POST(req: NextRequest) {
  let body: { name?: string; input?: unknown; role?: string; dryRun?: boolean };
  
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { name, input, role = 'agent', dryRun = false } = body;

  if (!name || typeof name !== 'string') {
    return new Response('Missing tool name', { status: 400 });
  }

  const registry = getToolRegistry();
  const tool = registry.get(name);
  
  if (!tool) {
    return new Response(`Tool not found: ${name}`, { status: 404 });
  }

  const executionService = new ToolExecutionService();
  
  // Create minimal context for execution
  const ctx = {
    workspaceRoot: process.cwd(),
    pipelineId: 'api-' + Date.now(),
    phaseIndex: 0,
    phaseName: 'api-execution',
    taskId: 'api-' + Date.now(),
    agentRole: role,
    dryRun,
  };

  const result = await executionService.executeTool(name, ctx, input, { role: role as Role });

  return Response.json(result);
}
