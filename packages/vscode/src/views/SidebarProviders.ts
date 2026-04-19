import * as vscode from 'vscode';

abstract class BaseSidebarProvider implements vscode.WebviewViewProvider {
    resolveWebviewView(view: vscode.WebviewView): void {
        view.webview.options = {
            enableScripts: true,
        };

        view.webview.onDidReceiveMessage(
            async message => {
                if (!message?.command) {
                    return;
                }
                await vscode.commands.executeCommand(message.command);
            },
            undefined,
        );

        view.webview.html = this.renderHtml();
    }

    protected abstract renderHtml(): string;
}

export class AgentsSidebarProvider extends BaseSidebarProvider {
    static readonly viewType = 'thinkcoffee.chat';

    protected renderHtml(): string {
        const nonce = getNonce();
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ThinkCoffee Agents</title>
<style>
body{font-family:var(--vscode-font-family);padding:12px;color:var(--vscode-editor-foreground)}
.grid{display:grid;grid-template-columns:1fr;gap:8px}
button{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:0;padding:8px;border-radius:4px;text-align:left;cursor:pointer}
button:hover{background:var(--vscode-button-hoverBackground)}
h3{margin:14px 0 8px}
p{opacity:.9}
</style>
</head>
<body>
<h2>ThinkCoffee Agents</h2>
<p>PM orchestration commands for current workspace.</p>

<h3>Execution</h3>
<div class="grid">
<button data-cmd="thinkcoffee.runPhase">Run Current Phase</button>
<button data-cmd="thinkcoffee.stopAgents">Stop All Agents</button>
<button data-cmd="thinkcoffee.invokeAgent">Invoke Agent</button>
</div>

<h3>Workflow</h3>
<div class="grid">
<button data-cmd="thinkcoffee.workflow.createComplex">Create Complex Workflow</button>
<button data-cmd="thinkcoffee.workflow.executeAutonomous">Execute Autonomous Workflow</button>
</div>

<h3>Orchestrator</h3>
<div class="grid">
<button data-cmd="thinkcoffee.orchestrator.showRunStatus">Run Status</button>
<button data-cmd="thinkcoffee.orchestrator.showCheckpoints">Checkpoints</button>
<button data-cmd="thinkcoffee.orchestrator.pauseRun">Pause Run</button>
<button data-cmd="thinkcoffee.orchestrator.resumeRun">Resume Run</button>
</div>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
for (const b of document.querySelectorAll('button[data-cmd]')) {
  b.addEventListener('click', () => vscode.postMessage({ command: b.getAttribute('data-cmd') }));
}
</script>
</body>
</html>`;
    }
}

export class AdvancedAgentsSidebarProvider extends BaseSidebarProvider {
    static readonly viewType = 'thinkcoffee.advancedAgents';

    protected renderHtml(): string {
        const nonce = getNonce();
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ThinkCoffee Advanced Agents</title>
<style>
body{font-family:var(--vscode-font-family);padding:12px;color:var(--vscode-editor-foreground)}
.grid{display:grid;grid-template-columns:1fr;gap:8px}
button{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:0;padding:8px;border-radius:4px;text-align:left;cursor:pointer}
button:hover{background:var(--vscode-button-hoverBackground)}
h3{margin:14px 0 8px}
</style>
</head>
<body>
<h2>ThinkCoffee Advanced Agents</h2>
<h3>Reasoning</h3>
<div class="grid">
<button data-cmd="thinkcoffee.reasoning.adaptiveThink">Adaptive Reasoning</button>
<button data-cmd="thinkcoffee.reasoning.multiStepSolve">Multi-step Solve</button>
</div>
<h3>Software</h3>
<div class="grid">
<button data-cmd="thinkcoffee.advancedSoftware.generateCode">Generate Code</button>
<button data-cmd="thinkcoffee.advancedSoftware.debugCode">Debug Code</button>
<button data-cmd="thinkcoffee.advancedSoftware.refactorCode">Refactor Code</button>
</div>
<h3>Security</h3>
<div class="grid">
<button data-cmd="thinkcoffee.advancedSecurity.scanVulnerabilities">Security Scan</button>
<button data-cmd="thinkcoffee.advancedSecurity.simulateAttack">Controlled Simulation</button>
<button data-cmd="thinkcoffee.advancedSecurity.zeroDayDiscovery">Zero-day Hypotheses</button>
</div>
<h3>Multimodal</h3>
<div class="grid">
<button data-cmd="thinkcoffee.advancedMultimodal.analyzeImage">Analyze Image</button>
<button data-cmd="thinkcoffee.advancedMultimodal.analyzeDiagram">Analyze Diagram</button>
<button data-cmd="thinkcoffee.advancedMultimodal.synthesizeKnowledge">Synthesize Knowledge</button>
</div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
for (const b of document.querySelectorAll('button[data-cmd]')) {
  b.addEventListener('click', () => vscode.postMessage({ command: b.getAttribute('data-cmd') }));
}
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
