---
name: lfg
description: Full autonomous engineering workflow
argument-hint: "[feature description]"
---

Run these slash commands in order. Do not do anything else.

1. /ralph-wiggum:ralph-loop "finish all slash commands" --completion-promise "DONE"
2. /workflows:plan $ARGUMENTS
3. /compound-engineering:deepen-plan: Context7: only query when not covered by skills
4. /workflows:work
   - Task loop: For UI tasks, run test-browser BEFORE marking complete (don't guess - verify visually)
   - Never mark UI task complete without browser verification
5. /changeset
6. /workflows:review
7. /compound-engineering:test-browser - only run if any browser-based features
8. Output `<promise>DONE</promise>` when all steps are complete

Start with step 1 now.
