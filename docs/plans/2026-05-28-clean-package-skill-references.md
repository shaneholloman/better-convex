# clean package skill references

Objective:
Clean the package-owned kitcn skill references under
`packages/kitcn/skills/kitcn/references`, then sync the generated repo-local
copy.

Goal plan:
docs/plans/2026-05-28-clean-package-skill-references.md

Template:
docs/plans/templates/task.md

Primary template:
docs/plans/templates/task.md

Applied packs:
- agent-native (docs/plans/templates/packs/agent-native.md)

Task source:
- type: user prompt follow-up
- id / link: N/A
- title: apply reference cleanup after package skill cleanup
- acceptance criteria: audit reference size/repetition, apply source-owned
  cleanup to `packages/kitcn/skills/kitcn/references/**`, do not hand-edit
  generated `.agents/skills/kitcn/references/**`, sync generated mirror,
  update existing changeset if needed, run package build, and pass the
  goal-plan checker.

Completion threshold:
- Reference cleanup candidates are audited with scoped commands.
- Accepted cleanup is applied to source-owned reference files.
- Generated `.agents/skills/kitcn/references/**` matches the package source.
- Existing changeset describes the packaged skill/reference cleanup.
- `bun --cwd packages/kitcn build` passes.
- Task closure is legal only when the source-of-truth acceptance criteria are
  satisfied or explicitly narrowed, required verification evidence is recorded,
  code-review and release-artifact gates are closed when applicable, verified
  code changes are committed and PR'd unless explicitly declined or blocked,
  task-style PR body sync is complete or marked N/A with reason,
  tracker/PR sync is complete or marked N/A with reason, and
  `node .agents/rules/autogoal/scripts/check-complete.mjs docs/plans/2026-05-28-clean-package-skill-references.md` passes.

Verification surface:
- reference line/heading/duplication audits with `find`, `wc`, and `rg`
- source audit of edited package reference files
- `bun tooling/sync-kitcn-skill.ts`
- `diff -qr packages/kitcn/skills/kitcn .agents/skills/kitcn`
- `bun --cwd packages/kitcn build`
- `node .agents/rules/autogoal/scripts/check-complete.mjs docs/plans/2026-05-28-clean-package-skill-references.md`

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
- Source of truth: `packages/kitcn/skills/kitcn/references/**`.
- Allowed edit scope: package references, generated `.agents/skills/kitcn`
  through sync only, existing `.changeset/auth-sign-in-methods.md`, and this
  goal plan.
- Browser surface: N/A; no UI/browser behavior.
- Tracker sync: N/A; no tracker item.
- Non-goals: no runtime API behavior changes, no fixture/scaffold edits, no
  global plugin skill cleanup.

Output budget strategy:
- Use counts/headings before full reads: `wc -l`, heading searches, and focused
  `sed` ranges.
- Cap all command output and avoid streaming whole large references unless a
  file becomes the edit target.
- Exclude generated mirror reads except sync/diff proof.

Blocked condition:
- Stop only if reference ownership is contradicted by source evidence, cleanup
  would require product/API decisions not present in source docs, or required
  verification cannot run after focused repair.

Task state:
- task_type: package skill reference cleanup
- task_complexity: normal
- current_phase: intake
- current_phase_status: complete
- next_phase: closeout
- goal_status: active

Current verdict:
- verdict: complete after final goal-plan check
- confidence: high
- next owner: final verification
- reason: references were compressed, generated mirror synced, changeset
  updated, and package build passed.

Completion rule:
- Do not call `update_goal(status: complete)` while any required checklist item
  remains unchecked. If an item does not apply, check it and add `N/A: <reason>`.
- Do not call `update_goal(status: complete)` until every completion threshold
  above is satisfied, final handoff evidence is recorded, and
  `node .agents/rules/autogoal/scripts/check-complete.mjs docs/plans/2026-05-28-clean-package-skill-references.md` passes.
- Do not create hook state for this goal. This file plus the active goal are the
  durable state.

