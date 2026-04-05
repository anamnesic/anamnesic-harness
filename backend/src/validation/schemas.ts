import { z } from 'zod';

// Project validation schemas
export const createProjectSchema = z.object({
  name: z.string()
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name must not exceed 100 characters'),
  description: z.string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string()
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name must not exceed 100 characters')
    .optional(),
  description: z.string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .nullable(),
  status: z.enum(['active', 'archived', 'inactive']).optional(),
});

// Context Entry validation schemas
export const createContextEntrySchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  key: z.string()
    .min(1, 'Key is required')
    .max(100, 'Key must not exceed 100 characters'),
  value: z.string()
    .min(1, 'Value is required')
    .max(10000, 'Value must not exceed 10000 characters'),
  category: z.enum(['architecture', 'requirements', 'dependencies', 'standards', 'general'])
    .default('general'),
  priority: z.number()
    .min(1, 'Priority must be between 1 and 4')
    .max(4, 'Priority must be between 1 and 4')
    .default(1),
  metadata: z.record(z.any()).optional().nullable(),
});

export const updateContextEntrySchema = z.object({
  key: z.string()
    .min(1, 'Key is required')
    .max(100, 'Key must not exceed 100 characters')
    .optional(),
  value: z.string()
    .min(1, 'Value is required')
    .max(10000, 'Value must not exceed 10000 characters')
    .optional(),
  category: z.enum(['architecture', 'requirements', 'dependencies', 'standards', 'general'])
    .optional(),
  priority: z.number()
    .min(1)
    .max(4)
    .optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

// Decision validation schemas
export const createDecisionSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  rationale: z.record(z.any()).optional().nullable(),
  alternatives: z.record(z.any()).optional().nullable(),
});

export const updateDecisionSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters')
    .optional(),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters')
    .optional(),
  status: z.enum(['active', 'deprecated', 'superseded']).optional(),
  rationale: z.record(z.any()).optional().nullable(),
  alternatives: z.record(z.any()).optional().nullable(),
});

// API Key validation
export const createApiKeySchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters'),
});

// Type exports for use in resolvers
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateContextEntryInput = z.infer<typeof createContextEntrySchema>;
export type UpdateContextEntryInput = z.infer<typeof updateContextEntrySchema>;
export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;
export type UpdateDecisionInput = z.infer<typeof updateDecisionSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;