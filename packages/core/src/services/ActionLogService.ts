import fs from 'node:fs/promises';
import path from 'node:path';

export interface ActionLogEntry {
  id: string; // UUID
  timestamp: string; // ISO 8601
  pipelineId: string;
  phaseIndex: number;
  taskId: string;
  agent: 'backend' | 'frontend' | 'architect' | 'qa';
  tool: string; // e.g., 'write_file', 'run_command'
  input: any;
  result: {
    success: boolean;
    output?: string;
    error?: string;
  };
  durationMs: number;
  dryRun: boolean;
  filesAffected?: string[];
  commandInfo?: {
    command: string;
    exitCode?: number;
    riskLevel: 'safe' | 'moderate' | 'destructive' | 'blocked';
    userDecision?: 'accepted' | 'rejected' | 'auto-blocked' | 'timeout';
  };
}

export class ActionLogService {
  private logsBaseDir: string;

  constructor(logsBaseDir: string) {
    this.logsBaseDir = logsBaseDir;
  }

  private getLogFilePath(pipelineId: string): string {
    return path.join(this.logsBaseDir, `${pipelineId}.jsonl`);
  }

  async log(entry: Omit<ActionLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logFilePath = this.getLogFilePath(entry.pipelineId);
    
    await fs.mkdir(path.dirname(logFilePath), { recursive: true });

    const fullEntry: ActionLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const logLine = JSON.stringify(fullEntry) + '\n';
    
    await fs.appendFile(logFilePath, logLine, 'utf8');
  }

  async getByPipeline(pipelineId: string): Promise<ActionLogEntry[]> {
    const logFilePath = this.getLogFilePath(pipelineId);
    
    try {
      const content = await fs.readFile(logFilePath, 'utf8');
      const lines = content.trim().split('\n');
      
      return lines
        .filter(line => line.length > 0)
        .map(line => JSON.parse(line) as ActionLogEntry);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async getByPhase(pipelineId: string, phaseIndex: number): Promise<ActionLogEntry[]> {
    const entries = await this.getByPipeline(pipelineId);
    return entries.filter(entry => entry.phaseIndex === phaseIndex);
  }
}
