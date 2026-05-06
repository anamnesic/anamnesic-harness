import * as vscode from 'vscode';
import { activateLlmServer, deactivateLlmServer } from '../llm-server/llmServer';
import { AutonomousRuntime } from './agents/AutonomousRuntime';
import type { WorkflowDefinition } from './agents/AutonomousRuntime';
import { OrchestratorClient, OrchestratorHttpError } from './utils/orchestratorClient';
import {
  appendChatMessage,
  createPipeline,
  getActivePipeline,
  approveCurrentPhase,
  rejectCurrentPhase,
  formatPipelineStatus,
} from './utils/pmServices';
import { AdvancedAgentsPanel, ChatSidebarProvider, SettingsPanel, McpSettingsPanel, ConversationsSidebarProvider, SkillsListPanel } from './views';

let runtime: AutonomousRuntime | undefined;
let pipelineRunning = false;
let pipelineCurrentAgent = '';
const RUN_ID_KEY = 'Kairos.currentOrchestratorRunId';
const PLAN_ID_KEY = 'Kairos.currentOrchestratorPlanId';
const WORKSPACE_ID_KEY = 'Kairos.currentOrchestratorWorkspaceId';
const HISTORY_MEMORY_KEY = 'Kairos.advancedMemory.runSummaries';
const HISTORY_BACKUP_KEY = 'Kairos.advancedMemory.backup';
type PmDelegateMode = 'create-workflow' | 'resume-run' | 'pause-run' | 'show-run' | 'toggle-dry-run' | 'safety-scan' | 'stop-runs';
interface PmDelegatedCommand {
  command: string;
  goal: string;
  ask?: string;
  delegate?: PmDelegateMode;
}

interface ChatImageAttachment {
  name: string;
  mimeType: string;
  dataUrl: string;
}

interface ChatAskPayload {
  type?: string;
  prompt?: string;
  includeActiveEditor?: boolean;
  images?: ChatImageAttachment[];
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[extension] Activating Kairos extension');
  runtime = new AutonomousRuntime(context);
  const out = runtime.getOutput();
  out.appendLine('[Kairos] Extension activated');
  console.log('[extension] Runtime created:', !!runtime);
  // Chat provider removido - barra de chat desabilitada
  const chatProvider = {
    postStatus: (text?: string) => {},
    postAssistant: (text?: string) => {},
    postError: (text?: string) => {},
    postNewChat: (title?: string, chatId?: string) => {},
    postLoadHistory: (historyJson?: string) => {},
    postThinking: (text?: string) => {},
    postStep: (text?: string) => {},
    postDone: () => {},
    postCapabilityResult: (text?: string, meta?: Record<string, unknown>) => {}
  };

  const conversationsProvider = new ConversationsSidebarProvider();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ConversationsSidebarProvider.viewType, conversationsProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // Load and display pipeline/run history
  setTimeout(() => {
    console.log('[extension] Loading history');
    const history = runtime?.getMemory() || [];
    if (history.length > 0) {
      const summary = history
        .slice(0, 5)
        .map(item => `${item.at}: ${item.summary}`)
        .join('\n');
      chatProvider.postStatus(`PM history (last 5): \n${summary}`);
      out.appendLine(`[pm:memory] Loaded ${history.length} run summaries`);
    } else {
      chatProvider.postStatus('PM ready. No previous runs in memory.');
    }
  }, 500);

  const register = (command: string, handler: (...args: unknown[]) => unknown) => {
    console.log(`[extension] Registering command: ${command}`);
    context.subscriptions.push(vscode.commands.registerCommand(command, handler));
  };

  register('Kairos.chat.ask', async (promptArg?: unknown) => {
    console.log('[Kairos.chat.ask] Command received');

    if (!runtime) {
      out.appendLine('[Kairos.chat.ask] Runtime not available');
      chatProvider.postError('PM runtime not available');
      return;
    }

    const payload = normalizeChatPayload(promptArg);
    out.appendLine(`[Kairos.chat.ask] prompt="${payload.prompt.slice(0, 60)}…" editor=${payload.includeActiveEditor} images=${payload.images.length}`);

    if (!payload.prompt && !payload.includeActiveEditor && payload.images.length === 0) {
      return;
    }

    // Guard: if a pipeline/agent is already executing, inform the user
    if (pipelineRunning) {
      chatProvider.postAssistant(
        `⏳ **Agents are working right now** (current: ${pipelineCurrentAgent || 'preparing'})\n\n` +
        `Wait for the current execution to finish. You'll see results here as each agent completes.`,
      );
      return;
    }

    chatProvider.postStatus('PM is analyzing request…');

    const editorContext = payload.includeActiveEditor ? buildActiveEditorContext() : undefined;
    const imageContext = payload.images.length > 0
      ? payload.images.map((img, i) => `Image ${i + 1}: ${img.name} (${img.mimeType})\n${img.dataUrl.slice(0, 8000)}`).join('\n\n')
      : undefined;

    // Build the full user prompt including any attachments
    const fullPrompt = [
      payload.prompt || '',
      editorContext ? `\n[Active editor]\n${editorContext}` : '',
      imageContext ? `\n[Attached images]\n${imageContext}` : '',
    ].join('').trim();

    // Derive the project ID from the workspace folder name (same logic as getWorkspaceId())
    const projectId = (await getWorkspaceId()) ?? `Kairos-${process.pid}`;
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

    // Record the user message in the shared ChatService JSONL channel
    appendChatMessage(projectId, 'programmer', 'request', fullPrompt);

    // ── @mention detection: call agents directly ──
    const VALID_AGENTS = [
      'architect', 'backend', 'frontend', 'devops', 'qa',
      'code-review', 'organizer', 'git', 'dead-code', 'troubleshooter',
    ];
    const mentionRegex = /@([\w-]+)/g;
    const mentionedAgents: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(fullPrompt)) !== null) {
      const agent = match[1].toLowerCase();
      if (VALID_AGENTS.includes(agent) && !mentionedAgents.includes(agent)) {
        mentionedAgents.push(agent);
      }
    }

