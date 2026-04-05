import * as vscode from 'vscode';
import {
  getDatabase,
  ProjectService,
  ContextService,
  DecisionService,
  exportProject,
  getExportFilename,
  ExportFormat,
  ChatService,
} from '@thinkcoffee/core';
import type { Project, ContextEntry, Decision } from '@thinkcoffee/core';
import { ChatPanel } from './chat/ChatPanel';
import fs from 'fs';
import path from 'path';

let projectService: ProjectService;
let contextService: ContextService;
let decisionService: DecisionService;

// ─── Helpers ─────────────────────────────────────────────────
async function pickProject(): Promise<Project | undefined> {
  const projects = await projectService.list();
  if (!projects.length) {
    vscode.window.showWarningMessage('No ThinkCoffee projects yet. Create one first.');
    return;
  }
  const selected = await vscode.window.showQuickPick(
    projects.map(p => ({ label: p.name, description: p.id, detail: p.description || '', project: p })),
    { placeHolder: 'Select a project' }
  );
  return selected ? await projectService.get(selected.description!) || undefined : undefined;
}

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/** Get relative path of a file from workspace root */
function relPath(absPath: string): string {
  const root = getWorkspaceRoot();
  if (!root) return absPath;
  return path.relative(root, absPath).replace(/\\/g, '/');
}

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

    // ─── Create Project ──────────────────────────────────────
    vscode.commands.registerCommand('thinkcoffee.createProject', async () => {
      const root = getWorkspaceRoot();
      const defaultName = root ? path.basename(root) : '';
      const name = await vscode.window.showInputBox({ prompt: 'Project name', value: defaultName });
      if (!name) return;
      const description = await vscode.window.showInputBox({ prompt: 'Project description (optional)' });
      const project = await projectService.create({ name, description: description || undefined });
      vscode.window.showInformationMessage(`Project created: ${project.name} (${project.id})`);
      projectProvider.refresh();
    }),

    // ─── Add Context ─────────────────────────────────────────
    vscode.commands.registerCommand('thinkcoffee.addContext', async () => {
      const project = await pickProject();
      if (!project) return;

      const key = await vscode.window.showInputBox({ prompt: 'Context key (short label)' });
      if (!key) return;

      const value = await vscode.window.showInputBox({ prompt: 'Context value' });
      if (!value) return;

      const category = await vscode.window.showQuickPick(
        ['architecture', 'requirements', 'dependencies', 'standards', 'general'],
        { placeHolder: 'Category' }
      );
      if (!category) return;

      await contextService.create({ projectId: project.id, key, value, category });
      vscode.window.showInformationMessage(`Context added: [${category}] ${key}`);
      projectProvider.refresh();
    }),

    // ─── Add File as Context ─────────────────────────────────
    vscode.commands.registerCommand('thinkcoffee.addFileAsContext', async (uri?: vscode.Uri) => {
      const fileUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!fileUri) {
        vscode.window.showWarningMessage('No file selected or open.');
        return;
      }

      const project = await pickProject();
      if (!project) return;

      const doc = await vscode.workspace.openTextDocument(fileUri);
      const content = doc.getText();
      const rel = relPath(fileUri.fsPath);
      const lang = doc.languageId;

      const key = await vscode.window.showInputBox({
        prompt: 'Context key',
        value: `file:${rel}`,
      });
      if (!key) return;

      const category = await vscode.window.showQuickPick(
        ['architecture', 'requirements', 'dependencies', 'standards', 'general'],
        { placeHolder: 'Category' }
      );
      if (!category) return;

      const value = `File: \`${rel}\` (${lang})\n\n\`\`\`${lang}\n${content}\n\`\`\``;
      await contextService.create({ projectId: project.id, key, value, category, priority: 2 });
      vscode.window.showInformationMessage(`File added as context: ${rel}`);
      projectProvider.refresh();
    }),

    // ─── Add Selection as Context ────────────────────────────
    vscode.commands.registerCommand('thinkcoffee.addSelectionAsContext', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.selection.isEmpty) {
        vscode.window.showWarningMessage('No text selected.');
        return;
      }

      const project = await pickProject();
      if (!project) return;

      const selection = editor.document.getText(editor.selection);
      const rel = relPath(editor.document.uri.fsPath);
      const lang = editor.document.languageId;
      const startLine = editor.selection.start.line + 1;
      const endLine = editor.selection.end.line + 1;

      const key = await vscode.window.showInputBox({
        prompt: 'Context key',
        value: `${rel}:L${startLine}-L${endLine}`,
      });
      if (!key) return;

      const category = await vscode.window.showQuickPick(
        ['architecture', 'requirements', 'dependencies', 'standards', 'general'],
        { placeHolder: 'Category' }
      );
      if (!category) return;

      const value = `From \`${rel}\` lines ${startLine}-${endLine} (${lang}):\n\n\`\`\`${lang}\n${selection}\n\`\`\``;
      await contextService.create({ projectId: project.id, key, value, category, priority: 2 });
      vscode.window.showInformationMessage(`Selection added as context: ${key}`);
      projectProvider.refresh();
    }),

    // ─── Add Workspace Structure as Context ──────────────────
    vscode.commands.registerCommand('thinkcoffee.addStructureAsContext', async () => {
      const root = getWorkspaceRoot();
      if (!root) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
      }

      const project = await pickProject();
      if (!project) return;

      const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'coverage', '.cache', 'target']);
      const lines: string[] = [path.basename(root) + '/'];

      function tree(dir: string, prefix: string, depth: number) {
        if (depth >= 4) return;
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        entries.sort((a, b) => {
          if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        const filtered = entries.filter(e => !IGNORE.has(e.name) && !e.name.startsWith('.'));
        for (let i = 0; i < filtered.length; i++) {
          const entry = filtered[i];
          const isLast = i === filtered.length - 1;
          const connector = isLast ? '`-- ' : '|-- ';
          const child = isLast ? '    ' : '|   ';
          if (entry.isDirectory()) {
            lines.push(`${prefix}${connector}${entry.name}/`);
            tree(path.join(dir, entry.name), prefix + child, depth + 1);
          } else {
            lines.push(`${prefix}${connector}${entry.name}`);
          }
        }
      }
      tree(root, '', 0);
      const structure = lines.join('\n');

      await contextService.create({
        projectId: project.id,
        key: 'project-structure',
        value: `Workspace directory tree:\n\n\`\`\`\n${structure}\n\`\`\``,
        category: 'architecture',
        priority: 3,
      });
      vscode.window.showInformationMessage('Workspace structure added as context.');
      projectProvider.refresh();
    }),

    // ─── Add Decision ────────────────────────────────────────
    vscode.commands.registerCommand('thinkcoffee.addDecision', async () => {
      const project = await pickProject();
      if (!project) return;

      const title = await vscode.window.showInputBox({ prompt: 'Decision title' });
      if (!title) return;

      const description = await vscode.window.showInputBox({ prompt: 'What was decided and why?' });
      if (!description) return;

      await decisionService.create({ projectId: project.id, title, description });
      vscode.window.showInformationMessage(`Decision recorded: ${title}`);
      projectProvider.refresh();
    }),

    // ─── Sync Context ────────────────────────────────────────
    vscode.commands.registerCommand('thinkcoffee.syncContext', async () => {
      const project = await pickProject();
      if (!project) return;

      const workspaceRoot = getWorkspaceRoot();
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

    // ─── Export Context ──────────────────────────────────────
    vscode.commands.registerCommand('thinkcoffee.exportContext', async () => {
      const project = await pickProject();
      if (!project) return;

      const format = await vscode.window.showQuickPick(
        ['markdown', 'json', 'plain', 'copilot', 'claude', 'cursor'],
        { placeHolder: 'Export format' }
      ) as ExportFormat | undefined;
      if (!format) return;

      const content = exportProject(project, format);
      const doc = await vscode.workspace.openTextDocument({ content, language: format === 'json' ? 'json' : 'markdown' });
      await vscode.window.showTextDocument(doc);
    }),

    // ─── Open Chat ───────────────────────────────────────────
    vscode.commands.registerCommand('thinkcoffee.openChat', () => {
      const chat = new ChatService('default');
      ChatPanel.create(context.extensionUri, chat);
    }),

    // ─── Open File from Context ──────────────────────────────
    vscode.commands.registerCommand('thinkcoffee.openContextFile', async (item?: ContextTreeItem) => {
      if (!item?.entry) return;
      const match = item.entry.value.match(/(?:File|From)\s*:\s*`([^`]+)`/);
      if (!match) {
        ContextViewerPanel.show(context.extensionUri, item.entry);
        return;
      }
      const root = getWorkspaceRoot();
      if (!root) return;
      const abs = path.join(root, match[1]);
      if (fs.existsSync(abs)) {
        const doc = await vscode.workspace.openTextDocument(abs);
        await vscode.window.showTextDocument(doc);
      } else {
        vscode.window.showWarningMessage(`File not found: ${match[1]}`);
      }
    }),

    // ─── View Context Entry ──────────────────────────────────
    vscode.commands.registerCommand('thinkcoffee.viewContext', (item?: ContextTreeItem) => {
      if (!item?.entry) return;
      ContextViewerPanel.show(context.extensionUri, item.entry);
    })
  );
}

export function deactivate() {}

// --- Tree Data Provider ---

type TreeNode = ProjectTreeItem | SectionTreeItem | ContextTreeItem | DecisionTreeItem;

class ProjectTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChange = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  refresh() { this._onDidChange.fire(undefined); }

  async getTreeItem(element: TreeNode) { return element; }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (!element) {
      const projects = await projectService.list();
      return projects.map(p => new ProjectTreeItem(p));
    }

    if (element instanceof ProjectTreeItem) {
      const items: SectionTreeItem[] = [];
      const ctxCount = element.project.contextEntries?.length || 0;
      const decCount = element.project.decisions?.length || 0;
      items.push(new SectionTreeItem('context', `Context (${ctxCount})`, element.project));
      items.push(new SectionTreeItem('decisions', `Decisions (${decCount})`, element.project));
      return items;
    }

    if (element instanceof SectionTreeItem) {
      if (element.section === 'context') {
        return (element.project.contextEntries || [])
          .sort((a, b) => b.priority - a.priority)
          .map(e => new ContextTreeItem(e));
      }
      if (element.section === 'decisions') {
        return (element.project.decisions || [])
          .map(d => new DecisionTreeItem(d));
      }
    }

    return [];
  }
}

class ProjectTreeItem extends vscode.TreeItem {
  constructor(public readonly project: Project) {
    super(project.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.description = project.status;
    this.tooltip = project.description || project.name;
    this.contextValue = 'project';
  }
}

class SectionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly section: 'context' | 'decisions',
    label: string,
    public readonly project: Project
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = `section-${section}`;
  }
}

class ContextTreeItem extends vscode.TreeItem {
  constructor(public readonly entry: ContextEntry) {
    super(`[${entry.category}] ${entry.key}`, vscode.TreeItemCollapsibleState.None);
    const isFile = /(?:File|From)\s*:\s*`[^`]+`/.test(entry.value);
    this.description = `P${entry.priority}` + (isFile ? ' (file)' : '');
    this.tooltip = entry.value.substring(0, 300);
    this.contextValue = isFile ? 'context-file' : 'context';
    this.command = {
      command: isFile ? 'thinkcoffee.openContextFile' : 'thinkcoffee.viewContext',
      title: isFile ? 'Open File' : 'View Context',
      arguments: [this],
    };
  }
}

class DecisionTreeItem extends vscode.TreeItem {
  constructor(public readonly decision: Decision) {
    super(decision.title, vscode.TreeItemCollapsibleState.None);
    this.description = `[${decision.status}]`;
    this.tooltip = decision.description;
    this.contextValue = 'decision';
  }
}

// --- Context Viewer Panel ---

class ContextViewerPanel {
  private static panels = new Map<string, vscode.WebviewPanel>();

  static show(extensionUri: vscode.Uri, entry: ContextEntry) {
    const existing = this.panels.get(entry.id);
    if (existing) {
      existing.reveal();
      existing.webview.html = this._getHtml(entry);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'thinkcoffeeContext',
      `[${entry.category}] ${entry.key}`,
      vscode.ViewColumn.One,
      { enableScripts: false }
    );

    panel.webview.html = this._getHtml(entry);
    this.panels.set(entry.id, panel);
    panel.onDidDispose(() => this.panels.delete(entry.id));
  }

  private static _getHtml(entry: ContextEntry): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Render value with basic markdown: code blocks, inline code, bold
    let body = esc(entry.value);
    // Fenced code blocks
    body = body.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
      `<pre class="code-block"><code>${code.trimEnd()}</code></pre>`
    );
    // Inline code
    body = body.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    // Bold
    body = body.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Line breaks (outside pre)
    body = body.replace(/\n/g, '<br>');
    // Fix double <br> inside <pre>
    body = body.replace(/<pre class="code-block"><code>([\s\S]*?)<\/code><\/pre>/g, (_m, code) =>
      `<pre class="code-block"><code>${(code as string).replace(/<br>/g, '\n')}</code></pre>`
    );

    const priorityLabels = ['', 'Low', 'Normal', 'High', 'Critical'];
    const priorityColors = ['', '#888', 'var(--vscode-foreground)', '#e5a00d', '#f14c4c'];
    const categoryIcons: Record<string, string> = {
      architecture: 'S',
      requirements: 'R',
      dependencies: 'D',
      standards: 'T',
      general: 'G',
    };

    const createdAt = entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A';
    const updatedAt = entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : 'N/A';

    return /*html*/`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 20px 28px;
    line-height: 1.6;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
  }

  .category-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 14px;
    color: #fff;
    flex-shrink: 0;
  }
  .category-badge.architecture { background: #0e7490; }
  .category-badge.requirements { background: #7c3aed; }
  .category-badge.dependencies { background: #2563eb; }
  .category-badge.standards { background: #059669; }
  .category-badge.general { background: #6b7280; }

  .header-text h1 {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.3;
  }

  .header-text .subtitle {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 20px;
    padding: 10px 14px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 6px;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-label {
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    letter-spacing: 0.5px;
  }

  .meta-value {
    font-size: 13px;
  }

  .priority-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
  }

  .content {
    padding: 16px 18px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 6px;
    word-break: break-word;
  }

  .content .code-block {
    margin: 10px 0;
    padding: 12px 14px;
    background: var(--vscode-textCodeBlock-background);
    border-radius: 4px;
    overflow-x: auto;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    line-height: 1.5;
    white-space: pre;
  }

  .content .inline-code {
    font-family: var(--vscode-editor-font-family, monospace);
    background: var(--vscode-textCodeBlock-background);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 12px;
  }

  .id-line {
    margin-top: 16px;
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace);
  }
</style>
</head>
<body>
  <div class="header">
    <div class="category-badge ${entry.category}">${esc(categoryIcons[entry.category] || 'G')}</div>
    <div class="header-text">
      <h1>${esc(entry.key)}</h1>
      <div class="subtitle">${esc(entry.category)} context entry</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item">
      <span class="meta-label">Category</span>
      <span class="meta-value">${esc(entry.category)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Priority</span>
      <span class="meta-value">
        <span class="priority-dot" style="background:${priorityColors[entry.priority] || '#888'}"></span>
        ${entry.priority} - ${priorityLabels[entry.priority] || 'Unknown'}
      </span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Created</span>
      <span class="meta-value">${createdAt}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Updated</span>
      <span class="meta-value">${updatedAt}</span>
    </div>
  </div>

  <div class="content">${body}</div>

  <div class="id-line">ID: ${esc(entry.id)}</div>
</body>
</html>`;
  }
}
