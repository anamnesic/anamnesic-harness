import type { AgentTool, IToolRegistry, PermissionKey, Role } from './types';
import { hasPermission } from '@/src/core/policies/permissions';

export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  list(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  getByPermission(permission: PermissionKey): AgentTool[] {
    return this.list().filter(tool => 
      tool.permissions?.includes(permission)
    );
  }

  getByRiskLevel(riskLevel: string): AgentTool[] {
    return this.list().filter(tool => tool.riskLevel === riskLevel);
  }

  canExecute(tool: AgentTool, role: Role): boolean {
    if (!tool.permissions) return true;
    return tool.permissions.every(p => hasPermission(role, p));
  }
}

const registry = new ToolRegistry();

export function getToolRegistry(): IToolRegistry {
  return registry;
}

export function resetToolRegistry(): void {
  registry['tools'].clear();
}