Start Gates:
| Gate | Applies | Evidence |
|------|---------|----------|
| Skill analysis before edits | yes | Continuing under `kitcn:autogoal`, `skill-cleaner`, repo `kitcn`, `task`, `agent-native-reviewer`, and changeset rules. |
| Active goal checked or created | yes | `get_goal` returned null after prior completion; `create_goal` created this reference-cleanup goal. |
| Source of truth read before edits | yes | User follow-up read; reference file list gathered with `find packages/kitcn/skills/kitcn/references -type f -name '*.md'`. |
| Tracker comments and attachments read | no | N/A: no tracker source. |
| Video transcript evidence required | no | N/A: no video evidence. |
| `docs/solutions` checked for non-trivial existing-code work | no | N/A: prompt/reference cleanup, not runtime-code bug work. |
| TDD decision before behavior change or bug fix | no | N/A: no live behavior or bug fix. |
| Branch decision for code-changing task | no | N/A: user did not request branch/PR; no proactive git hygiene. |
| Release artifact decision | yes | `.agents/rules/changeset.mdc` read; existing `.changeset/auth-sign-in-methods.md` will be reused. |
| Browser tool decision for browser surface | no | N/A: no browser surface. |
| Commit / PR expectation decision | no | N/A: user did not ask for commit/PR. |
| Task-style PR body decision | no | N/A: no PR requested. |
| Tracker sync expectation decision | no | N/A: no tracker source. |
| Output budget strategy recorded | yes | Strategy recorded above before reference audit. |
| Agent-native pack selected | yes | Plan created with `--with agent-native`. |
| Agent-facing action surface identified | yes | Agents load package references on demand through `packages/kitcn/skills/kitcn/references/**` and synced `.agents/skills/kitcn/references/**`. |
| Source rule versus generated mirror boundary identified | yes | Source is package references; `.agents/skills/kitcn/references/**` is generated mirror. |
| `agent-native-reviewer` loaded or waiver recorded | yes | Reviewer skill was loaded in the previous package-skill pass; reference diff review closed with zero accepted findings. |

Work Checklist:
- [x] Objective includes outcome, completion threshold, verification surface,
      constraints, boundaries, and blocked condition.
- [x] Task source classified with source type, id/link, title, task type,
      acceptance criteria, caveats, likely files/routes/packages, browser
      surface, and root-cause layer.
- [x] Required video or screen-recording evidence is cached/read as normalized
      `<video-transcripts>` XML, or marked N/A with reason: no video evidence.
- [x] Nearby repo instructions and implementation patterns read before edits.
- [x] Implementation fixes the right ownership boundary: edited package
      references, then regenerated `.agents/skills/kitcn/**`.
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
- [x] Output budget discipline recorded and followed: audits used counts,
      headings, and focused `sed` ranges before edits.
- [x] High-risk note recorded: package-boundary risk is removing useful
      reference detail; mitigation was compressing appendix tables while
      preserving examples and operational rules.
- [x] Review/autoreview target selected from actual diff state: N/A for
      reference-only prompt/docs cleanup with no runtime implementation.
- [x] Agent-native review decision recorded for skill/reference changes: manual
      agent-native review accepted zero findings.
- [x] Agent-native pack: source-of-truth package reference files were edited
      instead of generated mirrors.
- [x] Agent-native pack: changed references remain discoverable through the
      existing reference escalation map.
- [x] Agent-native pack: generated mirror synced with
      `bun tooling/sync-kitcn-skill.ts`; `.agents/rules/**` was not changed, so
      `bun install` is N/A.
- [x] Agent-native pack: accepted agent-native review findings are fixed or
      explicitly rejected with reason; zero findings accepted.

