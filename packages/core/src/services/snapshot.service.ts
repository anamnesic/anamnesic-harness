/**
 * Represents a single file change within a snapshot.
 */
export interface SnapshotFileEntry {
  path: string; // Relative path from workspace root
  action: 'modified' | 'created' | 'deleted';
  hash?: string; // SHA256 of the original content (for 'modified' and 'deleted')
  size?: number; // Size in bytes
}

/**
 * Metadata for a snapshot taken during a specific pipeline phase.
 * This is stored in 'snapshot.json' within the snapshot directory.
 */
export interface SnapshotMetadata {
  pipelineId: string;
  phaseIndex: number;
  phaseName: string;
  timestamp: string; // ISO 8601 format
  files: SnapshotFileEntry[];
}

/**
 * Interface for the SnapshotService, responsible for creating and managing file snapshots.
 */
export interface ISnapshotService {
  /**
   * Creates a snapshot of a single file before it's modified or deleted.
   * This is a lazy operation, called for each file just before the first change in a phase.
   * @param pipelineId - The current pipeline ID.
   * @param phaseIndex - The current phase index.
   * @param file - An object containing the file's relative path and original content.
   */
  createFileSnapshot(pipelineId: string, phaseIndex: number, file: { path: string; content: Buffer }): Promise<void>;

  /**
   * Records that a file was created during a phase. No content is stored.
   * @param pipelineId - The current pipeline ID.
   * @param phaseIndex - The current phase index.
   * @param path - The relative path of the created file.
   */
  recordFileCreation(pipelineId: string, phaseIndex: number, path: string): Promise<void>;

  /**
   * Retrieves the metadata for a given snapshot.
   * @param pipelineId - The pipeline ID.
   * @param phaseIndex - The phase index.
   * @returns A promise that resolves to the snapshot metadata, or null if not found.
   */
  getSnapshot(pipelineId: string, phaseIndex: number): Promise<SnapshotMetadata | null>;

  /**
   * Cleans up old snapshots based on retention policies.
   * @param options - Configuration for the cleanup process, e.g., retention days.
   */
  cleanup(options: { retentionDays: number }): Promise<{ removedCount: number; reclaimedSpace: number }>;
}

// Stub implementation for demonstration and future development.
export class SnapshotService implements ISnapshotService {
  private snapshotDir: string;

  constructor(baseDir: string = '~/.thinkcoffee/snapshots') {
    this.snapshotDir = baseDir;
  }

  async createFileSnapshot(pipelineId: string, phaseIndex: number, file: { path: string; content: Buffer; }): Promise<void> {
    const snapshotPath = `${this.snapshotDir}/${pipelineId}/${phaseIndex}/${file.path}`;
    console.log(`[SnapshotService] Saving snapshot for ${file.path} to ${snapshotPath}`);
    // In a real implementation, use fs.mkdir and fs.writeFile
    // Also, update the snapshot.json metadata file.
    return Promise.resolve();
  }

  async recordFileCreation(pipelineId: string, phaseIndex: number, path: string): Promise<void> {
    console.log(`[SnapshotService] Recording creation of ${path} in phase ${phaseIndex}`);
    // In a real implementation, update the snapshot.json metadata file.
    return Promise.resolve();
  }

  async getSnapshot(pipelineId: string, phaseIndex: number): Promise<SnapshotMetadata | null> {
    const metadataPath = `${this.snapshotDir}/${pipelineId}/${phaseIndex}/snapshot.json`;
    console.log(`[SnapshotService] Reading metadata from ${metadataPath}`);
    // In a real implementation, use fs.readFile and JSON.parse
    return Promise.resolve(null);
  }

  async cleanup(options: { retentionDays: number; }): Promise<{ removedCount: number; reclaimedSpace: number; }> {
    console.log(`[SnapshotService] Cleaning up snapshots older than ${options.retentionDays} days.`);
    // In a real implementation, scan directories, check timestamps and pipeline status.
    return Promise.resolve({ removedCount: 0, reclaimedSpace: 0 });
  }
}