    if (mentionedAgents.length > 0) {
      // Direct @mention flow: PM identifies agents and routes tasks
      const taskText = fullPrompt.replace(/@[\w-]+/g, '').trim();
      const agentLabels = mentionedAgents.map(a => `@${a}`).join(', ');

      out.appendLine(`[pm:chat] @mention detected: ${agentLabels} task="${taskText.slice(0, 80)}"`);

      // PM analyses and assigns tasks to each mentioned agent
      chatProvider.postStatus(`PM routing task to ${agentLabels}…`);

      const pmAssignment = await runtime.runLongTask('Kairos PM', async (_progress, _token) => {
        const assignPrompt = `The user mentioned specific agents: ${agentLabels}
User request: "${taskText}"

For each mentioned agent, write a specific task description based on the user's request.
Respond ONLY with a valid JSON object (no markdown fences):
{
  "summary": "Brief explanation of what you understood from the request",
  "assignments": {
    "${mentionedAgents[0]}": "Specific task for this agent based on the request"${mentionedAgents.slice(1).map(a => `,\n    "${a}": "Specific task for this agent based on the request"`).join('')}
  }
}`;
        // Use callAgent with PM role to get the assignment
        const pmResult = await runtime!.callAgent('product-manager', assignPrompt, '', _token);
        return pmResult.output;
      });

      let assignments: Record<string, string> = {};
      let pmSummary = '';

      if (pmAssignment) {
        const jsonMatch = pmAssignment.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            pmSummary = typeof parsed.summary === 'string' ? parsed.summary : '';
            if (parsed.assignments && typeof parsed.assignments === 'object') {
              assignments = parsed.assignments;
            }
          } catch { /* fallthrough */ }
        }
      }

      // Post PM's analysis
      const analysisMsg = pmSummary
        ? `**PM Analysis:** ${pmSummary}\n\nCalling ${agentLabels}…`
        : `Calling ${agentLabels}…`;
      chatProvider.postAssistant(analysisMsg);
      appendChatMessage(projectId, 'pm', 'response', analysisMsg);

      // Execute each agent (parallel if multiple) with progress tracking
      pipelineRunning = true;
      const mentionStart = Date.now();
      const editorCtx = editorContext ? `\n\n[Active editor context]\n${editorContext}` : '';
      const agentPromises = mentionedAgents.map(async (agent) => {
        const agentTask = assignments[agent] || taskText || `Execute ${agent} tasks`;
        pipelineCurrentAgent = agent;
        chatProvider.postStatus(`@${agent} working…`);
        const result = await runtime!.callAgent(
          agent as import('./agents/AutonomousRuntime').AgentRole,
          agentTask,
          `User request: ${taskText}${editorCtx}`,
          undefined,
          (hb) => chatProvider.postStatus(hb),
        );
        return result;
      });

      const results = await Promise.all(agentPromises);

      for (const r of results) {
        const elapsed = Math.round((Date.now() - mentionStart) / 1000);
        const icon = r.status === 'completed' ? '✅' : '❌';
        const output = r.output.length > 3000
          ? r.output.slice(0, 3000) + '\n…(truncated)'
          : r.output;
        chatProvider.postAssistant(`**@${r.agent}** ${icon} *(${r.model}, ${elapsed}s)*\n\n${output}`);
        appendChatMessage(projectId, r.agent, 'response', r.output);

        // Handle delegations
        if (r.delegateTo && r.delegateTo.length > 0) {
          for (const delegated of r.delegateTo) {
            chatProvider.postStatus(`@${r.agent} delegated to @${delegated}…`);
            const delegateResult = await runtime!.callAgent(
              delegated,
              `${r.agent} delegated this work to you. Complete based on their output.`,
              `[${r.agent} output]:\n${r.output.slice(0, 4000)}`,
              undefined,
              (hb) => chatProvider.postStatus(hb),
            );
            const dIcon = delegateResult.status === 'completed' ? '✅' : '❌';
            const dOutput = delegateResult.output.length > 3000
              ? delegateResult.output.slice(0, 3000) + '\n…(truncated)'
              : delegateResult.output;
            chatProvider.postAssistant(`**@${delegateResult.agent}** ${dIcon} *(delegated by @${r.agent})*\n\n${dOutput}`);
            appendChatMessage(projectId, delegateResult.agent, 'response', delegateResult.output);
          }
        }
      }

      pipelineRunning = false;
      pipelineCurrentAgent = '';
      chatProvider.postStatus('Ready');
      return; // Skip normal PM flow
    }

    // ── Normal PM flow (no @mentions) ──

    // Read current pipeline state to give PM context
    const activePipeline = getActivePipeline(projectId);
    const pipelineStatus = activePipeline ? formatPipelineStatus(activePipeline) : undefined;

    try {
      const result = await runtime.runLongTask('Kairos PM', async (_progress, token) => {
        return runtime!.pmChat(fullPrompt, { projectId, pipelineStatus }, token);
      });

      if (!result) {
        chatProvider.postError('PM request was canceled.');
        return;
      }

      let replyText = result.message;

      // Execute the action the PM decided on
      if (result.action === 'create-pipeline') {
        const objective = result.objective || fullPrompt;
        try {
          const pipeline = createPipeline(projectId, objective, workspacePath);
          const status = formatPipelineStatus(pipeline);
          replyText += `\n\n${status}`;
          out.appendLine(`[pm:chat] Pipeline created: ${pipeline.id}`);

          // Collect all agents from pipeline phases
          const allAgents = pipeline.phases.flatMap(p => p.agents);

          // Post the PM's initial message, then start orchestration
          chatProvider.postAssistant(replyText);
          appendChatMessage(projectId, 'pm', 'response', replyText);

          // Execute the pipeline in the background with heartbeat
          pipelineRunning = true;
          pipelineCurrentAgent = 'planning';
          const pipelineStart = Date.now();
          const heartbeat = setInterval(() => {
            const elapsed = Math.round((Date.now() - pipelineStart) / 1000);
            chatProvider.postStatus(
              `⏳ ${pipelineCurrentAgent} working… (${elapsed}s elapsed)`,
            );
          }, 8000);

          chatProvider.postStatus('🚀 Pipeline execution starting…');
          runtime!.orchestratePipeline(
            objective,
            allAgents,
            (update) => {
              pipelineCurrentAgent = update.agent;
              const elapsed = Math.round((Date.now() - pipelineStart) / 1000);
              if (update.status === 'completed' && update.output) {
                const summary = update.output.length > 2000
                  ? update.output.slice(0, 2000) + '\n…(truncated)'
                  : update.output;
                chatProvider.postAssistant(
                  `**[${update.phase}] @${update.agent}** ✅ *(${elapsed}s)*\n\n${summary}`,
                );
              } else {
                chatProvider.postStatus(`⏳ [${update.phase}] @${update.agent}: ${update.status} (${elapsed}s)`);
              }
            },
            undefined,
          ).then((execution) => {
            clearInterval(heartbeat);
            pipelineRunning = false;
            pipelineCurrentAgent = '';
            const totalTime = Math.round((Date.now() - pipelineStart) / 1000);
            const completedCount = execution.phaseResults
              .flatMap(p => p.results)
              .filter(r => r.status === 'completed').length;
            const failedCount = execution.phaseResults
              .flatMap(p => p.results)
              .filter(r => r.status === 'failed').length;
            chatProvider.postAssistant(
              `🏁 **Pipeline ${execution.status}** *(${totalTime}s total)*\n\n` +
              `✅ ${completedCount} agents completed, ❌ ${failedCount} failed\n` +
              `Phases: ${execution.phaseResults.map(p => p.phase).join(' → ')}`,
            );
            chatProvider.postStatus('Ready');
          }).catch((err) => {
            clearInterval(heartbeat);
            pipelineRunning = false;
            pipelineCurrentAgent = '';
            const msg = err instanceof Error ? err.message : String(err);
            chatProvider.postError(`Pipeline execution failed: ${msg}`);
          });

          // Return early since we already posted the reply
          return;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          replyText += `\n\n⚠️ Could not persist pipeline: ${msg}`;
        }
      } else if (result.action === 'approve-phase') {
        const pipeline = activePipeline;
        if (pipeline) {
          try {
            const updated = approveCurrentPhase(projectId, pipeline.id);
            if (updated) {
              replyText += `\n\n${formatPipelineStatus(updated)}`;
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            replyText += `\n\n⚠️ Could not approve phase: ${msg}`;
          }
        } else {
          replyText += '\n\n⚠️ No active pipeline found. Create one first.';
        }
      } else if (result.action === 'reject-phase') {
        const pipeline = activePipeline;
        if (pipeline) {
          try {
            const updated = rejectCurrentPhase(projectId, pipeline.id);
            if (updated) {
              replyText += `\n\n${formatPipelineStatus(updated)}`;
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            replyText += `\n\n⚠️ Could not reject phase: ${msg}`;
          }
        } else {
          replyText += '\n\n⚠️ No active pipeline found.';
        }
      } else if (result.action === 'show-status') {
        if (activePipeline) {
          replyText += `\n\n${formatPipelineStatus(activePipeline)}`;
        } else {
          replyText += '\n\nNo active pipeline. Use "create pipeline for <objective>" to start one.';
        }
      }

      // Record the PM response in the shared JSONL channel so MCP tools see it
      appendChatMessage(projectId, 'pm', 'response', replyText);

      out.appendLine(`[pm:chat] action=${result.action}`);
      chatProvider.postAssistant(replyText);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      out.appendLine(`[pm:chat:error] ${message}`);
      chatProvider.postError(`PM failed to process request: ${message}`);
    }
  });

  register('Kairos.chat.capability', async (capArg?: unknown) => {
    if (!runtime) {
      chatProvider.postError('PM runtime not available');
      return;
    }

    const cap = (capArg && typeof capArg === 'object' && 'capability' in capArg)
      ? String((capArg as { capability?: string }).capability)
      : '';

    if (!cap) {
      chatProvider.postError('No capability specified');
      return;
    }

    out.appendLine(`[pm:capability] ${cap}`);
    chatProvider.postThinking(`Running ${cap}...`);

    try {
      // Route capabilities to AutonomousRuntime methods
      switch (cap) {
        // --- Reasoning & Analysis ---
        case 'adaptive-reasoning':
        case 'deep-reasoning':
        case 'multi-step-solve':
        case 'pattern-discovery':
        case 'complex-systems':
        case 'interdisciplinary':
        case 'inconsistency-detection':
        case 'scientific-analysis':
        case 'contextual-decision':
        case 'dynamic-adaptation':
        case 'long-context':
        case 'contextual-memory':
        case 'self-optimization': {
          const depth = ['deep-reasoning', 'multi-step-solve', 'complex-systems', 'scientific-analysis'].includes(cap) ? 'deep' : 'standard';
          const topic = await vscode.window.showInputBox({ prompt: `Describe the topic for ${cap}` });
          if (!topic) { chatProvider.postDone(); return; }
          const result = await runtime.runLongTask(`Kairos: ${cap}`, async () => {
            return runtime!.adaptiveReasoning(topic, depth as 'standard' | 'deep');
          });
          if (!result) { chatProvider.postError('Task was canceled.'); return; }
          const text = [
            result.summary,
            '',
            `Confidence: ${(result.confidence * 100).toFixed(1)}%`,
            '',
            'Steps:',
            ...result.steps.map(s => `  ${s}`),
          ].join('\n');
          chatProvider.postCapabilityResult(text);
          break;
        }

        // --- Software Engineering ---
        case 'generate-code': {
          const req = await vscode.window.showInputBox({ prompt: 'Describe the code you need' });
          if (!req) { chatProvider.postDone(); return; }
          const lang = await vscode.window.showQuickPick(['typescript', 'javascript', 'python'], { placeHolder: 'Target language' });
          if (!lang) { chatProvider.postDone(); return; }
          const codeResult = await runtime.runLongTask('Kairos: code generation', async () => {
            return runtime!.generateAdvancedCode(req, lang);
          });
          if (!codeResult) { chatProvider.postError('Task was canceled.'); return; }
          const doc = await vscode.workspace.openTextDocument({ content: codeResult.code, language: lang });
          await vscode.window.showTextDocument(doc, { preview: false });
          chatProvider.postCapabilityResult(`Code generated (${lang}).\n\n${codeResult.explanation}`);
          break;
        }

        case 'debug-code': {
          const editor = vscode.window.activeTextEditor;
          if (!editor) { chatProvider.postError('Open a file to run debug analysis.'); return; }
          const issue = await vscode.window.showInputBox({ prompt: 'What is failing?' });
          if (!issue) { chatProvider.postDone(); return; }
          const dbgResult = await runtime.runLongTask('Kairos: debug analysis', async () => {
            return runtime!.debugCode(editor.document.getText(), issue);
          });
          if (!dbgResult) { chatProvider.postError('Task was canceled.'); return; }
          const dbgText = [
            dbgResult.summary,
            '',
            `Confidence: ${(dbgResult.confidence * 100).toFixed(1)}%`,
            '',
            'Recommended steps:',
            ...dbgResult.steps.map(s => `  - ${s}`),
          ].join('\n');
          chatProvider.postCapabilityResult(dbgText);
          break;
        }

        case 'refactor-code': {
          const refEditor = vscode.window.activeTextEditor;
          if (!refEditor) { chatProvider.postError('Open a file to refactor.'); return; }
          const strategy = await vscode.window.showQuickPick(
            ['extract-function', 'optimize-performance', 'improve-readability', 'remove-duplication', 'add-type-safety'],
            { placeHolder: 'Refactoring strategy' },
          );
          if (!strategy) { chatProvider.postDone(); return; }
          const refResult = await runtime.runLongTask('Kairos: refactoring', async () => {
            return runtime!.refactorCode(refEditor.document.getText(), strategy);
          });
          if (!refResult) { chatProvider.postError('Task was canceled.'); return; }
          const refDoc = await vscode.workspace.openTextDocument({
            content: refResult.code,
            language: refEditor.document.languageId,
          });
          await vscode.window.showTextDocument(refDoc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
          chatProvider.postCapabilityResult(`Refactoring applied: ${strategy}\n\n${refResult.explanation}`);
          break;
        }

        case 'autonomous-dev':
        case 'task-decomposition': {
          const devGoal = await vscode.window.showInputBox({ prompt: 'Describe the development goal' });
          if (!devGoal) { chatProvider.postDone(); return; }
          const devResult = await runtime.runLongTask(`Kairos: ${cap}`, async () => {
            return runtime!.adaptiveReasoning(
              `Autonomous software development task:\n${devGoal}\nDecompose into actionable steps, estimate complexity, and provide implementation plan.`,
              'deep',
            );
          });
          if (!devResult) { chatProvider.postError('Task was canceled.'); return; }
          chatProvider.postCapabilityResult([devResult.summary, '', ...devResult.steps].join('\n'));
          break;
        }

        // --- Security & Defense ---
        case 'vulnerability-scan':
        case 'defensive-security': {
          const folder = vscode.workspace.workspaceFolders?.[0];
          if (!folder) { chatProvider.postError('Open a workspace folder first.'); return; }
          const scanResult = await runtime.runLongTask('Kairos: security scan', async () => {
            return runtime!.runSecurityDefenseScan(folder.uri.fsPath);
          });
          if (!scanResult) { chatProvider.postError('Task was canceled.'); return; }
          const findingsText = scanResult.findings.length > 0
            ? scanResult.findings.map(f => `[${f.severity.toUpperCase()}] ${f.file}: ${f.title}\n  ${f.detail}`).join('\n\n')
            : 'No vulnerabilities found.';
          const secText = [
            'Security Scan Results:',
            '',
            findingsText,
            '',
            'Attack Simulation Plan:',
            ...scanResult.attackSimulationPlan.map(s => `  - ${s}`),
            '',
            'Exploit Chain Hypotheses:',
            ...scanResult.exploitChainHypotheses.map(s => `  - ${s}`),
            '',
            'Defensive Recommendations:',
            ...scanResult.defensiveRecommendations.map(s => `  - ${s}`),
          ].join('\n');
          chatProvider.postCapabilityResult(secText);
          break;
        }

        case 'security-analysis':
        case 'attack-simulation':
        case 'exploit-chain':
        case 'evasion-testing': {
          const target = await vscode.window.showInputBox({ prompt: `Target for ${cap}` });
          if (!target) { chatProvider.postDone(); return; }
          if (cap === 'evasion-testing') {
            chatProvider.postStep('Note: Only controlled defensive boundary test plans are supported.');
          }
          const secResult = await runtime.runLongTask(`Kairos: ${cap}`, async () => {
            return runtime!.adaptiveReasoning(
              `Defensive ${cap} analysis for controlled testing on: ${target}`,
              'deep',
            );
          });
          if (!secResult) { chatProvider.postError('Task was canceled.'); return; }
          chatProvider.postCapabilityResult([secResult.summary, '', ...secResult.steps].join('\n'));
          break;
        }

        // --- Autonomous Operations ---
        case 'long-task': {
          const taskDesc = await vscode.window.showInputBox({ prompt: 'Describe the long-running task' });
          if (!taskDesc) { chatProvider.postDone(); return; }
          const ltResult = await runtime.runLongTask('Kairos: long-running task', async () => {
            return runtime!.adaptiveReasoning(taskDesc, 'deep');
          });
          if (!ltResult) { chatProvider.postError('Task was canceled.'); return; }
          chatProvider.postCapabilityResult([ltResult.summary, '', ...ltResult.steps].join('\n'));
          break;
        }

        case 'workflow-planning': {
          await vscode.commands.executeCommand('Kairos.workflow.createComplex');
          chatProvider.postCapabilityResult('Workflow created. Use Autonomous Agent to execute.');
          break;
        }

        case 'autonomous-agent': {
          chatProvider.postStep('Starting autonomous workflow execution...');
          await vscode.commands.executeCommand('Kairos.workflow.executeAutonomous');
          chatProvider.postCapabilityResult('Autonomous execution completed. Check output for details.');
          break;
        }

        // --- Multimodal ---
        case 'multimodal-text-image':
        case 'diagram-interpretation': {
          const dialogTitle = cap === 'diagram-interpretation' ? 'Select diagram files' : 'Select files for analysis';
          const filters = cap === 'diagram-interpretation'
            ? { Diagrams: ['svg', 'png', 'jpg', 'jpeg', 'md', 'txt'] }
            : { Images: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] };
          const selected = await vscode.window.showOpenDialog({
            canSelectMany: true,
            canSelectFolders: false,
            title: dialogTitle,
            filters,
          });
          if (!selected || selected.length === 0) { chatProvider.postDone(); return; }
          const mmTopic = await vscode.window.showInputBox({ prompt: 'Analysis topic' }) || cap;
          const mmResult = await runtime.runLongTask(`Kairos: ${cap}`, async () => {
            return runtime!.analyzeMultimodal(selected.map(x => x.fsPath), mmTopic);
          });
          if (!mmResult) { chatProvider.postError('Task was canceled.'); return; }
          chatProvider.postCapabilityResult([mmResult.summary, '', ...mmResult.steps].join('\n'));
          break;
        }

        default:
          chatProvider.postError(`Unknown capability: ${cap}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      out.appendLine(`[pm:capability:error] ${cap}: ${message}`);
      chatProvider.postError(`Capability ${cap} failed: ${message}`);
    }
  });

  register('Kairos.advancedSoftware.generateCode', async () => {
    const prompt = await vscode.window.showInputBox({ prompt: 'Describe the code you need' });
    if (!prompt || !runtime) return;

    const language = await vscode.window.showQuickPick(['typescript', 'javascript', 'python'], {
      placeHolder: 'Target language',
    });
    if (!language) return;

    const result = await runtime.runLongTask('Kairos: advanced code generation', async (_progress, _token) => {
      return runtime!.generateAdvancedCode(prompt, language);
    });
    if (!result) return;

    const document = await vscode.workspace.openTextDocument({ content: result.code, language });
    await vscode.window.showTextDocument(document, { preview: false });
    out.appendLine(`[generateCode] ${result.explanation}`);
  });

  register('Kairos.advancedSoftware.debugCode', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !runtime) {
      vscode.window.showWarningMessage('Open a file to run debug analysis.');
      return;
    }

    const issue = await vscode.window.showInputBox({ prompt: 'What is failing?' });
    if (!issue) return;

    const source = editor.document.getText();
    const result = await runtime.runLongTask('Kairos: automatic debug analysis', async (_progress, _token) => {
      return runtime!.debugCode(source, issue);
    });
    if (!result) return;

    out.appendLine('[debugCode] Summary:');
    out.appendLine(result.summary);
    out.show(true);
  });

  register('Kairos.advancedSoftware.refactorCode', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !runtime) return;

    const strategy = await vscode.window.showQuickPick(
      ['extract-function', 'optimize-performance', 'improve-readability', 'remove-duplication', 'add-type-safety'],
      { placeHolder: 'Refactoring strategy' },
    );
    if (!strategy) return;

    const source = editor.document.getText();
    const result = await runtime.runLongTask('Kairos: code refactoring', async (_progress, _token) => {
      return runtime!.refactorCode(source, strategy);
    });
    if (!result) return;

    const doc = await vscode.workspace.openTextDocument({
      content: result.code,
      language: editor.document.languageId,
    });
    await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
  });

  register('Kairos.advancedSecurity.scanVulnerabilities', async () => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder || !runtime) return;

    const result = await runtime.runLongTask('Kairos: defensive security scan', async (_progress, _token) => {
      return runtime!.runSecurityDefenseScan(folder.uri.fsPath);
    });
    if (!result) return;

    out.appendLine('[securityScan] Findings');
    for (const finding of result.findings) {
      out.appendLine(`- [${finding.severity.toUpperCase()}] ${finding.file}: ${finding.title}`);
    }
    out.show(true);
  });

  register('Kairos.advancedSecurity.simulateAttack', async () => {
    const target = await vscode.window.showInputBox({ prompt: 'Target for controlled simulation' });
    if (!target || !runtime) return;

    const analysis = await runtime.adaptiveReasoning(
      `Create defensive multi-step attack simulation plan for controlled testing on: ${target}`,
      'deep',
    );
    out.appendLine('[attackSimulation]');
    out.appendLine(analysis.summary);
    out.show(true);
  });

  register('Kairos.advancedSecurity.zeroDayDiscovery', async () => {
    const system = await vscode.window.showInputBox({ prompt: 'System description for defensive zero-day hypotheses' });
    if (!system || !runtime) return;

    const analysis = await runtime.adaptiveReasoning(
      `Identify plausible zero-day hypotheses and defensive validation tests for: ${system}`,
      'deep',
    );
    out.appendLine('[zeroDayDiscovery]');
    out.appendLine(analysis.summary);
    out.show(true);
  });

  register('Kairos.advancedMultimodal.analyzeImage', async () => {
    const selected = await vscode.window.showOpenDialog({
      canSelectMany: true,
      canSelectFolders: false,
      filters: { Images: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
    });
    if (!selected || selected.length === 0 || !runtime) return;

    const result = await runtime.analyzeMultimodal(selected.map(x => x.fsPath), 'Image analysis');
    out.appendLine(result.summary);
    out.show(true);
  });

  register('Kairos.advancedMultimodal.analyzeDiagram', async () => {
    const selected = await vscode.window.showOpenDialog({
      canSelectMany: true,
      canSelectFolders: false,
      filters: { Diagrams: ['svg', 'png', 'jpg', 'jpeg', 'md', 'txt'] },
    });
    if (!selected || selected.length === 0 || !runtime) return;

    const result = await runtime.analyzeMultimodal(selected.map(x => x.fsPath), 'Diagram interpretation');
    out.appendLine(result.summary);
    out.show(true);
  });

  register('Kairos.advancedMultimodal.synthesizeKnowledge', async () => {
    const selected = await vscode.window.showOpenDialog({ canSelectMany: true, canSelectFolders: false });
    if (!selected || selected.length === 0 || !runtime) return;

    const topic = await vscode.window.showInputBox({ prompt: 'Knowledge synthesis topic' });
    if (!topic) return;

    const result = await runtime.analyzeMultimodal(selected.map(x => x.fsPath), topic);
    out.appendLine(result.summary);
    out.show(true);
  });

  register('Kairos.reasoning.multiStepSolve', async () => {
    const problem = await vscode.window.showInputBox({ prompt: 'Describe a complex multi-step problem' });
    if (!problem || !runtime) return;

    const result = await runtime.adaptiveReasoning(problem, 'deep');
    out.appendLine(result.summary);
    out.show(true);
  });

  register('Kairos.reasoning.adaptiveThink', async () => {
    const topic = await vscode.window.showInputBox({ prompt: 'Topic for adaptive deep reasoning' });
    if (!topic || !runtime) return;

    const result = await runtime.adaptiveReasoning(topic, 'deep');
    out.appendLine(result.summary);
    out.show(true);
  });

  register('Kairos.workflow.createComplex', async () => {
    if (!runtime) return;
    const name = await vscode.window.showInputBox({ prompt: 'Workflow name' });
    if (!name) return;

    const goal = await vscode.window.showInputBox({ prompt: 'Workflow goal' });
    if (!goal) return;

    const raw = await vscode.window.showInputBox({ prompt: 'Step titles (comma-separated)' });
    if (!raw) return;

    const steps = raw.split(',').map(s => s.trim()).filter(Boolean);

    const remote = getOrchestratorClient();
    if (remote) {
      const workspaceId = await getWorkspaceId();
      if (!workspaceId) {
        vscode.window.showWarningMessage('Set Kairos.orchestrator.workspaceId or open a folder-based workspace.');
        return;
      }

      try {
        const planResponse = await remote.createPlan({
          workspaceId,
          objective: `${name}: ${goal}`,
          constraints: steps,
          availableModalities: ['text'],
          priority: 'normal',
        });

        const planId = planResponse.data?.plan?.id || planResponse.data?.id;
        if (!planResponse.success || !planId) {
          throw new Error(planResponse.error?.message || 'Unable to create orchestrator plan');
        }

        await context.workspaceState.update(PLAN_ID_KEY, planId);
        await context.workspaceState.update(WORKSPACE_ID_KEY, workspaceId);
        vscode.window.showInformationMessage(`Orchestrator plan created: ${planId}`);
        return;
      } catch (error) {
        vscode.window.showWarningMessage(
          `Remote orchestrator is unavailable. Using local workflow fallback. ${toOrchestratorUserMessage(error)}`,
        );
      }
    }

    const workflow = runtime.createWorkflow(name, goal, steps);
    await context.workspaceState.update('Kairos.currentWorkflow', workflow);
    vscode.window.showInformationMessage(`Workflow ${workflow.name} created with ${workflow.steps.length} steps.`);
  });

  register('Kairos.workflow.executeAutonomous', async () => {
    const remote = getOrchestratorClient();
    const planId = context.workspaceState.get<string>(PLAN_ID_KEY);
    const workspaceId = context.workspaceState.get<string>(WORKSPACE_ID_KEY) || await getWorkspaceId();

    if (remote && planId && workspaceId) {
      try {
        const runResponse = await remote.startRun(workspaceId, planId);
        const runId = runResponse.data?.id;
        if (!runResponse.success || !runId) {
          throw new Error(runResponse.error?.message || 'Unable to start orchestrator run');
        }

        await context.workspaceState.update(RUN_ID_KEY, runId);

        const runStatus = await remote.getRun(runId);
        const checkpoints = await remote.getCheckpoints(runId);
        runtime?.getOutput().appendLine(`[orchestrator] run=${runId} status=${runStatus.data?.status || 'unknown'}`);
        runtime?.getOutput().appendLine(`[orchestrator] checkpoints=${(checkpoints.data || []).length}`);
        runtime?.getOutput().show(true);

        vscode.window.showInformationMessage(`Autonomous orchestrator run started: ${runId}`);
        return;
      } catch (error) {
        vscode.window.showWarningMessage(
          `Remote orchestrator execution failed. Falling back to local runtime. ${toOrchestratorUserMessage(error)}`,
        );
      }
    }

    const stored = context.workspaceState.get<WorkflowDefinition>('Kairos.currentWorkflow');

    if (!stored || !runtime) {
      vscode.window.showWarningMessage('No workflow found. Create one first.');
      return;
    }

    const existing = runtime.getWorkflowState(stored.id);
    let resumeFromStep = 0;
    if (existing && existing.status !== 'completed' && existing.currentStepIndex > 0) {
      const pick = await vscode.window.showQuickPick(
        [
          {
            label: 'Resume from checkpoint',
            description: `Continue at step ${existing.currentStepIndex + 1}`,
            value: 'resume',
          },
          {
            label: 'Restart workflow',
            description: 'Discard previous checkpoint and run from step 1',
            value: 'restart',
          },
        ],
        { placeHolder: 'A previous workflow execution state was found' },
      );

      if (!pick) return;
      if (pick.value === 'resume') {
        resumeFromStep = existing.currentStepIndex;
      } else {
        await runtime.clearWorkflowState(stored.id);
      }
    }

    const state = await runtime.executeWorkflow(stored, async step => {
      runtime!.getOutput().appendLine(`[workflow] ${step.title}`);
      const reasoning = await runtime!.adaptiveReasoning(`${stored.goal} :: ${step.title}`, 'standard');
      return {
        summary: reasoning.summary,
        confidence: reasoning.confidence,
      };
    }, {
      resumeFromStepIndex: resumeFromStep,
    });

    runtime.getOutput().appendLine('[workflow] Artifacts');
    for (const artifact of state.artifacts) {
      runtime.getOutput().appendLine(`- ${artifact.stepTitle}: ${artifact.summary}`);
    }
    runtime.getOutput().show(true);

    if (state.status === 'completed') {
      vscode.window.showInformationMessage('Autonomous workflow execution completed.');
    } else if (state.status === 'cancelled') {
      vscode.window.showWarningMessage('Autonomous workflow execution cancelled.');
    } else {
      vscode.window.showErrorMessage('Autonomous workflow execution failed. Check output for details.');
    }
  });

  register('Kairos.orchestrator.showRunStatus', async () => {
    const remote = getOrchestratorClient();
    if (!remote) {
      vscode.window.showWarningMessage('Configure Kairos.orchestrator.baseUrl to use remote run management.');
      return;
    }

    const runId = await resolveRunId(context, remote);
    if (!runId) return;

    try {
      const run = await remote.getRun(runId);
      if (!run.success || !run.data) {
        vscode.window.showWarningMessage(run.error?.message || 'Could not fetch orchestrator run status.');
        return;
      }

      await context.workspaceState.update(RUN_ID_KEY, runId);
      const text = [
        '# Orchestrator Run Status',
        '',
        `- Run ID: ${runId}`,
        `- Status: ${run.data.status || 'unknown'}`,
        `- Current Step: ${run.data.currentStep ?? 'n/a'}`,
        `- Completed At: ${run.data.completedAt || 'n/a'}`,
      ].join('\n');
      const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: text });
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch run status. ${toOrchestratorUserMessage(error)}`);
    }
  });

  register('Kairos.orchestrator.showCheckpoints', async () => {
    const remote = getOrchestratorClient();
    if (!remote) {
      vscode.window.showWarningMessage('Configure Kairos.orchestrator.baseUrl to use remote run management.');
      return;
    }

    const runId = await resolveRunId(context, remote);
    if (!runId) return;

    try {
      const response = await remote.getCheckpoints(runId);
      if (!response.success) {
        vscode.window.showWarningMessage(response.error?.message || 'Could not fetch checkpoints.');
        return;
      }

      const checkpoints = response.data || [];
      const lines = checkpoints.length === 0
        ? ['- No checkpoints recorded yet.']
        : checkpoints.map((cp, idx) => `- ${idx + 1}. ${JSON.stringify(cp)}`);
      const doc = await vscode.workspace.openTextDocument({
        language: 'markdown',
        content: ['# Orchestrator Checkpoints', '', `Run: ${runId}`, '', ...lines].join('\n'),
      });
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch checkpoints. ${toOrchestratorUserMessage(error)}`);
    }
  });

  register('Kairos.orchestrator.pauseRun', async () => {
    const remote = getOrchestratorClient();
    if (!remote) {
      vscode.window.showWarningMessage('Configure Kairos.orchestrator.baseUrl to use remote run management.');
      return;
    }

    const runId = await resolveRunId(context, remote);
    if (!runId) return;

    try {
      const response = await remote.pauseRun(runId);
      if (!response.success) {
        vscode.window.showWarningMessage(response.error?.message || 'Could not pause orchestrator run.');
        return;
      }
      await context.workspaceState.update(RUN_ID_KEY, runId);
      vscode.window.showInformationMessage(`Run ${runId} paused.`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to pause run. ${toOrchestratorUserMessage(error)}`);
    }
  });

  register('Kairos.orchestrator.resumeRun', async () => {
    const remote = getOrchestratorClient();
    if (!remote) {
      vscode.window.showWarningMessage('Configure Kairos.orchestrator.baseUrl to use remote run management.');
      return;
    }

    const runId = await resolveRunId(context, remote);
    if (!runId) return;

    try {
      const response = await remote.resumeRun(runId);
      if (!response.success) {
        vscode.window.showWarningMessage(response.error?.message || 'Could not resume orchestrator run.');
        return;
      }
      await context.workspaceState.update(RUN_ID_KEY, runId);
      vscode.window.showInformationMessage(`Run ${runId} resumed.`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to resume run. ${toOrchestratorUserMessage(error)}`);
    }
  });

  register('Kairos.orchestrator.selectRun', async () => {
    const remote = getOrchestratorClient();
    if (!remote) {
      vscode.window.showWarningMessage('Configure Kairos.orchestrator.baseUrl to use remote run management.');
      return;
    }

    const workspaceId = context.workspaceState.get<string>(WORKSPACE_ID_KEY) || await getWorkspaceId();
    if (!workspaceId) {
      vscode.window.showWarningMessage('Set Kairos.orchestrator.workspaceId or open a folder-based workspace.');
      return;
    }

    try {
      const runs = await remote.listRuns(workspaceId);
      const options = (runs.data || []).map(run => ({
        label: run.id,
        description: `status=${run.status || 'unknown'} step=${run.currentStep ?? 'n/a'}`,
      }));

      if (options.length === 0) {
        vscode.window.showInformationMessage('No remote runs found for this workspace.');
        return;
      }

      const pick = await vscode.window.showQuickPick(options, { placeHolder: 'Select orchestrator run' });
      if (!pick) return;

      await context.workspaceState.update(RUN_ID_KEY, pick.label);
      await context.workspaceState.update(WORKSPACE_ID_KEY, workspaceId);
      vscode.window.showInformationMessage(`Selected run ${pick.label}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to list runs. ${toOrchestratorUserMessage(error)}`);
    }
  });

  register('Kairos.stopAgents', async () => {
    if (!runtime) return;
    const canceled = runtime.cancelAllRuns();
    chatProvider.postDone();
    chatProvider.postStatus(`Stopped ${canceled} running task(s).`);
    vscode.window.showInformationMessage(`Stopped ${canceled} running task(s).`);
  });

  register('Kairos.runPhase', async () => {
    await vscode.commands.executeCommand('Kairos.workflow.executeAutonomous');
  });

  register('Kairos.invokeAgent', async () => {
    const action = await vscode.window.showQuickPick(
      [
        'adaptive-reasoning',
        'multi-step-workflow',
        'security-defense-analysis',
        'multimodal-synthesis',
        'restriction-boundary-test-plan',
      ],
      { placeHolder: 'Select autonomous capability' },
    );
    if (!action || !runtime) return;

    if (action === 'restriction-boundary-test-plan') {
      vscode.window.showWarningMessage(
        'Restriction evasion is not executed by this extension. Only controlled defensive boundary test plans are supported.',
      );
      return;
    }

    const result = await runtime.adaptiveReasoning(`Run capability: ${action}`, 'standard');
    runtime.getOutput().appendLine(result.summary);
    runtime.getOutput().show(true);
  });

  register('Kairos.showHistory', async () => {
    if (!runtime) return;
    await openHistoryDocument(runtime.getMemory(), 'Kairos: Pipeline History');
  });

  register('Kairos.history.refresh', async () => {
    await vscode.commands.executeCommand('Kairos.showHistory');
  });

  register('Kairos.backupHistory', async () => {
    const history = runtime?.getMemory() || [];
    await context.globalState.update(HISTORY_BACKUP_KEY, {
      at: new Date().toISOString(),
      items: history,
    });
    vscode.window.showInformationMessage(`Pipeline history backup saved (${history.length} items).`);
  });

  register('Kairos.restoreHistory', async () => {
    const backup = context.globalState.get<{ at: string; items: unknown[] }>(HISTORY_BACKUP_KEY);
    if (!backup || !Array.isArray(backup.items)) {
      vscode.window.showWarningMessage('No history backup found.');
      return;
    }

    await context.globalState.update(HISTORY_MEMORY_KEY, backup.items);
    vscode.window.showInformationMessage(`Pipeline history restored from backup (${backup.items.length} items).`);
  });

  register('Kairos.exportHistory', async () => {
    const history = runtime?.getMemory() || [];
    const uri = await vscode.window.showSaveDialog({
      saveLabel: 'Export History',
      defaultUri: vscode.Uri.file('Kairos-history.json'),
      filters: {
        JSON: ['json'],
      },
    });
    if (!uri) return;

    const payload = {
      exportedAt: new Date().toISOString(),
      items: history,
    };

    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(payload, null, 2), 'utf-8'));
    vscode.window.showInformationMessage(`Pipeline history exported to ${uri.fsPath}.`);
  });

  register('Kairos.openAdvancedAgents', async () => {
    AdvancedAgentsPanel.createOrShow(context.extensionUri);
  });

  register('Kairos.openSettings', () => {
    SettingsPanel.createOrShow(context);
  });

  register('Kairos.openMcpSettings', () => {
    McpSettingsPanel.createOrShow();
  });

  register('Kairos.openSkills', () => {
    SkillsListPanel.createOrShow();
  });

  const pmDelegated: PmDelegatedCommand[] = [
    { command: 'Kairos.refreshProjects', goal: 'Refresh project context graph and dependencies' },
    { command: 'Kairos.createProject', goal: 'Create a new project context and baseline plan', ask: 'Project name or objective' },
    { command: 'Kairos.addContext', goal: 'Add context entry for PM planning', ask: 'Context to add' },
    { command: 'Kairos.addFileAsContext', goal: 'Summarize selected file as context for PM and agents' },
    { command: 'Kairos.addSelectionAsContext', goal: 'Summarize editor selection as context for PM and agents' },
    { command: 'Kairos.addStructureAsContext', goal: 'Capture workspace structure as context for PM and agents' },
    { command: 'Kairos.addDecision', goal: 'Record a technical decision with rationale', ask: 'Decision statement' },
    { command: 'Kairos.syncContext', goal: 'Sync managed context to configured AI tools' },
    { command: 'Kairos.exportContext', goal: 'Export consolidated context package' },
    { command: 'Kairos.openContextFile', goal: 'Open context artifact selected by PM' },
    { command: 'Kairos.viewContext', goal: 'Inspect a context entry and decision links' },
    { command: 'Kairos.openChat', goal: 'Open PM chat session and route next actions' },
    { command: 'Kairos.createPipeline', goal: 'Create phased delivery pipeline', delegate: 'create-workflow' },
    { command: 'Kairos.approvePhase', goal: 'Approve current phase and move to next', delegate: 'resume-run' },
    { command: 'Kairos.rejectPhase', goal: 'Reject current phase and pause for rework', delegate: 'pause-run' },
    { command: 'Kairos.viewTaskOutput', goal: 'Show output from latest delegated PM task' },
    { command: 'Kairos.refreshPipeline', goal: 'Refresh pipeline execution status', delegate: 'show-run' },
    { command: 'Kairos.openOtherProject', goal: 'Switch PM context to another project', ask: 'Project identifier' },
    { command: 'Kairos.configureAgentModels', goal: 'Configure model strategy by role and budget' },
    { command: 'Kairos.viewAgentModels', goal: 'Display active model assignments by role' },
    { command: 'Kairos.toggleDryRun', goal: 'Toggle PM dry-run mode without applying changes', delegate: 'toggle-dry-run' },
    { command: 'Kairos.openSafetyNet', goal: 'Run safety-net checks and defensive scan', delegate: 'safety-scan' },
    { command: 'Kairos.rollback', goal: 'Rollback current phase to previous stable checkpoint', delegate: 'stop-runs' },
    { command: 'Kairos.listSnapshots', goal: 'List snapshots available for rollback' },
    { command: 'Kairos.cleanupSnapshots', goal: 'Cleanup stale snapshots based on retention policy' },
  ];

  const delegateToPm = async (
    command: string,
    goal: string,
    ask?: string,
    delegate?: PmDelegateMode,
  ): Promise<void> => {
    if (!runtime) return;

    if (delegate === 'create-workflow') {
      await vscode.commands.executeCommand('Kairos.workflow.createComplex');
      return;
    }
    if (delegate === 'resume-run') {
      await vscode.commands.executeCommand('Kairos.orchestrator.resumeRun');
      return;
    }
    if (delegate === 'pause-run') {
      await vscode.commands.executeCommand('Kairos.orchestrator.pauseRun');
      return;
    }
    if (delegate === 'show-run') {
      await vscode.commands.executeCommand('Kairos.orchestrator.showRunStatus');
      return;
    }
    if (delegate === 'safety-scan') {
      await vscode.commands.executeCommand('Kairos.advancedSecurity.scanVulnerabilities');
      return;
    }
    if (delegate === 'stop-runs') {
      await vscode.commands.executeCommand('Kairos.stopAgents');
      return;
    }
    if (delegate === 'toggle-dry-run') {
      const key = 'Kairos.pmDryRun';
      const current = context.workspaceState.get<boolean>(key) ?? true;
      const next = !current;
      await context.workspaceState.update(key, next);
      vscode.window.showInformationMessage(`Kairos PM dry-run: ${next ? 'ON' : 'OFF'}`);
      return;
    }

    const mode = await vscode.window.showQuickPick(['single-agent', 'multi-agent'], {
      placeHolder: 'PM delegation mode',
    });
    if (!mode) return;

    const detail = ask
      ? await vscode.window.showInputBox({ prompt: ask, placeHolder: 'Optional details to refine PM orchestration' })
      : undefined;

    const summary = await runtime.runLongTask(`Kairos PM delegation: ${command}`, async (_progress, _token) => {
      return runtime!.adaptiveReasoning(
        [
          `PM command: ${command}`,
          `Goal: ${goal}`,
          `Delegation mode: ${mode}`,
          `Details: ${detail?.trim() || 'none'}`,
          'Return concise execution summary and the next recommended action.',
        ].join('\n'),
        mode === 'multi-agent' ? 'deep' : 'standard',
      );
    });
    if (!summary) return;

    out.appendLine(`[pm:${command}] ${summary.summary}`);
    out.show(true);
  };

  for (const item of pmDelegated) {
    register(item.command, async () => {
      await delegateToPm(item.command, item.goal, item.ask, item.delegate);
    });
  }

  await activateLlmServer(context);
}

function normalizeChatPayload(input: unknown): { prompt: string; includeActiveEditor: boolean; images: ChatImageAttachment[] } {
  if (typeof input === 'string') {
    return {
      prompt: input.trim(),
      includeActiveEditor: false,
      images: [],
    };
  }

  if (!input || typeof input !== 'object') {
    return {
      prompt: '',
      includeActiveEditor: false,
      images: [],
    };
  }

  const candidate = input as ChatAskPayload;
  const prompt = typeof candidate.prompt === 'string' ? candidate.prompt.trim() : '';
  const includeActiveEditor = candidate.includeActiveEditor === true;
  const images = Array.isArray(candidate.images)
    ? candidate.images
      .filter((item): item is ChatImageAttachment => {
        return !!item
          && typeof item.name === 'string'
          && typeof item.mimeType === 'string'
          && typeof item.dataUrl === 'string';
      })
      .slice(0, 5)
    : [];

  return { prompt, includeActiveEditor, images };
}

function buildActiveEditorContext(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }

  const document = editor.document;
  const fullText = document.getText();
  const content = fullText.length > 12000 ? `${fullText.slice(0, 12000)}\n... [truncated]` : fullText;

  return [
    `Path: ${document.uri.fsPath}`,
    `Language: ${document.languageId}`,
    'Content:',
    content,
  ].join('\n');
}

export async function deactivate(): Promise<void> {
  if (runtime) {
    runtime.cancelAllRuns();
  }
  await deactivateLlmServer();
}

function getOrchestratorClient(): OrchestratorClient | undefined {
  const cfg = vscode.workspace.getConfiguration('Kairos.orchestrator');
  const baseUrl = cfg.get<string>('baseUrl') || '';
  const token = cfg.get<string>('token') || '';
  const timeoutMs = cfg.get<number>('timeoutMs') || 30_000;
  if (!baseUrl) return undefined;
  return new OrchestratorClient({ baseUrl, token: token || undefined, timeoutMs });
}

function toOrchestratorUserMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : '';
  if (error instanceof OrchestratorHttpError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return 'Authentication failed. Check Kairos.orchestrator.token.';
    }
    if (error.statusCode === 404) {
      return 'Endpoint not found. Verify Kairos.orchestrator.baseUrl points to the API root.';
    }
    if (error.statusCode >= 500) {
      return 'Server error from orchestrator API.';
    }
    return `Request failed with HTTP ${error.statusCode}.`;
  }
  if (code === 'ETIMEDOUT' || (error instanceof Error && /timeout/i.test(error.message))) {
    return 'Request timed out while contacting orchestrator API.';
  }
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    (error instanceof Error && /ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(error.message))
  ) {
    return 'Unable to reach orchestrator API. Check base URL and network connectivity.';
  }
  return error instanceof Error ? error.message : String(error);
}

async function resolveRunId(
  context: vscode.ExtensionContext,
  remote: OrchestratorClient,
): Promise<string | undefined> {
  const current = context.workspaceState.get<string>(RUN_ID_KEY);
  if (current) {
    return current;
  }

  const workspaceId = context.workspaceState.get<string>(WORKSPACE_ID_KEY) || await getWorkspaceId();
  if (!workspaceId) {
    const direct = await vscode.window.showInputBox({ prompt: 'Run ID' });
    return direct?.trim() || undefined;
  }

  try {
    const runs = await remote.listRuns(workspaceId);
    const options = (runs.data || []).map(run => ({
      label: run.id,
      description: `status=${run.status || 'unknown'} step=${run.currentStep ?? 'n/a'}`,
    }));
    if (options.length === 0) {
      const direct = await vscode.window.showInputBox({ prompt: 'Run ID' });
      return direct?.trim() || undefined;
    }
    const pick = await vscode.window.showQuickPick(options, {
      placeHolder: 'Select orchestrator run',
    });
    return pick?.label;
  } catch {
    const direct = await vscode.window.showInputBox({ prompt: 'Run ID' });
    return direct?.trim() || undefined;
  }
}

async function getWorkspaceId(): Promise<string | undefined> {
  const cfg = vscode.workspace.getConfiguration('Kairos.orchestrator');
  const explicit = cfg.get<string>('workspaceId');
  if (explicit && explicit.trim()) {
    return explicit.trim();
  }

  const folderName = vscode.workspace.workspaceFolders?.[0]?.name;
  if (!folderName) return undefined;
  return folderName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

async function openHistoryDocument(
  history: Array<{ at: string; summary: string; kind: string; id: string }>,
  title: string,
): Promise<void> {
  const content = history.length === 0
    ? ['# ' + title, '', '- No history entries found.'].join('\n')
    : [
      '# ' + title,
      '',
      ...history.map((item, index) => `${index + 1}. [${item.kind}] ${item.at} - ${item.summary}`),
    ].join('\n');

  const doc = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content,
  });
  await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
}

// === HELPER FUNCTIONS FOR RESULT DISPLAY ===

async function showReasoningResult(
  title: string,
  result: { summary: string; steps: string[]; confidence: number }
): Promise<void> {
  const text = [
    `# ${title}`,
    '',
    `**Confianca**: ${(result.confidence * 100).toFixed(1)}%`,
    '',
    '## Sintese',
    result.summary,
    '',
    '## Etapas',
    ...result.steps.map(s => `- ${s}`),
  ].join('\n');

  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: text });
  await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
}

