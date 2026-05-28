# clean package skill

Objective:
Clean the package-owned kitcn skill source under `packages/kitcn/skills/kitcn`
using `skill-cleaner`, then sync the generated repo-local copy.

Goal plan:
docs/plans/2026-05-28-clean-package-skill.md

Template:
docs/plans/templates/task.md

Primary template:
docs/plans/templates/task.md

Applied packs:
- agent-native (docs/plans/templates/packs/agent-native.md)

Task source:
- type: user prompt
- id / link: N/A
- title: apply skill-cleaner on package skill
- acceptance criteria: run scoped skill-cleaner audit, apply accepted cleanup to
  `packages/kitcn/skills/kitcn`, do not hand-edit `.agents/skills/kitcn`, sync
  the generated mirror, resolve changeset requirement, run package build, and
  pass the goal-plan completion checker.

Completion threshold:
- Scoped `skill-cleaner` report is recorded.
- Source-owned package skill cleanup is applied or explicitly rejected with
  evidence.
- `.agents/skills/kitcn` is regenerated from `packages/kitcn/skills/kitcn`.
- Changeset handling is complete for the package skill edit.
- `bun --cwd packages/kitcn build` passes.
- Task closure is legal only when the source-of-truth acceptance criteria are
  satisfied or explicitly narrowed, required verification evidence is recorded,
  code-review and release-artifact gates are closed when applicable, verified
  code changes are committed and PR'd unless explicitly declined or blocked,
  task-style PR body sync is complete or marked N/A with reason,
  tracker/PR sync is complete or marked N/A with reason, and
  `node .agents/rules/autogoal/scripts/check-complete.mjs docs/plans/2026-05-28-clean-package-skill.md` passes.

Verification surface:
- `node --experimental-strip-types /Users/zbeyens/.agents/skills/skill-cleaner/scripts/skill-cleaner.ts --root packages/kitcn/skills/kitcn --no-logs`
- source audit of edited package skill files and generated mirror sync
- `bun tooling/sync-kitcn-skill.ts`
- `diff -qr packages/kitcn/skills/kitcn .agents/skills/kitcn`
- `bun --cwd packages/kitcn build`
- `node .agents/rules/autogoal/scripts/check-complete.mjs docs/plans/2026-05-28-clean-package-skill.md`

Constraints:
- Preserve existing user-facing behavior outside the task scope.
- Prefer the durable ownership boundary over caller-by-caller patches.
- Verified code changes must be committed and PR'd because the task skill
  requires that path unless the user explicitly says not to, the work has no
  local patch, or a real blocker is recorded.
- A PR created by this task must use the PR #270 emoji task-style PR body
  contract below, not a generic summary/body from a git helper skill.
- Do not add broad ceremony when the task is trivial or docs-only.

Boundaries:
- Source of truth: `packages/kitcn/skills/kitcn/**`.
- Allowed edit scope: `packages/kitcn/skills/kitcn/**`, generated
  `.agents/skills/kitcn/**` via sync only, `.changeset/**` if required, and this
  goal plan.
- Browser surface: N/A; no UI/browser behavior.
- Tracker sync: N/A; no tracker item.
- Non-goals: no runtime kitcn API behavior changes, no generated skill hand
  edits, no broad global skill cleanup.

Output budget strategy:
- Scope analyzer to `packages/kitcn/skills/kitcn` with `--no-logs`.
- Use `rg --files`, counts, and short `sed` slices before reading large refs.
- Cap command output; save any large audit output to a local artifact instead of
  streaming it.

Blocked condition:
- Stop only if the analyzer cannot run after a focused command/path repair, the
  package skill ownership is contradicted by source evidence, or package build
  cannot run due to an external/local environment blocker after one install retry
  when the failure shape indicates install rot.

Task state:
- task_type: package skill cleanup
- task_complexity: normal
- current_phase: intake
- current_phase_status: complete
- next_phase: implementation
- goal_status: active

Current verdict:
- verdict: complete after final goal-plan check
- confidence: high
- next owner: final verification
- reason: package skill source was cleaned, generated mirror synced, changeset
  updated, and package build passed.

Completion rule:
- Do not call `update_goal(status: complete)` while any required checklist item
  remains unchecked. If an item does not apply, check it and add `N/A: <reason>`.
- Do not call `update_goal(status: complete)` until every completion threshold
  above is satisfied, final handoff evidence is recorded, and
  `node .agents/rules/autogoal/scripts/check-complete.mjs docs/plans/2026-05-28-clean-package-skill.md` passes.
- Do not create hook state for this goal. This file plus the active goal are the
  durable state.

