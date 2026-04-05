import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export interface SnapshotFileMetadata {
  path: string; // Caminho relativo ao workspace
  action: 'modified' | 'deleted' | 'created';
  hash?: string; // SHA-256 do conteúdo original (para 'modified' e 'deleted')
  size?: number; // Tamanho em bytes do arquivo original
}

export interface SnapshotMetadata {
  pipelineId: string;
  phaseIndex: number;
  phaseName: string;
  timestamp: string; // ISO 8601
  files: SnapshotFileMetadata[];
}

export class SnapshotService {
  private snapshotsDir: string;
  private workspaceRoot: string;

  constructor(snapshotsDir: string, workspaceRoot: string) {
    this.snapshotsDir = snapshotsDir;
    this.workspaceRoot = workspaceRoot;
  }

  private async calculateHash(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  private getSnapshotDir(pipelineId: string, phaseIndex: number): string {
    return path.join(this.snapshotsDir, pipelineId, phaseIndex.toString());
  }

  private getMetadataFilePath(snapshotDir: string): string {
    return path.join(snapshotDir, 'snapshot.json');
  }

  async snapshotFile(pipelineId: string, phaseIndex: number, phaseName: string, relativePath: string, action: 'modified' | 'deleted'): Promise<void> {
    const absolutePath = path.join(this.workspaceRoot, relativePath);
    
    // Check if the file exists before taking a snapshot
    try {
      await fs.access(absolutePath);
    } catch {
       return; // Arquivo não existe, não faz sentido snapshot de modify/delete
    }

    const snapshotDir = this.getSnapshotDir(pipelineId, phaseIndex);
    const metadataPath = this.getMetadataFilePath(snapshotDir);
    
    await fs.mkdir(snapshotDir, { recursive: true });

    let metadata: SnapshotMetadata = {
      pipelineId,
      phaseIndex,
      phaseName,
      timestamp: new Date().toISOString(),
      files: []
    };

    try {
       const existingMetadataStr = await fs.readFile(metadataPath, 'utf8');
       metadata = JSON.parse(existingMetadataStr);
    } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
    }

    // Se o arquivo já foi salvo nesta fase, não salva de novo
    if (metadata.files.some(f => f.path === relativePath)) {
      return;
    }

    const hash = await this.calculateHash(absolutePath);
    const stat = await fs.stat(absolutePath);

    const snapshotFilePath = path.join(snapshotDir, hash);
    
    // Copy file content to snapshot directory using hash as name
    try {
      await fs.copyFile(absolutePath, snapshotFilePath);
    } catch (e: any) {
       console.error(`Failed to snapshot file ${absolutePath}:`, e);
       throw e; // Propagate error for visibility
    }

    metadata.files.push({
      path: relativePath,
      action: action,
      hash,
      size: stat.size
    });

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  async recordCreatedFile(pipelineId: string, phaseIndex: number, phaseName: string, relativePath: string): Promise<void> {
    const snapshotDir = this.getSnapshotDir(pipelineId, phaseIndex);
    const metadataPath = this.getMetadataFilePath(snapshotDir);
    
    await fs.mkdir(snapshotDir, { recursive: true });

    let metadata: SnapshotMetadata = {
      pipelineId,
      phaseIndex,
      phaseName,
      timestamp: new Date().toISOString(),
      files: []
    };

    try {
       const existingMetadataStr = await fs.readFile(metadataPath, 'utf8');
       metadata = JSON.parse(existingMetadataStr);
    } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
    }

    // Se o arquivo já foi registrado, não salva de novo
    if (metadata.files.some(f => f.path === relativePath)) {
      return;
    }

    metadata.files.push({
        path: relativePath,
        action: 'created'
    });

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  async getSnapshot(pipelineId: string, phaseIndex: number): Promise<SnapshotMetadata | null> {
    const snapshotDir = this.getSnapshotDir(pipelineId, phaseIndex);
    const metadataPath = this.getMetadataFilePath(snapshotDir);

    try {
      const metadataStr = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(metadataStr) as SnapshotMetadata;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async cleanup(options: { retentionDays: number; activePipelines: string[] }): Promise<void> {
    // Implementar a lógica de limpeza de snapshots antigos
    console.log('Cleanup snapshots not fully implemented yet.', options);
  }
}
