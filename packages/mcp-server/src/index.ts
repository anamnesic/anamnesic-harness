#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  getDatabase,
  ProjectService,
  ContextService,
  DecisionService,
  exportProject,
  ExportFormat,
} from '@thinkcoffee/core';

const CATEGORIES = ['architecture', 'requirements', 'dependencies', 'standards', 'general'] as const;

async function main() {
  const db = await getDatabase();
  const projects = new ProjectService(db);
  const contexts = new ContextService(db);
  const decisions = new DecisionService(db);

  const server = new McpServer({
    name: 'thinkcoffee',
    version: '1.0.0',
  });

  // ─── Resources ───────────────────────────────────────────────
  // List all projects
  server.resource(
    'projects',
    'thinkcoffee://projects',
    async (uri) => {
      const all = await projects.list();
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(all.map(p => ({ id: p.id, name: p.name, description: p.description, status: p.status })), null, 2),
        }],
      };
    }
  );

  // Project context (all entries as markdown)
  server.resource(
    'project-context',
    'thinkcoffee://projects/{projectId}/context',
    async (uri, { projectId }) => {
      const project = await projects.get(projectId as string);
      if (!project) return { contents: [{ uri: uri.href, text: 'Project not found' }] };

      const md = exportProject(project, 'markdown');
      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: md }] };
    }
  );

  // ─── Tools ───────────────────────────────────────────────────

  // --- Project tools ---
  server.tool(
    'list_projects',
    'List all ThinkCoffee projects',
    {},
    async () => {
      const all = await projects.list();
      const summary = all.map(p =>
        `- **${p.name}** (${p.id}) [${p.status}] - ${p.contextEntries?.length || 0} contexts, ${p.decisions?.length || 0} decisions`
      ).join('\n');
      return { content: [{ type: 'text', text: summary || 'No projects yet. Use create_project to get started.' }] };
    }
  );

  server.tool(
    'create_project',
    'Create a new ThinkCoffee project',
    { name: z.string().describe('Project name'), description: z.string().optional().describe('Project description') },
    async ({ name, description }) => {
      const project = await projects.create({ name, description });
      return { content: [{ type: 'text', text: `Project created: ${project.name} (${project.id})` }] };
    }
  );

  server.tool(
    'get_project',
    'Get full project details including all context entries and decisions',
    { projectId: z.string().describe('Project ID or name') },
    async ({ projectId }) => {
      let project = await projects.get(projectId);
      if (!project) project = await projects.findByName(projectId);
      if (!project) return { content: [{ type: 'text', text: `Project not found: ${projectId}` }] };

      const md = exportProject(project, 'markdown');
      return { content: [{ type: 'text', text: md }] };
    }
  );

  server.tool(
    'delete_project',
    'Delete a project and all its data',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => {
      await projects.delete(projectId);
      return { content: [{ type: 'text', text: `Project ${projectId} deleted.` }] };
    }
  );

  // --- Context tools ---
  server.tool(
    'add_context',
    'Add a context entry to a project (architecture, requirements, dependencies, standards, general)',
    {
      projectId: z.string().describe('Project ID'),
      key: z.string().describe('Short label for this context entry'),
      value: z.string().describe('The context content'),
      category: z.enum(CATEGORIES).default('general').describe('Category of this context'),
      priority: z.number().min(1).max(4).default(1).describe('Priority 1-4 (4 = highest)'),
    },
    async ({ projectId, key, value, category, priority }) => {
      const entry = await contexts.create({ projectId, key, value, category, priority });
      return { content: [{ type: 'text', text: `Context added: [${entry.category}] ${entry.key} (priority: ${entry.priority})` }] };
    }
  );

  server.tool(
    'update_context',
    'Update an existing context entry',
    {
      id: z.string().describe('Context entry ID'),
      key: z.string().optional().describe('New label'),
      value: z.string().optional().describe('New content'),
      category: z.enum(CATEGORIES).optional().describe('New category'),
      priority: z.number().min(1).max(4).optional().describe('New priority'),
    },
    async ({ id, ...updates }) => {
      const entry = await contexts.update(id, updates);
      return { content: [{ type: 'text', text: `Context updated: [${entry.category}] ${entry.key}` }] };
    }
  );

  server.tool(
    'remove_context',
    'Delete a context entry',
    { id: z.string().describe('Context entry ID') },
    async ({ id }) => {
      await contexts.delete(id);
      return { content: [{ type: 'text', text: `Context entry ${id} removed.` }] };
    }
  );

  server.tool(
    'search_context',
    'Search context entries within a project by keyword',
    {
      projectId: z.string().describe('Project ID'),
      query: z.string().describe('Search keyword'),
    },
    async ({ projectId, query }) => {
      const results = await contexts.search(projectId, query);
      if (!results.length) return { content: [{ type: 'text', text: `No results for "${query}"` }] };

      const text = results.map(e =>
        `**[${e.category}] ${e.key}** (priority: ${e.priority})\n${e.value}`
      ).join('\n\n---\n\n');
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool(
    'list_context',
    'List context entries for a project, optionally filtered by category',
    {
      projectId: z.string().describe('Project ID'),
      category: z.enum(CATEGORIES).optional().describe('Filter by category'),
    },
    async ({ projectId, category }) => {
      const entries = await contexts.listByProject(projectId, category);
      if (!entries.length) return { content: [{ type: 'text', text: 'No context entries found.' }] };

      const text = entries.map(e =>
        `- **[${e.category}] ${e.key}** (id: ${e.id}, priority: ${e.priority}): ${e.value.substring(0, 120)}${e.value.length > 120 ? '...' : ''}`
      ).join('\n');
      return { content: [{ type: 'text', text }] };
    }
  );

  // --- Decision tools ---
  server.tool(
    'add_decision',
    'Record an architectural or design decision',
    {
      projectId: z.string().describe('Project ID'),
      title: z.string().describe('Decision title'),
      description: z.string().describe('What was decided and why'),
      rationale: z.string().optional().describe('Reasoning behind the decision'),
      alternatives: z.string().optional().describe('Alternatives that were considered'),
    },
    async ({ projectId, title, description, rationale, alternatives }) => {
      const decision = await decisions.create({
        projectId,
        title,
        description,
        rationale: rationale ? { text: rationale } : undefined,
        alternatives: alternatives ? { text: alternatives } : undefined,
      });
      return { content: [{ type: 'text', text: `Decision recorded: ${decision.title} (${decision.id})` }] };
    }
  );

  server.tool(
    'update_decision',
    'Update an existing decision',
    {
      id: z.string().describe('Decision ID'),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['active', 'deprecated', 'superseded']).optional(),
    },
    async ({ id, ...updates }) => {
      const decision = await decisions.update(id, updates);
      return { content: [{ type: 'text', text: `Decision updated: ${decision.title} [${decision.status}]` }] };
    }
  );

  server.tool(
    'remove_decision',
    'Delete a decision record',
    { id: z.string().describe('Decision ID') },
    async ({ id }) => {
      await decisions.delete(id);
      return { content: [{ type: 'text', text: `Decision ${id} removed.` }] };
    }
  );

  server.tool(
    'list_decisions',
    'List all decisions for a project',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => {
      const decs = await decisions.listByProject(projectId);
      if (!decs.length) return { content: [{ type: 'text', text: 'No decisions recorded.' }] };

      const text = decs.map(d =>
        `- **${d.title}** [${d.status}] (id: ${d.id}): ${d.description.substring(0, 120)}${d.description.length > 120 ? '...' : ''}`
      ).join('\n');
      return { content: [{ type: 'text', text }] };
    }
  );

  // --- Export tool ---
  server.tool(
    'export_context',
    'Export project context in various formats (json, markdown, plain, copilot, claude, cursor)',
    {
      projectId: z.string().describe('Project ID'),
      format: z.enum(['json', 'markdown', 'plain', 'copilot', 'claude', 'cursor']).default('markdown').describe('Export format'),
    },
    async ({ projectId, format }) => {
      const project = await projects.get(projectId);
      if (!project) return { content: [{ type: 'text', text: `Project not found: ${projectId}` }] };

      const output = exportProject(project, format as ExportFormat);
      return { content: [{ type: 'text', text: output }] };
    }
  );

  // ─── Prompts ─────────────────────────────────────────────────

  server.prompt(
    'project_context',
    'Get full project context for AI consumption',
    { projectId: z.string().describe('Project ID or name') },
    async ({ projectId }) => {
      let project = await projects.get(projectId);
      if (!project) project = await projects.findByName(projectId);
      if (!project) {
        return { messages: [{ role: 'user', content: { type: 'text', text: `Project "${projectId}" not found.` } }] };
      }

      const md = exportProject(project, 'markdown');
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Here is the full context for project "${project.name}":\n\n${md}\n\nUse this context to inform your responses about this project.`,
          },
        }],
      };
    }
  );

  server.prompt(
    'architecture_summary',
    'Get architecture-specific context for a project',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => {
      const entries = await contexts.listByProject(projectId, 'architecture');
      const decs = await decisions.listByProject(projectId);

      const parts: string[] = ['# Architecture Context', ''];
      if (entries.length) {
        for (const e of entries) {
          parts.push(`## ${e.key}`, '', e.value, '');
        }
      }
      if (decs.length) {
        parts.push('## Key Decisions', '');
        for (const d of decs.filter(d => d.status === 'active')) {
          parts.push(`### ${d.title}`, '', d.description, '');
        }
      }

      return {
        messages: [{
          role: 'user',
          content: { type: 'text', text: parts.join('\n') },
        }],
      };
    }
  );

  // ─── Start server ────────────────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('ThinkCoffee MCP Server failed to start:', err);
  process.exit(1);
});
