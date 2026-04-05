export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  metadata?: Record<string, any>;
  contextEntries: ContextEntry[];
  decisions: Decision[];
  createdAt: string;
  updatedAt: string;
}

export interface ContextEntry {
  id: string;
  key: string;
  value: string;
  category: string;
  metadata?: Record<string, any>;
  priority: number;
  project: Project;
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  rationale?: Record<string, any>;
  status: string;
  alternatives?: Record<string, any>;
  project: Project;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface CreateContextEntryInput {
  projectId: string;
  key: string;
  value: string;
  category?: string;
  metadata?: Record<string, any>;
  priority?: number;
}

export interface CreateDecisionInput {
  projectId: string;
  title: string;
  description: string;
  rationale?: Record<string, any>;
  alternatives?: Record<string, any>;
}