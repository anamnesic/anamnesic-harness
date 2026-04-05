import { ISnapshotService, SnapshotMetadata } from './snapshot.service';

/**
 * Defines the result of a rollback operation.
 */
export interface RollbackResult {
  restoredFiles: string[];
  deletedFiles: string[]; // Files that were created by the phase and are now deleted.
}

/**
 * Interface for the RollbackService, responsible for reverting changes made in a pipeline phase.
 */
export interface IRollbackService {
  /**
   * Rolls back all file system changes made during a specific pipeline phase.
   * It uses the snapshot metadata to determine what to restore, create, or delete.
   * @param pipelineId - The ID of the pipeline to roll back.
   * @param phaseIndex - The index of the phase to roll back.
   * @returns A promise that resolves to a summary of the rollback actions.
   */
  rollbackPhase(pipelineId: string, phaseIndex: number): Promise<RollbackResult>;
}

// Stub implementation for demonstration and future development.
export class RollbackService implements IRollbackService {
  private snapshotService: ISnapshotService;
  private workspaceRoot: string;

  constructor(snapshotService: ISnapshotService, workspaceRoot: string) {
    this.snapshotService = snapshotService;
    this.workspaceRoot = workspaceRoot;
  }

  async rollbackPhase(pipelineId: string, phaseIndex: number): Promise<RollbackResult> {
    console.log(`[RollbackService] Starting rollback for pipeline ${pipelineId}, phase ${phaseIndex}`);

    const metadata = await this.snapshotService.getSnapshot(pipelineId, phaseIndex);
    if (!metadata) {
      console.log(`[RollbackService] No snapshot found. Nothing to roll back.`);
      return { restoredFiles: [], deletedFiles: [] };
    }

    const result: RollbackResult = { restoredFiles: [], deletedFiles: [] };

    for (const file of metadata.files) {
      const fullPath = `${this.workspaceRoot}/${file.path}`;
      switch (file.action) {
        case 'modified':
        case 'deleted':
          // In a real implementation, copy file from snapshot back to workspace
          console.log(`[RollbackService] Restoring file: ${file.path}`);
          result.restoredFiles.push(file.path);
          break;
        case 'created':
          // In a real implementation, delete the file from the workspace
          console.log(`[RollbackService] Deleting created file: ${file.path}`);
          result.deletedFiles.push(file.path);
          break;
      }
    }

    console.log(`[RollbackService] Rollback complete.`);
    return Promise.resolve(result);
  }
}
