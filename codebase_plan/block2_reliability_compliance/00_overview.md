# Block 2: reliability and compliance

## Goal

Fix the problems that threaten user data and block publishing. The owner rates this block as the most important. It starts only after the owner validates Block 1.

## Scope

- A guarded, race-free startup and clean unload.
- A metadata access layer in front of `.TagNodeMeta` (same folder name, same file structure).
- An operation queue replacing the boolean lock.
- A `TreeRoot` mutation API so the orchestrator stops reaching into raw collections.
- Correct, debounced external-sync handling.
- Compound operations that cannot leave a file untagged or a folder half-moved, designed so a crash-recovery journal can be added later.
- Obsidian API compliance and release readiness.
- Every finding of the Obsidian validator bot, tracked in `codebase_plan/00b_validator_findings_traceability.md`, with a scanner-equivalent lint gate (task 09).

## Rules

- Behavior changes are allowed here, but each must be listed in the task and approved.
- Keep the storage format and `.TagNodeMeta` folder name unchanged. Old contents are throwaway test data.
- Keep the YAML key format unchanged (`🏷-Legend-<color>`, `🏠/<tagPath>`, `🔒/ <tagPath>`).
- Do not split the orchestrator in this block (Block 3 task 01).
- Rollback journal is deferred (owner: decide later), but the final goal is crash and interruption recovery without corrupting data or state. Task 06 must be journal-ready.

## Tasks in order

| # | Task | File |
|---|---|---|
| 01 | Startup and lifecycle | `01_startup_and_lifecycle.md` |
| 02 | Metadata access layer | `02_metadata_access_layer.md` |
| 03 | Operation queue | `03_operation_queue.md` |
| 04 | TreeRoot mutation API | `04_treeroot_mutation_api.md` |
| 05 | Sync handlers | `05_sync_handlers.md` |
| 06 | Atomic compound operations | `06_atomic_compound_operations.md` |
| 07 | Obsidian API compliance | `07_obsidian_api_compliance.md` |
| 08 | Release readiness | `08_release_readiness.md` |
| 09 | Validator findings sweep and scanner gate | `09_validator_findings_sweep.md` |

## Dependencies

- 01 needs Block 1 tasks 05 and 08.
- 02 needs Block 1 task 06.
- 03 needs Block 1 tasks 05 and 06.
- 04 needs 03. 05 needs 03 and 04.
- 06 needs 02 and 03.
- 07 needs Block 1 task 06 (result type).
- 08 needs Block 1 tasks 02 and 08.
- 07 and 08 are otherwise independent and can run in parallel with 01 to 06.
- 09 needs 02, 03, 05 and 07 (filesystem and promise findings are fixed there first). 09 runs last. Its typing group is closed by Block 3 task 07.

## Exit criteria

- Restarting Obsidian with an explorer tab open works. Enabling and disabling the plugin repeatedly leaves nothing behind.
- No `fs`, `path`, or Node `crypto` imports remain. Folder metadata and empty folders survive restart.
- A stuck-lock state is impossible. Rapid actions run in order.
- Typing in a note does not trigger a tree broadcast unless its tags changed.
- Forced failure at each step of a compound operation leaves no untagged file and no half-moved folder.
- Failures show a `Notice`. Nothing writes to a hardcoded path.
- A tag produces a release with `main.js`, `manifest.json`, `styles.css`, each with an attestation, and the release manifest is identical to the repository manifest.
- `npm run lint:scanner` and `npm run lint:meta` report 0 findings, except the typing group (`no-unsafe-*`, `no-explicit-any`), which Block 3 task 07 closes.

## Hand-off

Stop and wait for the owner to validate before Block 3 starts.
