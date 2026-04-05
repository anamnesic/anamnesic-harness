import fs from 'node:fs/promises';
import path from 'node:path';
import { SnapshotService, SnapshotMetadata } from './SnapshotService';

export class RollbackService {
  private snapshotService: SnapshotService;
  private workspaceRoot: string;

  constructor(snapshotService: SnapshotService, workspaceRoot: string) {
    this.snapshotService = snapshotService;
    this.workspaceRoot = workspaceRoot;
  }

  async plan(pipelineId: string, phaseIndex: number): Promise<{ filesToRestore: string[], filesToDelete: string[] }> {
    const snapshotMetadata = await this.snapshotService.getSnapshot(pipelineId, phaseIndex);

    if (!snapshotMetadata) {
      throw new Error(`Snapshot não encontrado para o pipelineId: ${pipelineId}, phaseIndex: ${phaseIndex}`);
    }

    const filesToRestore: string[] = [];
    const filesToDelete: string[] = [];

    for (const fileMetadata of snapshotMetadata.files) {
      if (fileMetadata.action === 'created') {
         filesToDelete.push(fileMetadata.path);
      } else if (fileMetadata.action === 'modified' || fileMetadata.action === 'deleted') {
         filesToRestore.push(fileMetadata.path);
      }
    }

    return { filesToRestore, filesToDelete };
  }

  async execute(pipelineId: string, phaseIndex: number): Promise<void> {
    const snapshotMetadata = await this.snapshotService.getSnapshot(pipelineId, phaseIndex);

    if (!snapshotMetadata) {
      throw new Error(`Snapshot não encontrado para o pipelineId: ${pipelineId}, phaseIndex: ${phaseIndex}`);
    }

    const planData = await this.plan(pipelineId, phaseIndex);

    // Rollback deletes (reverse of create)
    for (const fileToDelete of planData.filesToDelete) {
        const absolutePath = path.join(this.workspaceRoot, fileToDelete);
        try {
            await fs.rm(absolutePath, { force: true });
        } catch (e: any) {
            console.warn(`Could not delete file during rollback: ${absolutePath}`);
        }
    }

    // Rollback restores (reverse of modify/delete)
    for (const fileToRestore of planData.filesToRestore) {
        const absolutePath = path.join(this.workspaceRoot, fileToRestore);
        const metadata = snapshotMetadata.files.find(f => f.path === fileToRestore);
        
        if (!metadata || !metadata.hash) {
            throw new Error(`Missing hash for file to restore: ${fileToRestore}`);
        }

        const snapshotFilePath = path.join(this.snapshotService['getSnapshotDir'](pipelineId, phaseIndex), metadata.hash);

        try {
            // Restore file content from snapshot
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
            await fs.copyFile(snapshotFilePath, absolutePath);
        } catch (e: any) {
             console.error(`Could not restore file during rollback: ${absolutePath} from ${snapshotFilePath}`, e);
             throw e; // Lançamos o erro se a restauração falhar para visibilidade
        }
    }

    console.log(`Rollback concluído para o pipelineId: ${pipelineId}, phaseIndex: ${phaseIndex}`);
  }
}
