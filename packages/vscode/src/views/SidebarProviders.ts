import * as vscode from 'vscode';

export class ChatSidebarProvider implements vscode.WebviewViewProvider {
    static readonly viewType = 'thinkcoffee.chat';

    resolveWebviewView(view: vscode.WebviewView): void {
        view.webview.options = {
            enableScripts: false,
        };

        view.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ThinkCoffee Chat</title>
<style>
body {
  font-family: var(--vscode-font-family);
  padding: 20px;
  color: var(--vscode-editor-foreground);
  margin: 0;
  text-align: center;
}
h2 {
  margin-top: 0;
  color: var(--vscode-editor-foreground);
}
p {
  opacity: 0.8;
  font-size: 13px;
  line-height: 1.6;
}
.hint {
  margin-top: 20px;
  padding: 12px;
  background: var(--vscode-input-background);
  border-left: 3px solid var(--vscode-button-background);
  text-align: left;
  border-radius: 4px;
  font-size: 12px;
}
</style>
</head>
<body>
<h2>ThinkCoffee</h2>
<p>AI-powered context management and multi-agent orchestration.</p>
<div class="hint">
  <strong>All commands are executed by the PM (Project Manager) automatically.</strong><br>
  The PM analyzes your project and delegates tasks to specialized agents as needed.
</div>
</body>
</html>`;
    }
}