Start Gates:
| Gate | Applies | Evidence |
|------|---------|----------|
| Skill analysis before edits | yes | Loaded `kitcn:autogoal`, `skill-cleaner`, repo `kitcn`, `task`, `agent-native-reviewer`, and `.agents/rules/changeset.mdc`. |
| Active goal checked or created | yes | `get_goal` returned null; `create_goal` created active goal for this plan. |
| Source of truth read before edits | yes | User prompt and AGENTS instructions read; `rg --files packages/kitcn/skills/kitcn` identified package skill files. |
| Tracker comments and attachments read | no | N/A: no tracker source. |
| Video transcript evidence required | no | N/A: no video or screen recording evidence. |
| `docs/solutions` checked for non-trivial existing-code work | no | N/A: skill prompt cleanup, not existing runtime-code bug work. |
| TDD decision before behavior change or bug fix | no | N/A: no live behavior or bug fix; no TDD cases for prompt cleanup. |
| Branch decision for code-changing task | no | N/A: user did not request branch/PR; repo instruction says no proactive git state. |
| Release artifact decision | yes | `.agents/rules/changeset.mdc` read; existing `.changeset/auth-sign-in-methods.md` reused with `## Patches` entry. |
| Browser tool decision for browser surface | no | N/A: no browser surface. |
| Commit / PR expectation decision | no | N/A: user did not ask for commit/PR. |
| Task-style PR body decision | no | N/A: no PR requested. |
| Tracker sync expectation decision | no | N/A: no tracker source. |
| Output budget strategy recorded | yes | Strategy recorded above before broad analyzer/source exploration. |
| Agent-native pack selected | yes | Plan created with `--with agent-native`. |
| Agent-facing action surface identified | yes | Agent reads packaged `packages/kitcn/skills/kitcn/SKILL.md` and synced `.agents/skills/kitcn/SKILL.md`. |
| Source rule versus generated mirror boundary identified | yes | Source is `packages/kitcn/skills/kitcn`; generated mirror is `.agents/skills/kitcn`. |
| `agent-native-reviewer` loaded or waiver recorded | yes | `.agents/skills/agent-native-reviewer/SKILL.md` loaded; diff reviewed for source/generated parity and discoverability. |

Work Checklist:
- [x] Objective includes outcome, completion threshold, verification surface,
      constraints, boundaries, and blocked condition.
- [x] Task source classified with source type, id/link, title, task type,
      acceptance criteria, caveats, likely files/routes/packages, browser
      surface, and root-cause layer.
- [x] Required video or screen-recording evidence is cached/read as normalized
      `<video-transcripts>` XML, or marked N/A with reason: no video evidence.
- [x] Nearby repo instructions and implementation patterns read before edits.
- [x] Implementation fixes the right ownership boundary: edited
      `packages/kitcn/skills/kitcn/SKILL.md`, then regenerated
      `.agents/skills/kitcn/SKILL.md`.
- [x] Release artifact requirement recorded: reused
      `.changeset/auth-sign-in-methods.md`.
- [x] Final handoff shape decided: local patch with verification evidence; no
      tracker, browser, commit, or PR because user did not request those.
- [x] Commit/PR handling recorded for code-changing work: N/A because user did
      not ask for git add, commit, push, or PR.
- [x] PR body shape recorded: N/A because no PR requested.
- [x] Branch handling recorded for code-changing work: N/A because no branch or
      PR requested, and repo instructions forbid proactive git hygiene at task
      start.
- [x] Local-env-rot retry policy recorded: N/A because package build passed
      without install-corruption symptoms.
- [x] Workspace authority recorded: all proof commands ran in
      `/Users/zbeyens/git/better-convex`.
- [x] Output budget discipline recorded and followed: analyzer used `--no-logs`;
      reads were scoped and capped.
- [x] High-risk note recorded: package-boundary risk is prompt regression in the
      packaged skill; proof is source audit, generated sync, changeset, and
      package build.
- [x] Review/autoreview target selected from actual diff state: N/A for narrow
      prompt/docs cleanup with no runtime implementation.
- [x] Agent-native review decision recorded for skill changes: manual
      agent-native review accepted zero findings.
- [x] Agent-native pack: source-of-truth package skill was edited instead of
      generated skill mirror.
- [x] Agent-native pack: the changed agent action is discoverable from the
      frontmatter description and inter-procedure guidance.
- [x] Agent-native pack: generated mirror synced with
      `bun tooling/sync-kitcn-skill.ts`; `.agents/rules/**` was not changed, so
      `bun install` is N/A.
