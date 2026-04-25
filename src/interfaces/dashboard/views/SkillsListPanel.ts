/**
 * Skills List webview panel.
 * Shows all installed skills from ~/.kairos/skills/ with name, description, and status.
 */

import * as vscode from 'vscode';
import {
    getAvailableSkills,
    getSkillsDir,
    installSkill,
} from '../../../core/skills/SkillsManager';

export class SkillsListPanel {
    public static currentPanel: SkillsListPanel | undefined;
    public static readonly viewType = 'Kairos.skillsList';

    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage(
            (msg) => this.handleMessage(msg),
            null,
            this.disposables,
        );
        this.render();
    }

    static createOrShow(): void {
        const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

        if (SkillsListPanel.currentPanel) {
            SkillsListPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            SkillsListPanel.viewType,
            'Kairos Skills',
            column,
            { enableScripts: true },
        );

        SkillsListPanel.currentPanel = new SkillsListPanel(panel);
    }

    dispose(): void {
        SkillsListPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) this.disposables.pop()?.dispose();
    }

    // ── Message handling ──────────────────────────────────────────

    private async handleMessage(msg: Record<string, unknown>): Promise<void> {
        if (msg.type === 'install') {
            // Let user pick a SKILL.md file to install
            const uris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { 'SKILL.md': ['md'] },
                title: 'Select a SKILL.md file to install',
            });
            if (!uris?.length) return;
            try {
                installSkill(uris[0].fsPath);
                this.render();
            } catch (err) {
                void vscode.window.showErrorMessage(
                    `Failed to install skill: ${err instanceof Error ? err.message : err}`
                );
            }
        }

        if (msg.type === 'openDir') {
            const dir = getSkillsDir();
            void vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(dir));
        }

        if (msg.type === 'refresh') {
            this.render();
        }
    }

    // ── Render ─────────────────────────────────────────────────────

    private render(): void {
        const skills = getAvailableSkills();
        const skillsDir = getSkillsDir();

        const skillCards = skills.map(s => `
<div class="card">
  <div class="card-header">
    <strong>${esc(s.name)}</strong>
    <span class="badge installed">installed</span>
  </div>
  <div class="desc">${esc(s.description)}</div>
  <div class="path">${esc(s.dirPath)}</div>
</div>`).join('') || '<div class="empty">No skills installed yet.</div>';

        const nonce = getNonce();
        this.panel.webview.html = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kairos Skills</title>
<style>
  body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);
    color:var(--vscode-editor-foreground);background:var(--vscode-editor-background);
    padding:16px;max-width:640px}
  h2{margin:0 0 4px}
  .dir{opacity:.6;font-size:.85em;margin-bottom:16px}
  .card{border:1px solid var(--vscode-panel-border,#333);border-radius:4px;padding:10px;margin-bottom:10px}
  .card-header{display:flex;align-items:center;gap:8px;margin-bottom:4px}
  .badge{font-size:.75em;padding:2px 7px;border-radius:10px}
  .installed{background:var(--vscode-terminal-ansiGreen);color:#000}
  .desc{opacity:.8;margin-bottom:4px}
  .path{font-size:.75em;opacity:.5;font-family:monospace}
  .empty{opacity:.5;font-style:italic}
  .toolbar{display:flex;gap:8px;margin-bottom:16px}
  button{padding:5px 12px;background:var(--vscode-button-background);
    color:var(--vscode-button-foreground);border:0;border-radius:3px;cursor:pointer;font-size:inherit}
  button:hover{background:var(--vscode-button-hoverBackground)}
  button.secondary{background:var(--vscode-button-secondaryBackground,#3a3d41);
    color:var(--vscode-button-secondaryForeground,#ccc)}
</style>
</head>
<body>
<h2>Kairos Skills</h2>
<div class="dir">Skills directory: ${esc(skillsDir)}</div>

<div class="toolbar">
  <button onclick="send('install')">Install Skill…</button>
  <button class="secondary" onclick="send('openDir')">Open Directory</button>
  <button class="secondary" onclick="send('refresh')">Refresh</button>
</div>

<div id="list">${skillCards}</div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  function send(type) { vscode.postMessage({ type }); }
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
