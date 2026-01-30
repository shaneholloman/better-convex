---
name: lfg
description: Full autonomous engineering workflow
argument-hint: "[feature description]"
---

Run these slash commands in order. Do not do anything else.

2. /workflows:plan $ARGUMENTS
3. /compound-engineering:deepen-plan: Context7: only query when not covered by skills
4. /workflows:work
   - Task loop: For UI tasks, run test-browser BEFORE marking complete (don't guess - verify visually)
   - Never mark UI task complete without browser verification
5. /changeset
6. /workflows:review
7. /compound-engineering:test-browser - only run if any browser-based features

Start with step 1 now.
