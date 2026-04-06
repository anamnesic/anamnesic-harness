import {
    getDatabase,
    ProjectService,
    ContextService,
    DecisionService,
    PipelineService,
    exportProject,
    getExportFilename,
} from '@thinkcoffee/core';
import type { ExportFormat } from '@thinkcoffee/core';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

let _projectService: ProjectService | null = null;
let _contextService: ContextService | null = null;
let _decisionService: DecisionService | null = null;

const pipelineService = new PipelineService();

async function services() {
    if (!_projectService) {
        const db = await getDatabase();
        _projectService = new ProjectService(db);
        _contextService = new ContextService(db);
        _decisionService = new DecisionService(db);
    }
    return {
        projectService: _projectService!,
        contextService: _contextService!,
        decisionService: _decisionService!,
    };
}

export function registerProjectEndpoints(server: any) {
    // ─── Projects ────────────────────────────────────────────────

    server.tool(
        'list_projects',
        'List all ThinkCoffee projects.',
        {},
        async () => {
            const { projectService } = await services();
            const projects = await projectService.list();
            return { content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }] };
        }
    );

    server.tool(
        'get_project',
        'Get a project by ID.',
        { id: z.string().describe('Project ID') },
        async ({ id }: { id: string }) => {
            const { projectService } = await services();
            const project = await projectService.get(id);
            if (!project) return { content: [{ type: 'text', text: `Project not found: ${id}` }] };
            return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
        }
    );

    server.tool(
        'create_project',
        'Create a new ThinkCoffee project.',
        {
            name: z.string().describe('Project name'),
            description: z.string().optional().describe('Project description'),
            workspace: z.string().optional().describe('Absolute path to workspace folder to link'),
        },
        async ({ name, description, workspace }: { name: string; description?: string; workspace?: string }) => {
            const { projectService } = await services();
            const project = await projectService.create({ name, description });
            if (workspace) {
                await projectService.linkWorkspace(project.id, workspace);
            }
            return { content: [{ type: 'text', text: `Project created: ${project.name} (${project.id})` }] };
        }
    );

    server.tool(
        'update_project',
        'Update an existing project name or description.',
        {
            id: z.string().describe('Project ID'),
            name: z.string().optional().describe('New name'),
            description: z.string().optional().describe('New description'),
        },
        async ({ id, name, description }: { id: string; name?: string; description?: string }) => {
            const { projectService } = await services();
            await projectService.update(id, { name, description });
            return { content: [{ type: 'text', text: `Project updated: ${id}` }] };
        }
    );

    server.tool(
        'delete_project',
        'Delete a project by ID.',
        { id: z.string().describe('Project ID') },
        async ({ id }: { id: string }) => {
            const { projectService } = await services();
            await projectService.delete(id);
            return { content: [{ type: 'text', text: `Project deleted: ${id}` }] };
        }
    );

    // ─── Context ─────────────────────────────────────────────────

    server.tool(
        'list_context',
        'List context entries for a project, optionally filtered by category.',
        {
            projectId: z.string().describe('Project ID'),
            category: z.string().optional().describe('Category filter (architecture, requirements, dependencies, standards, general)'),
        },
        async ({ projectId, category }: { projectId: string; category?: string }) => {
            const { contextService } = await services();
            const items = await contextService.listByProject(projectId, category);
            return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
        }
    );

    server.tool(
        'search_context',
        'Search context entries for a project by keyword.',
        {
            projectId: z.string().describe('Project ID'),
            query: z.string().describe('Search query'),
        },
        async ({ projectId, query }: { projectId: string; query: string }) => {
            const { contextService } = await services();
            const items = await contextService.search(projectId, query);
            return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
        }
    );

    server.tool(
        'add_context',
        'Add a context entry to a project.',
        {
            projectId: z.string().describe('Project ID'),
            key: z.string().describe('Short label for this context'),
            value: z.string().describe('Context content/value'),
            category: z.enum(['architecture', 'requirements', 'dependencies', 'standards', 'general']).describe('Category'),
            priority: z.number().optional().describe('Priority (1=low, 2=normal, 3=high). Default 1.'),
        },
        async ({ projectId, key, value, category, priority }: {
            projectId: string; key: string; value: string;
            category: 'architecture' | 'requirements' | 'dependencies' | 'standards' | 'general';
            priority?: number;
        }) => {
            const { contextService } = await services();
            const item = await contextService.create({ projectId, key, value, category, priority });
            return { content: [{ type: 'text', text: `Context added: [${category}] ${key} (${item.id})` }] };
        }
    );

    server.tool(
        'update_context',
        'Update an existing context entry.',
        {
            id: z.string().describe('Context entry ID'),
            key: z.string().optional().describe('New key/label'),
            value: z.string().optional().describe('New value'),
            category: z.enum(['architecture', 'requirements', 'dependencies', 'standards', 'general']).optional(),
            priority: z.number().optional(),
        },
        async ({ id, key, value, category, priority }: {
            id: string; key?: string; value?: string;
            category?: 'architecture' | 'requirements' | 'dependencies' | 'standards' | 'general';
            priority?: number;
        }) => {
            const { contextService } = await services();
            await contextService.update(id, { key, value, category, priority });
            return { content: [{ type: 'text', text: `Context updated: ${id}` }] };
        }
    );

    server.tool(
        'delete_context',
        'Delete a context entry by ID.',
        { id: z.string().describe('Context entry ID') },
        async ({ id }: { id: string }) => {
            const { contextService } = await services();
            await contextService.delete(id);
            return { content: [{ type: 'text', text: `Context deleted: ${id}` }] };
        }
    );

    // ─── Decisions ───────────────────────────────────────────────

    server.tool(
        'list_decisions',
        'List architectural decisions recorded for a project.',
        { projectId: z.string().describe('Project ID') },
        async ({ projectId }: { projectId: string }) => {
            const { decisionService } = await services();
            const items = await decisionService.listByProject(projectId);
            return { content: [{ type: 'text', text: JSON.stringify(items, null, 2) }] };
        }
    );

    server.tool(
        'add_decision',
        'Record an architectural decision for a project.',
        {
            projectId: z.string().describe('Project ID'),
            title: z.string().describe('Short title of the decision'),
            description: z.string().describe('What was decided and why'),
        },
        async ({ projectId, title, description }: { projectId: string; title: string; description: string }) => {
            const { decisionService } = await services();
            const item = await decisionService.create({ projectId, title, description });
            return { content: [{ type: 'text', text: `Decision recorded: ${title} (${item.id})` }] };
        }
    );

    server.tool(
        'update_decision',
        'Update an architectural decision.',
        {
            id: z.string().describe('Decision ID'),
            title: z.string().optional(),
            description: z.string().optional(),
        },
        async ({ id, title, description }: { id: string; title?: string; description?: string }) => {
            const { decisionService } = await services();
            await decisionService.update(id, { title, description });
            return { content: [{ type: 'text', text: `Decision updated: ${id}` }] };
        }
    );

    server.tool(
        'delete_decision',
        'Delete an architectural decision by ID.',
        { id: z.string().describe('Decision ID') },
        async ({ id }: { id: string }) => {
            const { decisionService } = await services();
            await decisionService.delete(id);
            return { content: [{ type: 'text', text: `Decision deleted: ${id}` }] };
        }
    );

    // ─── Export / Sync ────────────────────────────────────────────

    server.tool(
        'export_project',
        'Export a project context to a specific format. Returns the file content as text.',
        {
            projectId: z.string().describe('Project ID'),
            format: z.enum(['markdown', 'json', 'plain', 'copilot', 'claude', 'cursor']).describe('Export format'),
        },
        async ({ projectId, format }: { projectId: string; format: ExportFormat }) => {
            const { projectService } = await services();
            const project = await projectService.get(projectId);
            if (!project) return { content: [{ type: 'text', text: `Project not found: ${projectId}` }] };
            const content = exportProject(project, format);
            return { content: [{ type: 'text', text: content }] };
        }
    );

    server.tool(
        'sync_context_files',
        'Write context export files (copilot-instructions, CLAUDE.md, .cursorrules) to the workspace directory.',
        {
            projectId: z.string().describe('Project ID'),
            workspaceRoot: z.string().describe('Absolute path to the workspace root directory'),
        },
        async ({ projectId, workspaceRoot }: { projectId: string; workspaceRoot: string }) => {
            const { projectService } = await services();
            const project = await projectService.get(projectId);
            if (!project) return { content: [{ type: 'text', text: `Project not found: ${projectId}` }] };

            const formats: ExportFormat[] = ['copilot', 'claude', 'cursor'];
            const written: string[] = [];

            for (const fmt of formats) {
                const content = exportProject(project, fmt);
                const filename = getExportFilename(fmt, project.name);
                const targetPath = path.join(workspaceRoot, filename);
                const dir = path.dirname(targetPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(targetPath, content, 'utf-8');
                written.push(filename);
            }

            return { content: [{ type: 'text', text: `Synced: ${written.join(', ')}` }] };
        }
    );

    // ─── Pipelines ───────────────────────────────────────────────

    server.tool(
        'list_pipelines',
        'List all pipelines for a project.',
        { projectId: z.string().describe('Project ID') },
        async ({ projectId }: { projectId: string }) => {
            const pipelines = pipelineService.list(projectId);
            return { content: [{ type: 'text', text: JSON.stringify(pipelines, null, 2) }] };
        }
    );

    server.tool(
        'get_active_pipeline',
        'Get the currently active pipeline for a project.',
        { projectId: z.string().describe('Project ID') },
        async ({ projectId }: { projectId: string }) => {
            const pipeline = pipelineService.getActive(projectId);
            if (!pipeline) return { content: [{ type: 'text', text: 'No active pipeline.' }] };
            return { content: [{ type: 'text', text: JSON.stringify(pipeline, null, 2) }] };
        }
    );

    server.tool(
        'create_pipeline',
        'Create a new pipeline for a project.',
        {
            projectId: z.string().describe('Project ID'),
            objective: z.string().describe('What should be built / the pipeline objective'),
            workspace: z.string().optional().describe('Absolute path to the workspace root'),
        },
        async ({ projectId, objective, workspace }: { projectId: string; objective: string; workspace?: string }) => {
            const pipeline = pipelineService.create(projectId, objective, workspace ?? '');
            return { content: [{ type: 'text', text: `Pipeline created: ${pipeline.id} — "${pipeline.objective}"` }] };
        }
    );

    server.tool(
        'approve_pipeline_phase',
        'Approve the current phase of the active pipeline, advancing to the next.',
        {
            projectId: z.string().describe('Project ID'),
            pipelineId: z.string().describe('Pipeline ID'),
        },
        async ({ projectId, pipelineId }: { projectId: string; pipelineId: string }) => {
            const updated = pipelineService.approvePhase(projectId, pipelineId);
            if (!updated) return { content: [{ type: 'text', text: 'Pipeline not found or phase approval failed.' }] };
            const nextPhase = updated.phases[updated.currentPhase];
            const msg = updated.status === 'completed'
                ? 'Pipeline completed! All phases done.'
                : `Phase approved. Next: ${nextPhase?.name ?? 'unknown'}`;
            return { content: [{ type: 'text', text: msg }] };
        }
    );

    server.tool(
        'reject_pipeline_phase',
        'Reject the current phase of the active pipeline with feedback.',
        {
            projectId: z.string().describe('Project ID'),
            pipelineId: z.string().describe('Pipeline ID'),
            feedback: z.string().describe('What needs to be changed or improved'),
        },
        async ({ projectId, pipelineId, feedback }: { projectId: string; pipelineId: string; feedback: string }) => {
            pipelineService.rejectPhase(projectId, pipelineId, feedback);
            return { content: [{ type: 'text', text: 'Phase rejected. Agents will redo with the provided feedback.' }] };
        }
    );
}
