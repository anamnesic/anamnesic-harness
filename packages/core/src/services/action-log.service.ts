import { randomUUID } from 'crypto';

/**
 * Defines the structure for a single logged action performed by an agent.
 */
export interface ActionLogEntry {
  id: string;
  timestamp: string; // ISO 8601 format
  pipelineId: string;
  phaseIndex: number;
  agentId: string;
  tool: string; // The name of the tool being called, e.g., 'write_file'
  input: any; // The parameters passed to the tool
  output: string; // The result returned from the tool
  success: boolean;
  error?: string;
  durationMs: number;
  dryRun: boolean;
  filesAffected?: string[];
  riskLevel?: 'safe' | 'destructive' | 'blocked';
  userDecision?: 'accepted' | 'rejected' | 'auto-blocked' | 'timeout';
}

/**
 * Interface for the ActionLogService, responsible for recording and retrieving agent actions.
 * The implementation will handle writing to and reading from .jsonl files.
 */
export interface IActionLogService {
  /**
   * Logs a single agent action.
   * @param entry - The action details to log. The 'id' and 'timestamp' will be added automatically.
   */
  log(entry: Omit<ActionLogEntry, 'id' | 'timestamp'>): Promise<void>;

  /**
   * Retrieves all log entries for a specific pipeline.
   * @param pipelineId - The ID of the pipeline.
   * @returns A promise that resolves to an array of log entries, sorted by timestamp.
   */
  getByPipeline(pipelineId: string): Promise<ActionLogEntry[]>;

  /**
   * Retrieves all log entries for a specific phase within a pipeline.
   * @param pipelineId - The ID of the pipeline.
   * @param phaseIndex - The index of the phase.
   * @returns A promise that resolves to an array of log entries for that phase.
   */
  getByPhase(pipelineId: string, phaseIndex: number): Promise<ActionLogEntry[]>;
}

// Stub implementation for demonstration and future development.
export class ActionLogService implements IActionLogService {
  private logDir: string;

  constructor(baseDir: string = '~/.thinkcoffee/logs') {
    // In a real implementation, resolve the home directory
    this.logDir = baseDir;
  }

  async log(entry: Omit<ActionLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: ActionLogEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    const logFilePath = `${this.logDir}/${logEntry.pipelineId}.jsonl`;
    const logLine = JSON.stringify(logEntry) + '\n';

    // In a real implementation, use fs.appendFile with proper error handling
    console.log(`[ActionLogService] Appending to ${logFilePath}: ${logLine}`);
    return Promise.resolve();
  }

  async getByPipeline(pipelineId: string): Promise<ActionLogEntry[]> {
    console.log(`[ActionLogService] Reading logs for pipeline ${pipelineId}`);
    // In a real implementation, read and parse the .jsonl file
    return Promise.resolve([]);
  }

  async getByPhase(pipelineId: string, phaseIndex: number): Promise<ActionLogEntry[]> {
    console.log(`[ActionLogService] Reading logs for pipeline ${pipelineId}, phase ${phaseIndex}`);
    // In a real implementation, read the file and filter by phaseIndex
    return Promise.resolve([]);
  }
}
