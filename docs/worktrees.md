# Worktrees

Kairos can isolate sessions in git worktrees to reproduce bugs and validate fixes safely.

## Remote control server
- Start multi-session mode with worktree isolation:
  - kairos remote-control --spawn=worktree
- Press w during runtime to toggle same-dir vs worktree.
- Control concurrency with --capacity <N>.
- Worktree mode requires a git repository or WorktreeCreate/WorktreeRemove hooks.

## Notes
- Worktrees are cleaned up on shutdown (best effort).
- If you need manual control, use git worktree create/remove and start Kairos in that directory.
