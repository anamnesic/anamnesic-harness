# Kairos VS Code Extension

VS Code extension for autonomous workflows, defensive analysis, and orchestrator integration.

This package is in an implementation phase with mixed maturity: some commands are fully wired, while others are explicit placeholders.

## Status

Current implementation has two groups of features.

Implemented now:

- Advanced command handlers in `src/extension.ts` for:
	- code generation, debugging, and refactoring
	- defensive security scan and controlled simulation planning
	- multimodal file synthesis (image/text classification + reasoning summary)
	- workflow creation/execution with local fallback state checkpoints
	- remote orchestrator run operations (create/start/status/checkpoints/pause/resume/select)
- Network robustness in orchestrator client (HTTP error mapping + timeout handling)
- Output channel reporting for long-running autonomous tasks

Still placeholder (shows info message only):

- No command in this package remains info-only placeholder.

Known gaps:

- The contributed view container exists, and runtime behavior is still command-first.
- PM-facing control commands are intentionally not pinned in chat title actions.

Placeholder implementation backlog is tracked in `PLACEHOLDERS_TODO.md`.

## Build

```bash
cd packages/vscode
pnpm build
pnpm exec vsce package --no-dependencies
```

Install the generated `.vsix` from VS Code Extensions sidebar ("Install from VSIX...").

## Commands

Working commands (implemented handlers):

- `Kairos: Advanced Code Generation`
- `Kairos: AI-Powered Code Debugging`
- `Kairos: Intelligent Code Refactoring`
- `Kairos: Comprehensive Security Scan`
- `Kairos: Attack Simulation (Controlled)`
- `Kairos: Zero-Day Vulnerability Discovery`
- `Kairos: AI Image Analysis`
- `Kairos: Diagram Interpretation`
- `Kairos: Knowledge Synthesis`
- `Kairos: Multi-Step Problem Solving`
- `Kairos: Adaptive Deep Reasoning`
- `Kairos: Create Complex Workflow`
- `Kairos: Execute Autonomous Workflow`
- `Kairos: Orchestrator Run Status`
- `Kairos: Orchestrator Checkpoints`
- `Kairos: Pause Orchestrator Run`
- `Kairos: Resume Orchestrator Run`
- `Kairos: Select Orchestrator Run`
- `Kairos: Run Current Phase (Start Agents)` (PM/delegation command; not shown in chat title actions)
- `Kairos: Stop All Agents`
- `Kairos: Invoke Agent`

PM-delegated commands (formerly placeholders, now functional):

- `Kairos: Refresh Projects`
- `Kairos: Create Project`
- `Kairos: Add Context Entry`
- `Kairos: Add File as Context`
- `Kairos: Add Selection as Context`
- `Kairos: Add Workspace Structure as Context`
- `Kairos: Record Decision`
- `Kairos: Sync to AI Tools`
- `Kairos: Export Context`
- `Kairos: Open Context File`
- `Kairos: View Context Entry`
- `Kairos: Open AI Chat`
- `Kairos: Create Pipeline`
- `Kairos: Approve Phase`
- `Kairos: Reject Phase`
- `Kairos: View Task Output`
- `Kairos: Refresh Pipeline`
- `Kairos: Open Other Project`
- `Kairos: Configure Agent Models`
- `Kairos: View Agent Models`
- `Kairos: Toggle Dry-Run Mode`
- `Kairos: Open Safety Net Panel`
- `Kairos: Rollback Phase`
- `Kairos: List Available Snapshots`
- `Kairos: Cleanup Old Snapshots`

## Orchestrator Configuration

Remote orchestrator commands are enabled when `Kairos.orchestrator.baseUrl` is set.

Supported settings:

- `Kairos.orchestrator.baseUrl`
- `Kairos.orchestrator.token`
- `Kairos.orchestrator.workspaceId`

Runtime also reads `Kairos.orchestrator.timeoutMs` (default `30000`) if defined in user settings.

## Data and State

- Workflow checkpoints and recent run summaries are persisted in VS Code workspace/global state.
- This extension README no longer claims active SQLite context management until placeholder commands are fully implemented.
