import type { AgentTool, PermissionKey, Role, ToolContext } from '../tools/types';
import { hasPermission, requirePermission } from './permissions';
import { validateCommand, type CommandValidationResult } from './guardrails';
import { ToolRegistry } from '../tools/registry';

export interface ToolPermissionCheck {
  tool: string;
  permission?: PermissionKey;
  granted: boolean;
  reason?: string;
}

export function mapToolToPermissions(tool: AgentTool): PermissionKey[] {
  const permissions: PermissionKey[] = [];
  
  if (tool.name.includes('write') || tool.name.includes('edit')) {
    permissions.push('files:write');
  }
  
  if (tool.name.includes('delete') || tool.name.includes('remove')) {
    permissions.push('files:delete');
  }
  
  if (tool.name.includes('command') || tool.name.includes('exec') || tool.name.includes('run')) {
    permissions.push('commands:run');
  }
  
  if (tool.permissions) {
    permissions.push(...tool.permissions);
  }
  
  return [...new Set(permissions)];
}

export function checkToolPermissions(
  tool: AgentTool,
  role: Role,
  ctx?: ToolContext
): ToolPermissionCheck[] {
  const permissions = mapToolToPermissions(tool);
  
  return permissions.map(perm => ({
    tool: tool.name,
    permission: perm,
    granted: hasPermission(role, perm),
    reason: hasPermission(role, perm) ? undefined : `Role '${role}' lacks permission '${perm}'`,
  }));
}

export function validateToolInput(tool: AgentTool, input: unknown): CommandValidationResult | null {
  if (tool.name === 'runCommand' && typeof input === 'object' && input !== null) {
    const cmdInput = input as { command?: string };
    if (cmdInput.command) {
      return validateCommand(cmdInput.command);
    }
  }
  return null;
}

export function registerToolsWithPermissions(registry: ToolRegistry): void {
  // This function can be used to bulk-register tools with permission checks
  // Tools should be registered before calling this
}
