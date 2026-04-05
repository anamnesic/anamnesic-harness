import * as vscode from 'vscode';
import {
  getDatabase,
  ProjectService,
  ContextService,
  DecisionService,
  exportProject,
  getExportFilename,
  ExportFormat,
} from '@thinkcoffee/core';
import type { Project } from '@thinkcoffee/core';
import fs from 'fs';
import path from 'path';

let projectService: ProjectService;
let contextService: ContextService;
let decisionService: DecisionService;

export async function activate(context: vscode.ExtensionContext) {
  const db = await getDatabase();
  projectService = new ProjectService(db);
  contextService = new ContextService(db);
  decisionService = new DecisionService(db);

  // Tree data providers
  const projectProvider = new ProjectTreeProvider();
  vscode.window.registerTreeDataProvider('thinkcoffee.projects', projectProvider);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('thinkcoffee.refreshProjects', () => projectProvider.refresh()),

    vscode.commands.registerCommand('thinkcoffee.addContext', async () => {
      const projects = await projectService.list();
      if (!projects.length) {
        vscode.window.showWarningMessage('No projects yet. Create one first.');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        projects.map(p => ({ label: p.name, description: p.id, project: p })),
        { placeHolder: 'Select project' }
      );
      if (!selected) return;

      const key = await vscode.window.showInputBox({ prompt: 'Context key (short label)' });
      if (!key) return;

      const value = await vscode.window.showInputBox({ prompt: 'Context value' });
      if (!value) return;

      const category = await vscode.window.showQuickPick(
        ['architecture', 'requirements', 'dependencies', 'standards', 'general'],
        { placeHolder: 'Category' }
      );
      if (!category) return;

      await contextService.create({ projectId: selected.description!, key, value, category });
      vscode.window.showInformationMessage(`Context added: [${category}] ${key}`);
      projectProvider.refresh();
    }),

    vscode.commands.registerCommand('thinkcoffee.addDecision', async () => {
      const projects = await projectService.list();
      if (!projects.length) {
        vscode.window.showWarningMessage('No projects yet.');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        projects.map(p => ({ label: p.name, description: p.id })),
        { placeHolder: 'Select project' }
      );
      if (!selected) return;

      const title = await vscode.window.showInputBox({ prompt: 'Decision title' });
      if (!title) return;

      const description = await vscode.window.showInputBox({ prompt: 'What was decided and why?' });
      if (!description) return;

      await decisionService.create({ projectId: selected.description!, title, description });
      vscode.window.showInformationMessage(`Decision recorded: ${title}`);
      projectProvider.refresh();
    }),

    vscode.commands.registerCommand('thinkcoffee.syncContext', async () => {
      const projects = await projectService.list();
      const selected = await vscode.window.showQuickPick(
        projects.map(p => ({ label: p.name, description: p.id, project: p })),
        { placeHolder: 'Select project to sync' }
      );
      if (!selected) return;

      const project = await projectService.get(selected.description!);
      if (!project) return;

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
      }

      const formats: ExportFormat[] = ['copilot', 'claude', 'cursor'];
      const written: string[] = [];

      for (const format of formats) {
        const content = exportProject(project, format);
        const targetPath = path.join(workspaceRoot, getExportFilename(format, project.name));
        const dir = path.dirname(targetPath);

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(targetPath, content, 'utf-8');
        written.push(getExportFilename(format, project.name));
      }

      vscode.window.showInformationMessage(`Synced: ${written.join(', ')}`);
    }),

    vscode.commands.registerCommand('thinkcoffee.exportContext', async () => {
      const projects = await projectService.list();
      const selected = await vscode.window.showQuickPick(
        projects.map(p => ({ label: p.name, description: p.id })),
        { placeHolder: 'Select project' }
      );
      if (!selected) return;

      const format = await vscode.window.showQuickPick(
        ['markdown', 'json', 'plain', 'copilot', 'claude', 'cursor'],
        { placeHolder: 'Export format' }
      ) as ExportFormat | undefined;
      if (!format) return;

      const project = await projectService.get(selected.description!);
      if (!project) return;

      const content = exportProject(project, format);
      const doc = await vscode.workspace.openTextDocument({ content, language: format === 'json' ? 'json' : 'markdown' });
      await vscode.window.showTextDocument(doc);
    })
  );
}

export function deactivate() {}

// --- Tree Data Provider ---

class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
  private _onDidChange = new vscode.EventEmitter<ProjectTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  refresh() { this._onDidChange.fire(undefined); }

  async getTreeItem(element: ProjectTreeItem) { return element; }

  async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    if (!element) {
      const projects = await projectService.list();
      return projects.map(p => new ProjectTreeItem(p, vscode.TreeItemCollapsibleState.Collapsed));
    }

    const items: ProjectTreeItem[] = [];

    if (element.project.contextEntries?.length) {
      for (const e of element.project.contextEntries) {
        const item = new ProjectTreeItem(
          { ...element.project, name: `[${e.category}] ${e.key}`, description: e.value } as any,
          vscode.TreeItemCollapsibleState.None
        );
        item.tooltip = e.value;
        items.push(item);
      }
    }

    if (element.project.decisions?.length) {
      for (const d of element.project.decisions) {
        const item = new ProjectTreeItem(
          { ...element.project, name: `[decision] ${d.title}`, description: d.description } as any,
          vscode.TreeItemCollapsibleState.None
        );
        item.tooltip = d.description;
        items.push(item);
      }
    }

    return items;
  }
}

class ProjectTreeItem extends vscode.TreeItem {
  constructor(public readonly project: Project, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(project.name, collapsibleState);
    this.description = project.description || '';
    this.contextValue = 'project';
  }
}
