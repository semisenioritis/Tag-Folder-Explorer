# Block 1: clean baseline

## Goal

A low-risk, no-behavior-change cleanup that leaves a clean, verifiable base. The owner validates the result before Block 2 starts.

## Rules

- No behavior change. Anything that would change behavior (queueing, debounce, storage, lifecycle) is Block 2.
- Compare every task against the Task 01 baseline (build, svelte-check, warnings, bundle size, console call count, smoke checklist).
- One commit per task. Layout moves (task 08) go last in their own commit.
- Do not touch lock logic, storage format, or YAML key format.
- Leave commented-out feature code in place (owner decision). Only commented debug logs, test handlers and genuinely dead code are removed.
- Keep design-note comments (sync handler pseudocode, `🔴 write action` markers). They belong to the unfinished rollback work.
- Strict TypeScript flags: enable only if the change is small. Otherwise list in `docs/strictness-backlog.md`.

## Tasks in order

| # | Task | File |
|---|---|---|
| 01 | Baseline and safety net | `01_baseline_and_safety_net.md` |
| 02 | Repo and tooling hygiene | `02_repo_and_tooling_hygiene.md` |
| 03 | Dead code removal | `03_dead_code_removal.md` |
| 04 | Central logger | `04_central_logger.md` |
| 05 | Layer decoupling | `05_layer_decoupling.md` |
| 06 | Backend de-duplication | `06_backend_deduplication.md` |
| 07 | Frontend de-duplication and CSS prefix | `07_frontend_dedup_and_css_prefix.md` |
| 08 | Folder layout and naming | `08_folder_layout_and_naming.md` |

Dependencies: 01 -> 02 -> 03 -> (04, 05, 06, 07 in parallel where possible) -> 08. Task 07 is independent of 05 and 06.

## Exit criteria

- `npm run build` runs `tsc`, `svelte-check` and esbuild, and passes with no more errors or warnings than the baseline.
- Bundle size is not larger than baseline.
- Cycle check reports 0 cycles.
- `console.*` is silent in normal use (debug logging is a setting, default off).
- The smoke checklist passes in the owner's vault.
- `docs/block1-report.md` lists what changed per task, the backlog files, and the checklist results.

## Hand-off

Stop after the report and wait for the owner to validate. Do not start Block 2 without approval.