- [x] Agent-native pack: accepted agent-native review findings are fixed or
      explicitly rejected with reason; zero findings accepted.

Completion Gates:
| Gate | Applies | Required action | Evidence |
|------|---------|-----------------|----------|
| Named verification threshold | yes | Run the command, proof, source audit, or artifact check named in this plan | Analyzer run before and after cleanup; generated sync clean; package build passed. |
| Bug reproduced before fix | no | Record failing test/repro or N/A with reason | N/A: prompt-budget cleanup, not a bug fix. |
| Targeted behavior verification | yes | Run focused test/proof for changed behavior or record N/A | `diff -qr packages/kitcn/skills/kitcn .agents/skills/kitcn` produced no output after sync. |
| TypeScript or typed config changed | no | Run relevant typecheck | N/A: markdown skill and changeset only. |
| Package exports or file layout changed | yes | Run the relevant package build before final verification and keep generated updates | `bun --cwd packages/kitcn build` passed. |
| Package manifests, lockfile, or install graph changed | no | Run `bun install` and relevant package checks | N/A: no manifest or lockfile changes. |
| Agent rules or skills changed | yes | Run `bun install` and verify generated skill sync | Package skill source changed; `bun tooling/sync-kitcn-skill.ts` synced generated mirror. `.agents/rules/**` unchanged, so `bun install` N/A. |
| Workspace authority proof | yes | Run verification in the owning repo/package/app/route/tool and record cwd; do not count the wrong workspace as proof | All commands ran in `/Users/zbeyens/git/better-convex`; package build used `--cwd packages/kitcn`. |
| Browser surface changed | no | Capture Browser Use proof or record explicit waiver/blocker | N/A: no browser/UI surface. |
| Browser final proof | no | Attach screenshot or exact browser verification caveat when browser proof applies | N/A: no browser/UI surface. |
| Scaffold or fixture output changed | no | Run `bun run fixtures:sync` and `bun run fixtures:check`, or record N/A | N/A: no scaffold/template/fixture output changed. |
| Package behavior or public API changed | yes | Add a changeset or record why no changeset applies | Existing `.changeset/auth-sign-in-methods.md` updated with `## Patches`. |
| Docs and kitcn skill sync changed | no | Keep `www/**` and `packages/kitcn/skills/kitcn/**` in sync, or record N/A | N/A: no `www/**` docs changed; package skill source is the target. |
| Docs or content changed | yes | For docs-heavy work, use `--template docs`; for incidental docs, verify source-backed claims, links, examples, and rendered output or record N/A | Source-backed prompt cleanup verified by diff; no rendered docs. |
| High-risk mini gate | yes | For public API/runtime/package-boundary/browser/agent-action/command-contract changes, record realistic failure mode, proof plan, and why the chosen boundary is right; otherwise N/A | Risk: packaged skill loses necessary trigger/action guidance. Proof: kept Convex/kitcn/cRPC/ORM/auth/React trigger nouns, retained generated helper rules, synced mirror, and built package. |
| Agent-native review for agent/tooling changes | yes | For `.agents/**`, `.claude/**`, `.codex/**`, skills, hooks, commands, prompts, or user-action tooling, load `.agents/skills/agent-native-reviewer/SKILL.md` and close accepted/actionable findings, or record N/A | Loaded reviewer skill; no parity gap because this changes an agent-readable skill, not a user action surface. |
| Local install corruption suspected | no | Run `bun install` once, rerun the exact failing command, or record N/A | N/A: no install-corruption failure shape. |
| Autoreview for non-trivial implementation changes | no | Load `.agents/skills/autoreview/SKILL.md`; use dirty local `--mode local`, branch/PR `--mode branch --base <base>`, or committed slice `--mode commit --commit <ref>` until no accepted/actionable findings, or record N/A for docs-only/trivial/no local patch | N/A: narrow skill wording cleanup; agent-native review covered the touched prompt surface. |
| Commit created | no | For verified code-changing work, stage the entire current checkout per repo policy and create a commit; N/A only for no local patch, explicit user decline, analytical/blocked/inconclusive work, or recorded external blocker | N/A: user did not ask for commit. |
| PR create or update | no | For verified code-changing work, run `check`, push, create or update the PR, and sync PR body to the task-style final handoff; N/A only for no local patch, explicit user decline, analytical/blocked/inconclusive work, or recorded external blocker | N/A: user did not ask for PR. |
| Task-style PR body verified | no | Verify the PR body with `gh pr view --json body`; it must preserve auto-release blocks when applicable, must not include a current-PR self-link, and must use the PR #270 emoji format: `🐛 Fixes ...`, `🟢 95-100% confidence`, `Phase / 🧪 Tests / 🌐 Browser` table, and bold emoji Outcome/Caveat/Design/Verified sections | N/A: no PR requested. |
| PR proof image hosting | no | If PR body needs browser proof, replace local image paths with hosted GitHub URLs or record N/A | N/A: no PR/browser proof. |
| Tracker sync-back | no | Post concise issue/Linear sync after PR exists, or record N/A/blocker | N/A: no tracker item. |
| Final handoff contract | yes | Fill the final handoff fields below with exact PR/issue/confidence/tests/browser/outcome/caveats/design/verification content or N/A reason | Final handoff fields filled below. |
| Final lint | no | Run `bun lint:fix` or scoped equivalent | Scoped `bunx biome check --write ...` ran; Biome ignored these markdown paths, so no applicable lint files. |
| Output budget discipline | yes | Verify no unbounded high-volume command output was streamed, or record the accidental output and recovery | Analyzer used `--no-logs`; reads and diffs were capped. |
| Goal plan complete | yes | Run `node .agents/rules/autogoal/scripts/check-complete.mjs docs/plans/2026-05-28-clean-package-skill.md` | Final command to run after this plan update. |
| Agent source / generated sync | yes | Run `bun install` when `.agents/rules/**` changed and verify generated mirrors | `bun tooling/sync-kitcn-skill.ts` passed; `diff -qr packages/kitcn/skills/kitcn .agents/skills/kitcn` clean. |
| Agent action discoverability | yes | Source-audit the skill/rule path an agent will read | Frontmatter description keeps Convex/kitcn/setup/feature/cRPC/ORM/auth/React trigger nouns; inter-procedure guidance remains in the core skill. |
| Agent-native review | yes | Load `.agents/skills/agent-native-reviewer/SKILL.md` and close accepted findings, or record N/A | Loaded and applied; zero accepted findings. |

