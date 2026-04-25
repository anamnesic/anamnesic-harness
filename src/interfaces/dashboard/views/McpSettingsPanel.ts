/**
 * MCP Settings webview panel.
 * Add/remove MCP servers, connect/disconnect, view status and tools.
 */

import * as vscode from 'vscode';
import { mcpManager } from '../../../core/mcp-client/McpClientManager';
import type { McpServerConfig } from '../../../core/mcp-client/types';
import crypto from 'crypto';

export class McpSettingsPanel {
    public static currentPanel: McpSettingsPanel | undefined;
    public static readonly viewType = 'Kairos.mcpSettings';

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

        if (McpSettingsPanel.currentPanel) {
            McpSettingsPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            McpSettingsPanel.viewType,
            'Kairos MCP Servers',
            column,
            { enableScripts: true },
        );

        McpSettingsPanel.currentPanel = new McpSettingsPanel(panel);
    }

    dispose(): void {
        McpSettingsPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) this.disposables.pop()?.dispose();
    }

    // ── Message handling ──────────────────────────────────────────

    private async handleMessage(msg: Record<string, unknown>): Promise<void> {
        switch (msg.type) {
            case 'add': {
                const config: McpServerConfig = {
                    id: crypto.randomUUID(),
                    name: String(msg.name ?? 'MCP Server'),
                    serverUrl: String(msg.serverUrl),
                    oauthClientId: msg.oauthClientId ? String(msg.oauthClientId) : undefined,
                    oauthClientSecret: msg.oauthClientSecret ? String(msg.oauthClientSecret) : undefined,
                    enabled: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                mcpManager.saveConfig(config);
                this.refresh();
                break;
            }

            case 'delete': {
                const id = String(msg.id);
                await mcpManager.disconnect(id);
                mcpManager.deleteConfig(id);
                this.refresh();
                break;
            }

            case 'connect': {
                const id = String(msg.id);
                const cfg = mcpManager.getConfig(id);
                if (!cfg) break;
                try {
                    await mcpManager.connect(cfg);
                } catch (err) {
                    void vscode.window.showErrorMessage(
                        `MCP connect failed: ${err instanceof Error ? err.message : err}`
                    );
                }
                this.refresh();
                break;
            }

            case 'disconnect': {
                await mcpManager.disconnect(String(msg.id));
                this.refresh();
                break;
            }

            case 'refresh':
                this.refresh();
                break;
        }
    }

    private refresh(): void {
        this.render();
    }

    // ── Render ────────────────────────────────────────────────────

    private render(): void {
        const configs = mcpManager.listConfigs();
        const statuses = mcpManager.getAllStatuses();
        const statusMap = new Map(statuses.map(s => [s.id, s]));

        const serverRows = configs.map(cfg => {
            const st = statusMap.get(cfg.id);
            const statusText = st?.status ?? 'disconnected';
            const statusColor = statusText === 'connected'
                ? 'var(--vscode-terminal-ansiGreen)'
                : statusText === 'error'
                    ? 'var(--vscode-terminal-ansiRed)'
                    : 'var(--vscode-disabledForeground)';
            const tools = st?.tools ?? [];
            const toolList = tools.length
                ? `<div class="tools">${tools.map(t => `<span class="tag">${esc(t.name)}</span>`).join('')}</div>`
                : '';
            const btnConnect = statusText !== 'connected'
                ? `<button onclick="send('connect','${cfg.id}')">Connect</button>`
                : `<button onclick="send('disconnect','${cfg.id}')">Disconnect</button>`;

            return `<div class="server">
  <div class="row-space">
    <strong>${esc(cfg.name)}</strong>
    <span style="color:${statusColor}">${statusText}</span>
  </div>
  <div class="url">${esc(cfg.serverUrl)}</div>
  ${toolList}
  <div class="actions">
    ${btnConnect}
    <button class="danger" onclick="send('delete','${cfg.id}')">Remove</button>
  </div>
</div>`;
        }).join('');

        const nonce = getNonce();
        this.panel.webview.html = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MCP Servers</title>
<style>
  body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);
    color:var(--vscode-editor-foreground);background:var(--vscode-editor-background);padding:16px}
  h2{margin:0 0 16px}
  input{width:100%;padding:5px 7px;margin-top:4px;box-sizing:border-box;
    background:var(--vscode-input-background);color:var(--vscode-input-foreground);
    border:1px solid var(--vscode-input-border,#555);border-radius:3px;font-size:inherit}
  label{display:block;margin-top:10px;font-weight:600}
  button{padding:5px 12px;background:var(--vscode-button-background);
    color:var(--vscode-button-foreground);border:0;border-radius:3px;cursor:pointer;font-size:inherit;margin-right:4px}
  button:hover{background:var(--vscode-button-hoverBackground)}
  button.danger{background:var(--vscode-inputValidation-errorBackground,#5a1d1d)}
  .server{border:1px solid var(--vscode-panel-border,#333);border-radius:4px;padding:10px;margin-bottom:10px}
  .row-space{display:flex;justify-content:space-between;align-items:center}
  .url{font-size:0.85em;opacity:.7;margin:3px 0}
  .tools{margin:6px 0;display:flex;flex-wrap:wrap;gap:4px}
  .tag{background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);
    padding:2px 6px;border-radius:10px;font-size:0.8em}
  .actions{margin-top:8px}
  details{margin-top:8px}
  summary{cursor:pointer}
  #addForm{border:1px solid var(--vscode-panel-border,#333);border-radius:4px;padding:12px;margin-bottom:16px}
</style>
</head>
<body>
<h2>MCP Servers</h2>

<div id="addForm">
  <strong>Add Server</strong>
  <label>Name    <input id="name" placeholder="My MCP Server"></label>
  <label>URL     <input id="url" placeholder="https://example.com/mcp"></label>
  <details>
    <summary>OAuth (optional)</summary>
    <label>Client ID     <input id="oauthId" placeholder="client_id"></label>
    <label>Client Secret <input id="oauthSecret" type="password" placeholder="client_secret"></label>
  </details>
  <button style="margin-top:10px" onclick="addServer()">Add</button>
</div>

<div id="servers">${serverRows || '<p style="opacity:.6">No servers configured.</p>'}</div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  function send(type, id) {
    vscode.postMessage({ type, id });
  }
  function addServer() {
    const name        = document.getElementById('name').value.trim();
    const serverUrl   = document.getElementById('url').value.trim();
    const oauthId     = document.getElementById('oauthId').value.trim();
    const oauthSecret = document.getElementById('oauthSecret').value.trim();
    if (!serverUrl) return alert('URL is required');
    vscode.postMessage({ type: 'add', name: name || serverUrl, serverUrl, oauthClientId: oauthId || undefined, oauthClientSecret: oauthSecret || undefined });
  }
  window.addEventListener('message', () => vscode.postMessage({ type: 'refresh' }));
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
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
