import * as vscode from 'vscode';
import { ChatService } from '@thinkcoffee/core';
import type { ChatMessage } from '@thinkcoffee/core';
import fs from 'fs';
import path from 'path';

/**
 * ChatHistoryView
 * Gerencia a visualização e persistência do histórico de chat
 * Suporta filtros, busca e exportação de histórico
 */
export class ChatHistoryView implements vscode.WebviewViewProvider {
  public static readonly viewType = 'thinkcoffee.chatHistory';

  private _view?: vscode.WebviewView;
  private _chat: ChatService;
  private _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  constructor(extensionUri: vscode.Uri, chat: ChatService) {
    this._extensionUri = extensionUri;
    this._chat = chat;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(
      (msg) => {
        switch (msg.command) {
          case 'loadHistory':
            this._loadAndSendHistory();
            break;
          case 'filter':
            this._filterHistory(msg.type, msg.sender);
            break;
          case 'search':
            this._searchHistory(msg.query);
            break;
          case 'export':
            this._exportHistory(msg.format);
            break;
          case 'delete':
            this._deleteMessage(msg.id);
            break;
          case 'deleteAll':
            this._deleteAllHistory();
            break;
          case 'copyMessage':
            vscode.env.clipboard.writeText(msg.content);
            vscode.window.showInformationMessage('Mensagem copiada para clipboard!');
            break;
        }
      },
      null,
      this._disposables
    );

    // Carregar histórico ao abrir a view
    this._loadAndSendHistory();
  }

  /** Carrega e envia o histórico para a webview */
  private _loadAndSendHistory() {
    if (!this._view) return;

    const history = this._chat.getHistory();
    const summary = this._summarizeHistory(history);

    this._view.webview.postMessage({
      command: 'historyLoaded',
      data: {
        messages: history,
        summary,
      },
    });
  }

  /** Filtra histórico por tipo e/ou remetente */
  private _filterHistory(type?: string, sender?: string) {
    if (!this._view) return;

    let filtered = this._chat.getHistory();

    if (type) {
      filtered = filtered.filter(m => m.type === type);
    }
    if (sender) {
      filtered = filtered.filter(m => m.sender === sender);
    }

    this._view.webview.postMessage({
      command: 'historyFiltered',
      data: { messages: filtered },
    });
  }

  /** Busca por texto no histórico */
  private _searchHistory(query: string) {
    if (!this._view) return;

    const q = query.toLowerCase();
    const filtered = this._chat.getHistory().filter(m =>
      m.content.toLowerCase().includes(q) ||
      (m.senderLabel && m.senderLabel.toLowerCase().includes(q))
    );

    this._view.webview.postMessage({
      command: 'historyFiltered',
      data: { messages: filtered },
    });
  }