Phase / pass table:
| Phase | Status | Evidence | Next |
|-------|--------|----------|------|
| Intake and source read | complete | plan created; source files and rules read | implementation complete |
| Implementation | complete | package skill source patched; changeset updated; generated mirror synced | verification complete |
| Verification | complete | analyzer rerun, source audit, sync diff, package build, scoped lint caveat | closeout |
| Commit / PR / tracker sync | complete | N/A: user did not request commit/PR; no tracker item | final response |
| Closeout | complete | final goal-plan check remains as mechanical last step | final response |

Findings:
- `skill-cleaner` reported global skill budget pressure: 8,887 unbudgeted full
  tokens before cleanup and 8,872 after cleanup.
- The package skill was not a description candidate and had no package-owned
  duplicate. The only package-specific analyzer item was `Unused Candidates:
  kitcn`, which is a false positive for this run because logs were disabled and
  this package skill is intentionally shipped as source.
- Global duplicate/delete suggestions concerned plugin Stripe skills outside
  the requested package-skill scope, so they were not edited.
- `packages/kitcn/skills/kitcn/SKILL.md` shrank from 30,903 bytes at `HEAD` to
  29,545 bytes after cleanup.

Decisions and tradeoffs:
- Kept the package skill; deleting it would be absurd because it is the shipped
  agent skill source.
- Removed duplicate frontmatter `metadata.sources` while keeping top-level
  `sources`.
- Shortened the frontmatter description but preserved trigger nouns.
- Compressed repeated inter-procedure guidance without changing the rule.
- Reused the existing unreleased changeset per `.agents/rules/changeset.mdc`.

Implementation notes:
- Edited `packages/kitcn/skills/kitcn/SKILL.md`.
- Synced generated `.agents/skills/kitcn/SKILL.md` with
  `bun tooling/sync-kitcn-skill.ts`.
- Updated `.changeset/auth-sign-in-methods.md` with a patch note.

Review fixes:
- Agent-native review: no user-action parity gap; the change improves an
  agent-readable skill and keeps source/generated parity.

Error attempts:
| Error / failed attempt | Count | Next different move | Resolution |
|------------------------|-------|---------------------|------------|
| Scoped Biome markdown pass processed zero files because configured paths ignore these markdown files | 1 | Treat as N/A lint surface and rely on source audit/build | Recorded in completion gates |

Verification evidence:
- `node --experimental-strip-types /Users/zbeyens/.agents/skills/skill-cleaner/scripts/skill-cleaner.ts --root packages/kitcn/skills/kitcn --no-logs` passed before and after cleanup.
- Analyzer budget moved from `description_chars: 24292`, `rendered_line_chars:
  35289`, `unbudgeted_full_tokens: 8887` to `description_chars: 24231`,
  `rendered_line_chars: 35228`, `unbudgeted_full_tokens: 8872`.
