// packages/core/src/types/guardrails.ts

export interface SnapshotFile {
  path: string;
  action: 'create' | 'update' | 'delete';
  originalPath?: string;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  files: SnapshotFile[];
}

export interface PipelineMetric {
  taskId: string;
  agent: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  toolCalls: number;
  filesModified: number;
  errors: number;
}

export type ConfirmationMode = 'always' | 'destructive-only' | 'never';

export interface GuardrailOptions {
  dryRun: boolean;
  confirmMode: ConfirmationMode;
  onConfirm: (prompt: string) => Promise<boolean>;
  onShowDiff: (path: string, newContent: string) => Promise<boolean>;
}
