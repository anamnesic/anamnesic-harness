# Placeholders TODO (PM Delegation Model)

This list tracks commands that still use placeholder handlers and must be implemented via PM-driven delegation to one or more agents.

## Principles

- Commands should delegate orchestration to PM instead of embedding business logic directly in UI handlers.
- UI commands should collect minimal input and call PM orchestration services.
- Keep command names stable for backward compatibility.

## PM-Delegated Backlog (Implemented)

All commands below were migrated from info-only placeholders to PM-delegated functional handlers in `src/extension.ts`.

- [x] Kairos.refreshProjects
- [x] Kairos.createProject
- [x] Kairos.addContext
- [x] Kairos.addFileAsContext
- [x] Kairos.addSelectionAsContext
- [x] Kairos.addStructureAsContext
- [x] Kairos.addDecision
- [x] Kairos.syncContext
- [x] Kairos.exportContext
- [x] Kairos.openContextFile
- [x] Kairos.viewContext
- [x] Kairos.openChat
- [x] Kairos.createPipeline
- [x] Kairos.approvePhase
- [x] Kairos.rejectPhase
- [x] Kairos.viewTaskOutput
- [x] Kairos.refreshPipeline
- [x] Kairos.openOtherProject
- [x] Kairos.configureAgentModels
- [x] Kairos.viewAgentModels
- [x] Kairos.toggleDryRun
- [x] Kairos.openSafetyNet
- [x] Kairos.rollback
- [x] Kairos.listSnapshots
- [x] Kairos.cleanupSnapshots

## Non-Placeholder (Already Wired)

- Kairos.runPhase (delegates to workflow.executeAutonomous)
- Kairos.stopAgents
- Kairos.invokeAgent
- Kairos.workflow.createComplex
- Kairos.workflow.executeAutonomous
- Kairos.orchestrator.showRunStatus
- Kairos.orchestrator.showCheckpoints
- Kairos.orchestrator.pauseRun
- Kairos.orchestrator.resumeRun
- Kairos.orchestrator.selectRun