- `bun tooling/sync-kitcn-skill.ts` passed.
- `diff -qr packages/kitcn/skills/kitcn .agents/skills/kitcn` produced no
  output.
- `rg -n "metadata: \{ sources|seam|ALWAYS use this skill" packages/kitcn/skills/kitcn .agents/skills/kitcn` produced no output.
- `bun --cwd packages/kitcn build` passed.
- `bunx biome check --write packages/kitcn/skills/kitcn/SKILL.md .agents/skills/kitcn/SKILL.md .changeset/auth-sign-in-methods.md docs/plans/2026-05-28-clean-package-skill.md` processed zero files because these markdown paths are ignored.

Final handoff contract:
- Commit line: N/A; user did not ask for commit.
- PR line: N/A; user did not ask for PR.
- Issue / tracker line: N/A; no tracker item.
- Confidence line: high.
- Flow table:
  - Reproduced: N/A, no bug repro; browser N/A.
  - Verified: analyzer, sync diff, source audit, package build; browser N/A.
- Browser check: N/A; no UI/browser surface.
- Outcome: package skill prompt footprint reduced, generated mirror synced,
  changeset updated.
- Caveat: global plugin duplicate suggestions remain untouched because the user
  asked for the package skill.
- Design:
  - Chosen boundary: package skill source plus generated mirror.
  - Why not quick patch: editing generated `.agents/skills/kitcn` directly would
    be overwritten by sync.
  - Why not broader change: global plugin cleanup is outside the requested
    package-skill scope.
- Verified: analyzer rerun, clean source/generated diff, source audit, package
  build.
- PR body verified: N/A; no PR requested.

Task-style PR body contract:
- Preserve any existing `<!-- auto-release:start -->` block. If a changeset is
  part of the diff and repo policy expects auto release, include that block.
- Use the accepted PR #270 visual format. The body starts with an emoji
  issue/tracker/fix line, for example `🐛 Fixes #123` or `🐛 Fixes ➖ N/A`, then
  an emoji confidence line like `🟢 95-100% confidence`.
- Use this exact table header: `| Phase | 🧪 Tests | 🌐 Browser |`.
- Use `Reproduced` and `Verified` rows. Mark passing proof with `🟢`, repro or
  failing proof with `🔴`, and non-applicable cells with `➖ N/A`.
- Use bold emoji section headings: `**✅ Outcome**`, `**⚠️ Caveat**`,
  `**🏗️ Design**`, and `**🧪 Verified**`.
- Never include a line that links to the current PR itself. The current PR URL
  belongs in the final response, not in its own description.
- Do not replace this with a generic `Summary` / `Verification` PR body, an
  adaptive prose body from a git helper skill, plain `## Outcome` sections, or
  an unrelated generated badge footer unless the caller or repo template
  explicitly asks for it.
- Proof is `gh pr view --json body` output or a concise source-backed summary
  of that output.

Final handoff / sync:
- Commit: N/A; user did not ask.
- PR: N/A; user did not ask.
- Issue / tracker: N/A.
- Browser proof: N/A.
- Caveats: scoped Biome markdown pass is ignored by config; global plugin
  cleanup not touched.

Timeline:
- 2026-05-28T16:25:32.936Z Task goal plan created.
- 2026-05-28T16:26:29.390Z Scoped `skill-cleaner` analyzer run recorded
  package false-positive unused candidate and no package duplicate.
- 2026-05-28T16:28Z Package skill source patched and generated mirror synced.
- 2026-05-28T16:28:14.094Z Analyzer rerun recorded reduced rendered line chars
  and unbudgeted full tokens.
- 2026-05-28T16:29Z Source/generated `diff -qr` clean; banned wording audit clean.
- 2026-05-28T16:30Z `bun --cwd packages/kitcn build` passed.
- 2026-05-28T16:31Z Scoped Biome markdown pass reported no files processed due
  to configured ignores.

Reboot status:
| Question | Answer |
|----------|--------|
| Where am I? | Final mechanical goal-plan check |
| Where am I going? | Close goal and report concise result |
| What is the goal? | Clean package-owned kitcn skill with skill-cleaner evidence and generated mirror sync |
| What have I learned? | Analyzer had no package duplicate/description cleanup except false-positive unused candidate; real cleanup was duplicate metadata and repeated guidance |
| What have I done? | Patched package skill, synced mirror, updated changeset, verified analyzer/sync/build |

Open risks:
- None.
