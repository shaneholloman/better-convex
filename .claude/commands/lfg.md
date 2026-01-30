---
name: lfg
description: Full autonomous engineering workflow
argument-hint: "[feature description]"
---

Run these slash commands in order. Do not do anything else.

1. `/ralph-wiggum:ralph-loop "finish all slash commands" --completion-promise "DONE"`
2. `/dplan $ARGUMENTS`
3. `/workflows:work`
   - Task loop: For UI tasks, run test-browser BEFORE marking complete (don't guess - verify visually)
   - Never mark UI task complete without browser verification
4. `/changeset`
5. Output `<promise>DONE</promise>` when video is in PR

Start with step 1 now.
