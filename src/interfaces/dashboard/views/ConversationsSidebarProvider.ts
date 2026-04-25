/**
 * Conversations + Tasks sidebar provider.
 * Replaces the existing single-chat sidebar with a full list of conversations
 * and tasks (with per-step progress).
 *
 * Conversations are backed by src/memory/conversations/ConversationStore.ts
 * Tasks are backed by src/core/tasks/types.ts (stored in data/tasks.json)
 */

import * as vscode from 'vscode';
import {
    listConversations,
    createConversation,
    deleteConversation,
    type Conversation,
} from '../../../memory/conversations/ConversationStore';
import type { AgentTask } from '../../../core/tasks/types';
import path from 'path';
import fs from 'fs';

// ─── Task persistence helpers ───────────────────────────────────
// (Tasks are stored in data/tasks.json by TaskStore — a simple JSON store)

const TASKS_FILE = path.join(process.cwd(), 'data', 'tasks.json');

function loadTasks(): AgentTask[] {
    if (!fs.existsSync(TASKS_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8')) as AgentTask[]; }
    catch { return []; }
}

function saveTasks(tasks: AgentTask[]): void {
    const dir = path.dirname(TASKS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
}

export function createTask(title: string, description: string, projectPath?: string): AgentTask {
    const task: AgentTask = {
        id: crypto.randomUUID(),
        title,
        description,
        status: 'planning',
        plan: null,
        projectPath: projectPath ?? null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    const tasks = loadTasks();
    tasks.unshift(task);
    saveTasks(tasks);
    return task;
}

export function deleteTask(id: string): void {
    saveTasks(loadTasks().filter(t => t.id !== id));
}

// ─── Provider ──────────────────────────────────────────────────

export class ConversationsSidebarProvider implements vscode.WebviewViewProvider {
    static readonly viewType = 'Kairos.conversations';
    private view?: vscode.WebviewView;

    resolveWebviewView(view: vscode.WebviewView): void {
        this.view = view;
        view.webview.options = { enableScripts: true };
        view.webview.onDidReceiveMessage((msg) => this.handleMessage(msg));
        this.render();
    }

    /** Call after creating/deleting a conversation or task to refresh the panel */
    refresh(): void {
        this.render();
    }

    private async handleMessage(msg: Record<string, unknown>): Promise<void> {
        switch (msg.type) {
            case 'newConversation': {
                const conv = await createConversation('New conversation');
                this.render();
                this.postMessage({ type: 'openConversation', id: conv.id });
                break;
            }
            case 'selectConversation':
                this.postMessage({ type: 'openConversation', id: msg.id });
                break;
            case 'deleteConversation':
                await deleteConversation(String(msg.id));
                this.render();
                break;
            case 'newTask': {
                const title = String(msg.title ?? 'New task');
                const task = createTask(title, '');
                this.render();
                this.postMessage({ type: 'openTask', id: task.id });
                break;
            }
            case 'deleteTask':
                deleteTask(String(msg.id));
                this.render();
                break;
            case 'refresh':
                this.render();
                break;
        }
    }

    private postMessage(msg: unknown): void {
        void this.view?.webview.postMessage(msg);
    }

    private render(): void {
        if (!this.view) return;

        const conversations = listConversations();
        const tasks = loadTasks();

        const convItems = conversations.map(c => `
  <div class="item" onclick="select('conv','${c.id}')">
    <span class="label">${esc(c.title)}</span>
    <button class="icon-btn" title="Delete" onclick="event.stopPropagation();del('conv','${c.id}')">✕</button>
  </div>`).join('') || '<div class="empty">No conversations yet.</div>';

        const taskItems = tasks.map(t => {
            const steps = t.plan ?? [];
            const done = steps.filter(s => s.status === 'completed').length;
            const total = steps.length;
            const bar = total > 0
                ? `<div class="progress"><div style="width:${Math.round(done / total * 100)}%"></div></div>`
                : '';
            const statusColor = t.status === 'completed'
                ? 'var(--vscode-terminal-ansiGreen)'
                : t.status === 'failed'
                    ? 'var(--vscode-terminal-ansiRed)'
                    : 'var(--vscode-disabledForeground)';
            return `
  <div class="item" onclick="select('task','${t.id}')">
    <span class="label">${esc(t.title)}</span>
    <span style="font-size:.75em;color:${statusColor}">${t.status}</span>
    ${bar}
    <button class="icon-btn" title="Delete" onclick="event.stopPropagation();del('task','${t.id}')">✕</button>
  </div>`;
        }).join('') || '<div class="empty">No tasks yet.</div>';

        const nonce = getNonce();
        this.view.webview.html = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box}
  body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);
    color:var(--vscode-editor-foreground);background:transparent;margin:0;padding:8px}
  section{margin-bottom:12px}
  .section-header{display:flex;justify-content:space-between;align-items:center;
    padding:4px 0;border-bottom:1px solid var(--vscode-panel-border,#333);margin-bottom:4px}
  .section-title{font-weight:700;font-size:.9em;text-transform:uppercase;opacity:.7}
  .item{display:flex;align-items:center;gap:4px;padding:4px 6px;border-radius:3px;
    cursor:pointer;user-select:none}
  .item:hover{background:var(--vscode-list-hoverBackground)}
  .label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .icon-btn{background:none;border:0;cursor:pointer;opacity:0;font-size:.8em;
    color:var(--vscode-editor-foreground);padding:0 2px}
  .item:hover .icon-btn{opacity:.6}
  .icon-btn:hover{opacity:1!important}
  .empty{opacity:.5;font-style:italic;padding:4px 6px;font-size:.85em}
  .new-btn{background:none;border:0;cursor:pointer;
    color:var(--vscode-textLink-foreground);font-size:.85em;padding:0}
  .progress{height:3px;background:var(--vscode-panel-border,#333);border-radius:2px;
    margin-top:3px;width:100%}
  .progress div{height:100%;background:var(--vscode-progressBar-background,#0e70c0);border-radius:2px}
</style>
</head>
<body>
<section>
  <div class="section-header">
    <span class="section-title">Chat</span>
    <button class="new-btn" onclick="newItem('conv')">+ New</button>
  </div>
  ${convItems}
</section>

<section>
  <div class="section-header">
    <span class="section-title">Tasks</span>
    <button class="new-btn" onclick="newItem('task')">+ New</button>
  </div>
  ${taskItems}
</section>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  function select(kind, id) {
    vscode.postMessage(kind === 'conv'
      ? { type: 'selectConversation', id }
      : { type: 'openTask', id });
  }
  function del(kind, id) {
    vscode.postMessage(kind === 'conv'
      ? { type: 'deleteConversation', id }
      : { type: 'deleteTask', id });
  }
  function newItem(kind) {
    if (kind === 'conv') {
      vscode.postMessage({ type: 'newConversation' });
    } else {
      const title = prompt('Task title:');
      if (title) vscode.postMessage({ type: 'newTask', title });
    }
  }
</script>
</body>
</html>`;
    }
}

function getNonce(): string {
    let t = '';
    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) t += c[Math.floor(Math.random() * c.length)];
    return t;
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}
