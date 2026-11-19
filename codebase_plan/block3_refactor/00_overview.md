# Block 3: refactor

## Goal

Restructure the large files and layers now that Block 2's queue and metadata layer exist. Each task needs its own detailed plan and owner approval before it starts.

## Rules

- Analysis first, then code, one task at a time.
- The orchestrator stays the coordinator. Its public methods keep their names and signatures during task 01.
- The controller stays the only UI write entry. Its 35 UI-unused methods are intended API and stay.
- The YAML format on user notes is persistent data. Golden tests must show it is unchanged.
- Deviations from the owner's vision are flagged per task (D1, D2, D6, D7, D8, D9 in the master document).

## Tasks

| # | Task | File | Needs |
|---|---|---|---|
| 01 | Orchestrator internals | `01_orchestrator_internals.md` | Block 2 tasks 02, 03 |
| 02 | Controller and model | `02_controller_and_model.md` | 01 |
| 03 | Core object files | `03_core_object_files.md` | Block 2 task 02 |
| 04 | Svelte and shared tree state | `04_svelte_and_shared_tree_state.md` | Block 1 task 07 |
| 05 | Commented-out feature review | `05_commented_out_feature_review.md` | none |
| 06 | Rollback journal (future) | `06_rollback_journal_future.md` | Block 2 task 06 |

## Exit criteria

Per task, as written in each file. The owner validates each before the next.
