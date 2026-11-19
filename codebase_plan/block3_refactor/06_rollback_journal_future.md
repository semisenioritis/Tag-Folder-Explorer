# Task 06: rollback journal (future, decide later)

## Owner statement

The owner said "decide later", but the vision is a system powerful enough to roll back from crashes and interruptions without corrupting actual data or state.

## Starting point

- `Orchestrator.writeToRollbackRegister` exists and is never called. Hardcoded path `.obsidian/plugins/Tag-Folder-Explorer/rollback-register.ndjson`.
- `🔴 write action divider / start / plan / step pre / step post` markers are placed in `createFileInTagFolder` and others.
- `docs/design/sampleRollbackRegister.json` and `.ndjson` are design sketches: an action list with `starTime` (typo), `endTime`, `action_divider` and `action_end` records. The sample is pretty-printed multi-line JSON, while the writer writes one line per record. The sample timestamp is in seconds, code elsewhere uses ISO strings.

## What it would add

- Before an operation runs, write its step plan (name, target, before-image) to disk.
- After commit, mark it done. After rollback, mark it rolled back.
- On startup, a leftover plan means an interrupted operation. Roll it back or replay it, then rebuild the tree.
- Journal location from `manifest.dir`, `normalizePath`, one JSON object per line, ISO timestamps.

## Prerequisites (Block 2)

- Task 02: metadata layer, for folder-state before-images.
- Task 03: queue, so operations never interleave.
- Task 06: explicit steps with before-images and compensation.

## Risks and consequences

- Crash recovery is its own feature with its own testing.
- Recovery after a crash can run while the user already edits notes. Define conflict rules.
- Folder operations touch many notes. The journal must be written before the first edit and be cheap enough to do so.
- Write the journal atomically (temp file and rename), or the journal itself can corrupt.

## Done when

An interrupted operation (simulated by killing the app mid-run) is recovered on the next start with no data lost and no corrupted state.
