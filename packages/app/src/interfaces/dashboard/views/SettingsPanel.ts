/**
 * Settings + Model Selector webview panel.
 * Renders provider config (API keys, base URL, model dropdown) and a testConnection button.
 * Uses VS Code theming variables so it matches the editor theme.
 */

import * as vscode from 'vscode';
import { AVAILABLE_MODELS } from '../../../config/models';
import { testMultiProviderConnection } from '../../../core/providers/multi-provider';
import type { MultiProviderSettings } from '../../../core/providers/multi-provider';

const CONFIG_KEY = 'kairos.providerSettings';

export class SettingsPanel {
    public static currentPanel: SettingsPanel | undefined;
    public static readonly viewType = 'Kairos.settings';

    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly context: vscode.ExtensionContext,
    ) {
        this.panel = panel;
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage(
            (msg) => this.handleMessage(msg),
            null,
            this.disposables,
        );
        this.render();
    }

    static createOrShow(context: vscode.ExtensionContext): void {
        const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

        if (SettingsPanel.currentPanel) {
            SettingsPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            SettingsPanel.viewType,
            'Kairos Settings',
            column,
            { enableScripts: true },
        );

        SettingsPanel.currentPanel = new SettingsPanel(panel, context);
    }

    dispose(): void {
        SettingsPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            this.disposables.pop()?.dispose();
        }
    }

    // ── Message handling ──────────────────────────────────────────

    private async handleMessage(msg: Record<string, unknown>): Promise<void> {
        if (msg.type === 'save') {
            const settings = msg.settings as MultiProviderSettings;
            await this.context.globalState.update(CONFIG_KEY, settings);
            this.panel.webview.postMessage({ type: 'saved' });
        }

        if (msg.type === 'test') {
            const settings = msg.settings as MultiProviderSettings;
            try {
                const ok = await testMultiProviderConnection(settings);
                this.panel.webview.postMessage({
                    type: 'testResult',
                    success: ok,
                    message: ok ? 'Connection successful!' : 'Connection failed.',
                });
            } catch (err) {
                this.panel.webview.postMessage({
                    type: 'testResult',
                    success: false,
                    message: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────

    static getSettings(context: vscode.ExtensionContext): MultiProviderSettings {
        return (context.globalState.get<MultiProviderSettings>(CONFIG_KEY)) ?? {
            apiKey: '',
            model: 'kairos-3-5-orange-20241022',
            baseUrl: 'https://api.anthropic.com',
            maxTokens: 8192,
        };
    }

    // ── Render ─────────────────────────────────────────────────────

    private render(): void {
        const savedSettings = SettingsPanel.getSettings(this.context);

        // Build grouped model options
        const groups: Record<string, string[]> = { auto: [], recommended: [], other: [] };
        for (const m of AVAILABLE_MODELS) {
            (groups[m.group] ??= []).push(m.id);
        }

        const optionsHtml = Object.entries(groups)
            .filter(([, ids]) => ids.length)
            .map(([group, ids]) => {
                const opts = ids.map(id => {
                    const sel = id === savedSettings.model ? ' selected' : '';
                    return `<option value="${id}"${sel}>${id}</option>`;
                }).join('');
                return `<optgroup label="${group}">${opts}</optgroup>`;
            }).join('');

        const nonce = getNonce();

        this.panel.webview.html = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kairos Settings</title>
<style>
  body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);
    color:var(--vscode-editor-foreground);background:var(--vscode-editor-background);
    padding:16px;max-width:640px}
  label{display:block;margin-top:12px;font-weight:600}
  input,select{width:100%;padding:5px 7px;margin-top:4px;box-sizing:border-box;
    background:var(--vscode-input-background);color:var(--vscode-input-foreground);
    border:1px solid var(--vscode-input-border,#555);border-radius:3px;font-size:inherit}
  .row{display:flex;gap:8px}
  .row input{flex:1}
  button{margin-top:14px;padding:6px 14px;
    background:var(--vscode-button-background);color:var(--vscode-button-foreground);
    border:0;border-radius:3px;cursor:pointer;font-size:inherit}
  button:hover{background:var(--vscode-button-hoverBackground)}
  #status{margin-top:10px;font-style:italic;opacity:.75}
  h2{margin:0 0 16px}
  details{margin-top:16px}
  summary{cursor:pointer;font-weight:600}
</style>
</head>
<body>
<h2>Kairos Settings</h2>

<label>Model
  <select id="model">${optionsHtml}</select>
</label>

<label>API Key
  <input id="apiKey" type="password" value="${esc(savedSettings.apiKey)}" placeholder="sk-...">
</label>

<label>Base URL
  <input id="baseUrl" value="${esc(savedSettings.baseUrl)}" placeholder="https://api.anthropic.com">
</label>

<div class="row">
  <div style="flex:1">
    <label>Max Tokens
      <input id="maxTokens" type="number" value="${savedSettings.maxTokens}" min="256" max="200000">
    </label>
  </div>
  <div style="flex:1">
    <label>Temperature
      <input id="temperature" type="number" value="${savedSettings.temperature ?? 0.7}" min="0" max="2" step="0.1">
    </label>
  </div>
</div>

<details>
  <summary>Advanced (OpenAI)</summary>
  <label>Organization
    <input id="openaiOrganization" value="${esc(savedSettings.openaiOrganization ?? '')}" placeholder="org-...">
  </label>
  <label>Project
    <input id="openaiProject" value="${esc(savedSettings.openaiProject ?? '')}" placeholder="proj_...">
  </label>
</details>

<div style="display:flex;gap:8px;margin-top:4px">
  <button id="btnSave">Save</button>
  <button id="btnTest">Test Connection</button>
</div>
<div id="status"></div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = id => document.getElementById(id);

  function getSettings() {
    return {
      model:     $('model').value,
      apiKey:    $('apiKey').value,
      baseUrl:   $('baseUrl').value,
      maxTokens: parseInt($('maxTokens').value, 10) || 8192,
      temperature: parseFloat($('temperature').value) || 0.7,
      openaiOrganization: $('openaiOrganization').value || undefined,
      openaiProject:      $('openaiProject').value || undefined,
    };
  }

  $('btnSave').addEventListener('click', () => {
    vscode.postMessage({ type: 'save', settings: getSettings() });
  });

  $('btnTest').addEventListener('click', () => {
    $('status').textContent = 'Testing...';
    vscode.postMessage({ type: 'test', settings: getSettings() });
  });

  window.addEventListener('message', e => {
    const msg = e.data;
    if (msg.type === 'saved') $('status').textContent = 'Settings saved.';
    if (msg.type === 'testResult') {
      $('status').textContent = msg.message;
      $('status').style.color = msg.success
        ? 'var(--vscode-terminal-ansiGreen)'
        : 'var(--vscode-terminal-ansiRed)';
    }
  });
</script>
</body>
</html>`;
    }
}

// ─── Helpers ───────────────────────────────────────────────────

function getNonce(): string {
    let text = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) text += chars[Math.floor(Math.random() * chars.length)];
    return text;
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