  /** Exporta histórico em diferentes formatos */
  private async _exportHistory(format: string) {
    const history = this._chat.getHistory();

    let content: string;
    let filename: string;

    if (format === 'json') {
      content = JSON.stringify(history, null, 2);
      filename = `chat_history_${new Date().toISOString().split('T')[0]}.json`;
    } else if (format === 'markdown') {
      const lines = history.map(m => {
        const time = new Date(m.timestamp).toLocaleString();
        return `### ${m.senderLabel || m.sender} (${m.type})\n*${time}*\n\n${m.content}\n`;
      });
      content = lines.join('\n---\n\n');
      filename = `chat_history_${new Date().toISOString().split('T')[0]}.md`;
    } else {
      // plaintext
      const lines = history.map(m => {
        const time = new Date(m.timestamp).toLocaleString();
        return `[${time}] ${m.senderLabel || m.sender}: ${m.content}`;
      });
      content = lines.join('\n');
      filename = `chat_history_${new Date().toISOString().split('T')[0]}.txt`;
    }

    // Salvar arquivo através de dialog
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(
        path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', filename)
      ),
      filters: {
        'JSON': ['json'],
        'Markdown': ['md'],
        'Text': ['txt'],
      },
    });

    if (uri) {
      fs.writeFileSync(uri.fsPath, content, 'utf-8');
      vscode.window.showInformationMessage(`Histórico exportado para ${uri.fsPath}`);
    }
  }

  /** Deleta uma mensagem específica */
  private _deleteMessage(id: string) {
    const history = this._chat.getHistory();
    const filtered = history.filter(m => m.id !== id);
    this._saveHistory(filtered);
    this._loadAndSendHistory();
  }

  /** Deleta todo o histórico com confirmação */
  private async _deleteAllHistory() {
    const confirm = await vscode.window.showWarningMessage(
      'Tem certeza que quer deletar TODO o histórico?',
      'Deletar',
      'Cancelar'
    );

    if (confirm === 'Deletar') {
      this._chat.clear();
      this._loadAndSendHistory();
      vscode.window.showInformationMessage('Histórico deletado.');
    }
  }

  /** Salva histórico modificado de volta ao arquivo */
  private _saveHistory(messages: ChatMessage[]) {
    const filePath = this._chat.getFilePath();
    const content = messages.map(m => JSON.stringify(m)).join('\n');
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /** Resumo estatístico do histórico */
  private _summarizeHistory(history: ChatMessage[]) {
    const types = new Map<string, number>();
    const senders = new Map<string, number>();
    let totalChars = 0;

    history.forEach(m => {
      types.set(m.type, (types.get(m.type) || 0) + 1);
      senders.set(m.sender, (senders.get(m.sender) || 0) + 1);
      totalChars += m.content.length;
    });

    return {
      totalMessages: history.length,
      totalCharacters: totalChars,
      averageMessageLength: history.length ? Math.round(totalChars / history.length) : 0,
      messagesByType: Object.fromEntries(types),
      messagesBySender: Object.fromEntries(senders),
      dateRange: history.length > 0 ? {
        oldest: history[0]?.timestamp,
        newest: history[history.length - 1]?.timestamp,
      } : null,
    };
  }

  private _getHtml(): string {
    return /*html*/ `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .header {
      padding: 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBar-background);
      flex-shrink: 0;
    }

    .header h2 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .controls {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .search-box {
      flex: 1;
      min-width: 150px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
    }

    .search-box::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    .btn-icon {
      background: transparent;
      border: 1px solid var(--vscode-panel-border);
      color: var(--vscode-foreground);
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      transition: background-color 0.15s;
    }

    .btn-icon:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .filters {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .filter-select {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 3px 6px;
      border-radius: 3px;
      font-size: 11px;
      cursor: pointer;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      padding: 8px;
      background: color-mix(in srgb, var(--vscode-sideBar-background) 80%, var(--vscode-foreground));
      border-radius: 3px;
      font-size: 11px;
      margin-bottom: 8px;
    }

    .stat-item {
      padding: 4px;
      border-radius: 2px;
      background: color-mix(in srgb, var(--vscode-sideBar-background) 60%, var(--vscode-foreground));
    }

    .stat-label {
      color: var(--vscode-descriptionForeground);
      font-size: 10px;
    }

    .stat-value {
      font-weight: 600;
      font-size: 13px;
    }

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .msg-item {
      margin-bottom: 8px;
      padding: 8px;
      border-radius: 4px;
      background: var(--vscode-input-background);
      border-left: 3px solid var(--vscode-panel-border);
      transition: background-color 0.15s;
    }

    .msg-item:hover {
      background: color-mix(in srgb, var(--vscode-input-background) 80%, var(--vscode-foreground));
    }

    .msg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      font-size: 11px;
    }

    .msg-sender {
      font-weight: 600;
      color: var(--vscode-terminal-ansiCyan);
    }

    .msg-meta {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .msg-type {
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 2px;
      background: var(--vscode-panel-border);
      text-transform: uppercase;
    }

    .msg-time {
      color: var(--vscode-descriptionForeground);
      font-size: 10px;
    }

    .msg-actions {
      display: flex;
      gap: 2px;
    }

    .msg-actions button {
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-size: 10px;
      padding: 2px 4px;
    }

    .msg-actions button:hover {
      color: var(--vscode-foreground);
    }

    .msg-content {
      color: var(--vscode-foreground);
      font-size: 12px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      gap: 8px;
    }

    .empty h3 {
      font-size: 13px;
      color: var(--vscode-foreground);
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Histórico de Chat</h2>
    
    <div class="controls">
      <input 
        type="text" 
        id="searchInput" 
        class="search-box" 
        placeholder="Buscar mensagens..."
      >
      <button class="btn-icon" id="exportBtn" title="Exportar histórico">Export</button>
      <button class="btn-icon" id="clearBtn" title="Limpar histórico">Limpar</button>
    </div>

    <div class="filters">
      <select class="filter-select" id="typeFilter" title="Filtrar por tipo">
        <option value="">Todos os tipos</option>
        <option value="request">Request</option>
        <option value="response">Response</option>
        <option value="info">Info</option>
        <option value="error">Error</option>
        <option value="code">Code</option>
      </select>
      
      <select class="filter-select" id="senderFilter" title="Filtrar por remetente">
        <option value="">Todos os remetentes</option>
        <option value="programmer">Programador</option>
        <option value="system">Sistema</option>
        <option value="claude">Claude</option>
        <option value="copilot">Copilot</option>
      </select>
    </div>

    <div id="stats" class="stats"></div>
  </div>

  <div id="messages" class="messages">
    <div class="empty">
      <h3>Carregando histórico...</h3>
    </div>
  </div>

<script>
  const vscode = acquireVsCodeApi();
  const messagesEl = document.getElementById('messages');
  const searchInput = document.getElementById('searchInput');
  const typeFilter = document.getElementById('typeFilter');
  const senderFilter = document.getElementById('senderFilter');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statsEl = document.getElementById('stats');

  let allMessages = [];

  window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.command === 'historyLoaded') {
      allMessages = msg.data.messages;
      renderStats(msg.data.summary);
      renderMessages(allMessages);
    } else if (msg.command === 'historyFiltered') {
      renderMessages(msg.data.messages);
    }
  });

  function renderStats(summary) {
    if (!summary) return;
    
    const html = \`
      <div class="stat-item">
        <div class="stat-label">Total de mensagens</div>
        <div class="stat-value">\${summary.totalMessages}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Caracteres</div>
        <div class="stat-value">\${summary.totalCharacters}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Média por mensagem</div>
        <div class="stat-value">\${summary.averageMessageLength} chars</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Período</div>
        <div class="stat-value">\${summary.dateRange ? new Date(summary.dateRange.oldest).toLocaleDateString() : 'N/A'}</div>
      </div>
    \`;
    statsEl.innerHTML = html;
  }

  function renderMessages(messages) {
    if (!messages.length) {
      messagesEl.innerHTML = '<div class="empty"><h3>Nenhuma mensagem encontrada</h3></div>';
      return;
    }

    messagesEl.innerHTML = messages.map(m => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      const preview = m.content.substring(0, 100).replace(/\\n/g, ' ')
        + (m.content.length > 100 ? '...' : '');
      
      return \`
        <div class="msg-item">
          <div class="msg-header">
            <span class="msg-sender">\${m.senderLabel || m.sender}</span>
            <div class="msg-meta">
              <span class="msg-type">\${m.type}</span>
              <span class="msg-time">\${time}</span>
              <div class="msg-actions">
                <button title="Copiar" onclick="copyMessage('\${m.id}', \`\${m.content.replace(/\`/g, '\\\\`')}\`)">+</button>
                <button title="Deletar" onclick="deleteMessage('\${m.id}')">-</button>
              </div>
            </div>
          </div>
          <div class="msg-content">\${preview}</div>
        </div>
      \`;
    }).join('');
  }

  function copyMessage(id, content) {
    vscode.postMessage({
      command: 'copyMessage',
      id,
      content,
    });
  }

  function deleteMessage(id) {
    vscode.postMessage({
      command: 'delete',
      id,
    });
  }

  searchInput.addEventListener('input', () => {
    const query = searchInput.value;
    if (query.trim()) {
      vscode.postMessage({ command: 'search', query });
    } else {
      renderMessages(allMessages);
    }
  });

  typeFilter.addEventListener('change', () => {
    const type = typeFilter.value;
    const sender = senderFilter.value;
    vscode.postMessage({
      command: 'filter',
      type: type || undefined,
      sender: sender || undefined,
    });
  });

  senderFilter.addEventListener('change', () => {
    const type = typeFilter.value;
    const sender = senderFilter.value;
    vscode.postMessage({
      command: 'filter',
      type: type || undefined,
      sender: sender || undefined,
    });
  });

  exportBtn.addEventListener('click', () => {
    // Mostrar menu com opções de formato
    const formats = [
      { label: 'JSON', value: 'json' },
      { label: 'Markdown', value: 'markdown' },
      { label: 'Texto plano', value: 'text' },
    ];
    
    // Aqui você poderia implementar um menu, mas vamos usar JSON por padrão
    vscode.postMessage({ command: 'export', format: 'json' });
  });

  clearBtn.addEventListener('click', () => {
    vscode.postMessage({ command: 'deleteAll' });
  });

  // Carregar histórico ao montar
  vscode.postMessage({ command: 'loadHistory' });
</script>
</body>
</html>`;
  }

  dispose() {
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) d.dispose();
    }
  }
}