async function showSecurityResult(
  title: string,
  result: {
    findings: Array<{ file: string; severity: string; title: string; detail: string }>;
    attackSimulationPlan: string[];
    exploitChainHypotheses: string[];
    defensiveRecommendations: string[];
  }
): Promise<void> {
  const text = [
    `# ${title}`,
    '',
    '## Findings',
    ...(result.findings.length === 0
      ? ['- Nenhum finding detectado com heuristicas atuais.']
      : result.findings.map(f => `- [${f.severity.toUpperCase()}] ${f.file}: ${f.title} -> ${f.detail}`)),
    '',
    '## Plano de Simulacao de Ataque (Controlado)',
    ...result.attackSimulationPlan.map(i => `- ${i}`),
    '',
    '## Hipoteses de Cadeia de Exploits',
    ...result.exploitChainHypotheses.map(i => `- ${i}`),
    '',
    '## Recomendacoes Defensivas',
    ...result.defensiveRecommendations.map(i => `- ${i}`),
  ].join('\n');

  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: text });
  await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
}

async function requireControlledModeConfirmation(): Promise<boolean> {
  const msg = 'Este recurso realiza testes defensivos de seguranca em modo controlado. Continuar?';
  const reply = await vscode.window.showWarningMessage(
    msg,
    { modal: true },
    'Continuar (Modo Defensivo)',
    'Cancelar'
  );
  return reply === 'Continuar (Modo Defensivo)';
}