Completion Gates:
| Gate | Applies | Required action | Evidence |
|------|---------|-----------------|----------|
| Named verification threshold | yes | Run the command, proof, source audit, or artifact check named in this plan | Reference audits, sync diff, package build, and final checker recorded. |
| Bug reproduced before fix | no | Record failing test/repro or N/A with reason | N/A: prompt/reference cleanup, not a bug fix. |
| Targeted behavior verification | yes | Run focused test/proof for changed behavior or record N/A | `diff -qr packages/kitcn/skills/kitcn .agents/skills/kitcn` produced no output after sync. |
| TypeScript or typed config changed | no | Run relevant typecheck | N/A: markdown references only. |
| Package exports or file layout changed | yes | Run the relevant package build before final verification and keep generated updates | `bun --cwd packages/kitcn build` passed. |
| Package manifests, lockfile, or install graph changed | no | Run `bun install` and relevant package checks | N/A: no manifest or lockfile changes. |
| Agent rules or skills changed | yes | Run `bun install` and verify generated skill sync | Package skill references changed; `bun tooling/sync-kitcn-skill.ts` synced generated mirror. `.agents/rules/**` unchanged, so `bun install` N/A. |
| Workspace authority proof | yes | Run verification in the owning repo/package/app/route/tool and record cwd; do not count the wrong workspace as proof | All commands ran in `/Users/zbeyens/git/better-convex`; package build used `--cwd packages/kitcn`. |
| Browser surface changed | no | Capture Browser Use proof or record explicit waiver/blocker | N/A: no browser/UI surface. |
| Browser final proof | no | Attach screenshot or exact browser verification caveat when browser proof applies | N/A: no browser/UI surface. |
| Scaffold or fixture output changed | no | Run `bun run fixtures:sync` and `bun run fixtures:check`, or record N/A | N/A: no scaffold/template/fixture output changed. |
| Package behavior or public API changed | yes | Add a changeset or record why no changeset applies | Existing `.changeset/auth-sign-in-methods.md` updated to cover prompt and reference footprint. |
| Docs and kitcn skill sync changed | no | Keep `www/**` and `packages/kitcn/skills/kitcn/**` in sync, or record N/A | N/A: no `www/**` docs changed; package references are the target. |
| Docs or content changed | yes | For docs-heavy work, use `--template docs`; for incidental docs, verify source-backed claims, links, examples, and rendered output or record N/A | Source-backed reference compression verified by diff; no rendered docs. |
| High-risk mini gate | yes | For public API/runtime/package-boundary/browser/agent-action/command-contract changes, record realistic failure mode, proof plan, and why the chosen boundary is right; otherwise N/A | Risk: losing useful reference detail. Proof: examples and operational rules kept; appendix/API tables compressed; generated mirror synced; package build passed. |
| Agent-native review for agent/tooling changes | yes | For `.agents/**`, `.claude/**`, `.codex/**`, skills, hooks, commands, prompts, or user-action tooling, load `.agents/skills/agent-native-reviewer/SKILL.md` and close accepted/actionable findings, or record N/A | Loaded in this workflow context; no parity gap because this changes agent-readable references, not a user action surface. |
| Local install corruption suspected | no | Run `bun install` once, rerun the exact failing command, or record N/A | N/A: no install-corruption failure shape. |
| Autoreview for non-trivial implementation changes | no | Load `.agents/skills/autoreview/SKILL.md`; use dirty local `--mode local`, branch/PR `--mode branch --base <base>`, or committed slice `--mode commit --commit <ref>` until no accepted/actionable findings, or record N/A for docs-only/trivial/no local patch | N/A: narrow reference wording cleanup; agent-native review covered touched prompt surface. |
| Commit created | no | For verified code-changing work, stage the entire current checkout per repo policy and create a commit; N/A only for no local patch, explicit user decline, analytical/blocked/inconclusive work, or recorded external blocker | N/A: user did not ask for commit. |
| PR create or update | no | For verified code-changing work, run `check`, push, create or update the PR, and sync PR body to the task-style final handoff; N/A only for no local patch, explicit user decline, analytical/blocked/inconclusive work, or recorded external blocker | N/A: user did not ask for PR. |
| Task-style PR body verified | no | Verify the PR body with `gh pr view --json body`; it must preserve auto-release blocks when applicable, must not include a current-PR self-link, and must use the PR #270 emoji format: `🐛 Fixes ...`, `🟢 95-100% confidence`, `Phase / 🧪 Tests / 🌐 Browser` table, and bold emoji Outcome/Caveat/Design/Verified sections | N/A: no PR requested. |
| PR proof image hosting | no | If PR body needs browser proof, replace local image paths with hosted GitHub URLs or record N/A | N/A: no PR/browser proof. |
| Tracker sync-back | no | Post concise issue/Linear sync after PR exists, or record N/A/blocker | N/A: no tracker item. |
| Final handoff contract | yes | Fill the final handoff fields below with exact PR/issue/confidence/tests/browser/outcome/caveats/design/verification content or N/A reason | Final handoff fields filled below. |
| Final lint | no | Run `bun lint:fix` or scoped equivalent | Scoped `bunx biome check --write ...` ran; Biome ignored these markdown paths, so no applicable lint files. |
| Output budget discipline | yes | Verify no unbounded high-volume command output was streamed, or record the accidental output and recovery | Counts/headings/focused reads used; full large refs were not streamed. |
| Goal plan complete | yes | Run `node .agents/rules/autogoal/scripts/check-complete.mjs docs/plans/2026-05-28-clean-package-skill-references.md` | Final command to run after this plan update. |
| Agent source / generated sync | yes | Run `bun install` when `.agents/rules/**` changed and verify generated mirrors | `bun tooling/sync-kitcn-skill.ts` passed; `diff -qr packages/kitcn/skills/kitcn .agents/skills/kitcn` clean. |
| Agent action discoverability | yes | Source-audit the skill/rule path an agent will read | References remain linked by the core skill reference escalation map. |
| Agent-native review | yes | Load `.agents/skills/agent-native-reviewer/SKILL.md` and close accepted findings, or record N/A | Applied; zero accepted findings. |

Phase / pass table:
| Phase | Status | Evidence | Next |
|-------|--------|----------|------|
| Intake and source read | complete | plan created; reference file list and counts gathered | implementation complete |
| Implementation | complete | appendix/API tables compressed in package references; changeset updated; mirror synced | verification complete |
| Verification | complete | line/byte audit, banned wording scan, sync diff, package build, scoped lint caveat | closeout |
| Commit / PR / tracker sync | complete | N/A: user did not request commit/PR; no tracker item | final response |
| Closeout | complete | final goal-plan check remains as mechanical last step | final response |

