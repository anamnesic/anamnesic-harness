import * as vscode from 'vscode';

export class ChatSidebarProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'thinkcoffee.chat';

  resolveWebviewView(view: vscode.WebviewView): void {
    view.webview.options = {
      enableScripts: true,
    };

    view.webview.onDidReceiveMessage(async message => {
      if (message?.type !== 'ask') {
        return;
      }
      await vscode.commands.executeCommand('thinkcoffee.chat.ask', message);
    });

    const nonce = getNonce();

    view.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ThinkCoffee Chat</title>
<style>
body {
  font-family: var(--vscode-font-family);
  padding: 12px;
  color: var(--vscode-editor-foreground);
  margin: 0;
}
.container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-editor-foreground);
}
.composer {
  border: 1px solid var(--vscode-focusBorder);
  border-radius: 12px;
  background: var(--vscode-editor-background);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.prompt {
  width: 100%;
  min-height: 56px;
  max-height: 180px;
  resize: vertical;
  box-sizing: border-box;
  background: transparent;
  color: var(--vscode-input-foreground);
  border: 0;
  outline: none;
  font-size: 13px;
  line-height: 1.4;
  font-family: var(--vscode-font-family);
}
.toolbar {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 6px;
  align-items: center;
}
.tool-btn {
  border: 1px solid var(--vscode-input-border);
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-radius: 7px;
  padding: 5px 8px;
  cursor: pointer;
  font-size: 13px;
}
.tool-btn:hover {
  background: var(--vscode-list-hoverBackground);
}
.tool-btn.active {
  border-color: var(--vscode-focusBorder);
}
.mode {
  font-size: 12px;
  opacity: 0.85;
  padding-left: 2px;
}
.send-btn {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 0;
  border-radius: 999px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
.send-btn:hover {
  background: var(--vscode-button-hoverBackground);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  font-size: 11px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 999px;
  padding: 3px 8px;
  background: var(--vscode-input-background);
}
.hint {
  font-size: 11px;
  opacity: 0.75;
  line-height: 1.4;
}
</style>
</head>
<body>
<div class="container">
<h2>ThinkCoffee</h2>
<div class="composer">
  <textarea id="chatPrompt" class="prompt" placeholder="Describe what to build"></textarea>
  <div id="chips" class="chips"></div>
  <div class="toolbar">
    <button id="attachEditorBtn" class="tool-btn" type="button">+ File</button>
    <button id="clearImagesBtn" class="tool-btn" type="button">Image</button>
    <div class="mode">Auto</div>
    <button id="sendBtn" class="send-btn" type="button" title="Send">↑</button>
  </div>
</div>
<div class="hint">
  PM executes commands automatically. Paste image in the composer or toggle + File to include the active editor file.
</div>
</div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const input = document.getElementById('chatPrompt');
const send = document.getElementById('sendBtn');
const attachEditorBtn = document.getElementById('attachEditorBtn');
const clearImagesBtn = document.getElementById('clearImagesBtn');
const chips = document.getElementById('chips');

let includeActiveEditor = false;
let images = [];

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderChips() {
  const parts = [];
  if (includeActiveEditor) {
    parts.push('<span class="chip">Active editor file</span>');
  }
  for (const img of images) {
    parts.push('<span class="chip">Image: ' + escapeHtml(img.name || 'clipboard') + '</span>');
  }
  chips.innerHTML = parts.join('');
  attachEditorBtn.classList.toggle('active', includeActiveEditor);
}

function setImages(next) {
  images = next.slice(0, 5);
  renderChips();
}

function submitPrompt() {
  const prompt = (input.value || '').trim();
  if (!prompt && !includeActiveEditor && images.length === 0) {
    return;
  }

  vscode.postMessage({
    type: 'ask',
    prompt,
    includeActiveEditor,
    images,
  });

  input.value = '';
  setImages([]);
  input.focus();
}

send.addEventListener('click', submitPrompt);
attachEditorBtn.addEventListener('click', () => {
  includeActiveEditor = !includeActiveEditor;
  renderChips();
});
clearImagesBtn.addEventListener('click', () => {
  setImages([]);
});

input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    submitPrompt();
  }
});

input.addEventListener('paste', event => {
  const clipboard = event.clipboardData;
  if (!clipboard || !clipboard.items) {
    return;
  }

  let foundImage = false;
  for (const item of clipboard.items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) {
      continue;
    }

    const file = item.getAsFile();
    if (!file) {
      continue;
    }

    foundImage = true;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        return;
      }
      setImages(images.concat([{
        name: file.name || 'pasted-image',
        mimeType: file.type || 'image/png',
        dataUrl,
      }]));
    };
    reader.readAsDataURL(file);
  }

  if (foundImage) {
    event.preventDefault();
  }
});

renderChips();
</script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
