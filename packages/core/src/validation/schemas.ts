import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['active', 'archived', 'inactive']).optional(),
});

export const createContextEntrySchema = z.object({
  projectId: z.string().uuid(),
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(10000),
  category: z.enum(['architecture', 'requirements', 'dependencies', 'standards', 'general']).default('general'),
  priority: z.number().min(1).max(4).default(1),
  metadata: z.record(z.any()).optional().nullable(),
});

export const updateContextEntrySchema = z.object({
  key: z.string().min(1).max(100).optional(),
  value: z.string().min(1).max(10000).optional(),
  category: z.enum(['architecture', 'requirements', 'dependencies', 'standards', 'general']).optional(),
  priority: z.number().min(1).max(4).optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const createDecisionSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  rationale: z.record(z.any()).optional().nullable(),
  alternatives: z.record(z.any()).optional().nullable(),
});

export const updateDecisionSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  status: z.enum(['active', 'deprecated', 'superseded']).optional(),
  rationale: z.record(z.any()).optional().nullable(),
  alternatives: z.record(z.any()).optional().nullable(),
});

export const createApiKeySchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateContextEntryInput = z.infer<typeof createContextEntrySchema>;
export type UpdateContextEntryInput = z.infer<typeof updateContextEntrySchema>;
export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;
export type UpdateDecisionInput = z.infer<typeof updateDecisionSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