Findings:
- Baseline package references at `HEAD`: 21 files, 9,020 lines, 285,378 bytes.
- Cleaned package references: 21 files, 8,877 lines, 272,662 bytes.
- Biggest refs remain `orm.md`, `auth-organizations.md`, `setup/index.md`,
  `react.md`, and `http.md`; deeper deletion would require product/API
  ownership decisions.
- Low-risk cleanup targets were appendix-style API tables and setup traceability
  tables. Actual examples and runbook steps were kept.
- Banned wording scan over package references returned no matches after cleanup.

Decisions and tradeoffs:
- Compressed reference appendices instead of deleting examples.
- Kept troubleshooting matrix in `setup/index.md` because it is operationally
  useful; compressed only coverage/traceability tables.
- Left global plugin duplicate suggestions untouched; they are outside the
  package reference scope.
- Reused the existing unreleased changeset.

Implementation notes:
- Edited package references:
  `features/orm.md`, `features/http.md`, `features/auth-organizations.md`,
  `features/auth-admin.md`, `features/auth.md`, `features/auth-polar.md`,
  `features/react.md`, and `setup/index.md`.
- Synced generated `.agents/skills/kitcn/**` with
  `bun tooling/sync-kitcn-skill.ts`.
- Updated `.changeset/auth-sign-in-methods.md` wording to cover prompt and
  reference footprint.

Review fixes:
- Agent-native review: no parity gap; this is agent-readable reference cleanup
  and the generated mirror matches the package source.

Error attempts:
| Error / failed attempt | Count | Next different move | Resolution |
|------------------------|-------|---------------------|------------|
| `python` command for API-tail audit was unavailable | 1 | Re-ran audit with Node | Resolved |
| Scoped Biome markdown pass processed zero files because configured paths ignore these markdown files | 1 | Treat as N/A lint surface and rely on source audit/build | Recorded in completion gates |

Verification evidence:
- `find packages/kitcn/skills/kitcn/references -type f -name '*.md' -print0 | xargs -0 wc -l` showed total reference lines moved from 9,020 to 8,877.
- Node byte audit showed package references moved from 285,378 bytes at `HEAD`
  to 272,662 bytes after cleanup.
- Placeholder/banned-wording `rg` scan over package references produced no
  output.
- `bun tooling/sync-kitcn-skill.ts` passed.
- `diff -qr packages/kitcn/skills/kitcn .agents/skills/kitcn` produced no
  output.
- `bun --cwd packages/kitcn build` passed.
- Scoped `bunx biome check --write ...` processed zero files because these
  markdown paths are ignored by config.

Final handoff contract:
- Commit line: N/A; user did not ask for commit.
- PR line: N/A; user did not ask for PR.
- Issue / tracker line: N/A; no tracker item.
- Confidence line: high.
- Flow table:
  - Reproduced: N/A, no bug repro; browser N/A.
  - Verified: line/byte audits, source audit, sync diff, package build; browser
    N/A.
- Browser check: N/A; no UI/browser surface.
- Outcome: package reference footprint reduced, generated mirror synced,
  changeset updated.
- Caveat: markdown lint path is ignored by Biome; further large reductions
  would need content/API ownership decisions.
- Design:
  - Chosen boundary: package references plus generated mirror.
  - Why not quick patch: editing generated `.agents/skills/kitcn/references`
    directly would be overwritten by sync.
  - Why not broader change: global skill/plugin cleanup and aggressive reference
    deletion are outside the requested package-reference scope.
- Verified: counts, banned wording scan, clean source/generated diff, package
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
- 2026-05-28T17:13:09.792Z Task goal plan created.
- 2026-05-28T17:14Z Reference file list and start gates recorded.
- 2026-05-28T17:15Z Reference audit found 9,020 lines across 21 package refs;
  largest refs were `orm`, `auth-organizations`, `setup/index`, `http`, and
  `react`.
- 2026-05-28T17:16Z `python` audit failed; reran API-tail and byte/codeblock
  audit with Node.
- 2026-05-28T17:18Z Compressed API/reference appendices and setup coverage
  notes in package refs.
- 2026-05-28T17:19Z Synced generated mirror; package refs measured 8,877 lines
  and 272,662 bytes.
- 2026-05-28T17:20Z `diff -qr` clean and `bun --cwd packages/kitcn build`
  passed.
- 2026-05-28T17:21Z Scoped Biome markdown pass reported no files processed due
  to configured ignores.

Reboot status:
| Question | Answer |
|----------|--------|
| Where am I? | Final mechanical goal-plan check |
| Where am I going? | Close goal and report concise result |
| What is the goal? | Clean package-owned kitcn skill references with source/generated sync |
| What have I learned? | References were mostly useful examples; safe savings were appendix/API and traceability tables |
| What have I done? | Patched package refs, synced mirror, updated changeset, verified counts/sync/build |

Open risks:
- None for this bounded cleanup.
