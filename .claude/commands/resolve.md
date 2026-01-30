---
description: Resolve review findings with code edits
argument-hint: "[P1] [P2] [P3]"
---

Run `/compound-engineering:resolve_todo_parallel`

Sources (checks both):
1. `todos/` directory - if todo files exist (local workflow)
2. Thread comments - if running in GitHub CI (reads previous /review comment)

Priority levels:
- P1 (critical) - security, data issues - BLOCKS MERGE
- P2 (important) - performance, architecture
- P3 (nice-to-have) - cleanup, enhancements

For each specified priority:
1. Read Problem Statement and Proposed Solutions
2. Implement the recommended fix
3. Commit with conventional message
4. Run typecheck, lint after all fixes
