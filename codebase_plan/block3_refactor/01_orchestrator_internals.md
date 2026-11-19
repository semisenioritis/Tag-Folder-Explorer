# Task 01: orchestrator internals

## Affects

`orchestrator.ts` (7,305 lines, 70 methods). Public method names and signatures stay.

## Deviation

**D1:** the orchestrator stays the coordinator and the only public write entry, but implementations move into feature modules under it: file operations, folder operations, status attributes (legend, pin, bookmark), clipboard, external sync.

## What it does

- The legend, pin and bookmark families (about 60% of the file: 3254-6626) become one generic implementation with two backends: note YAML for files, the metadata store for folders. They differ mainly by key name (`🏷-Legend-<color>`, pinned, bookmark) and by backing store.
- File and folder CRUD (create, rename, move, copy, remove, duplicate, recreate) move to their own modules, built on the step lists from Block 2 task 06.
- External sync handlers move to their own module.
- Utilities (`toHashtagSafe`, `toSafeFileName`) are already in the shared sanitizing module from Block 1.
- Modal triggers are handled in task 02.
- `fileEditor.metadata*` delegation (deviation D5) is replaced by direct use of the metadata store.

## Risks and consequences

- **The YAML format is persistent user data.** Keys like `🏷-Legend-<color>` and values `🏠/<tagPath>`, `🔒/ <tagPath>` (space after the slash). Any change corrupts or orphans existing notes. Use golden tests comparing frontmatter before and after.
- Largest diff and highest risk, so it starts only after Block 2 tasks 02 and 03.
- **Verify:** about 6,500 lines were only sampled during analysis. Read the middle of the file in full before starting.
- The `owner` parameter pattern must be gone by now (queue). Composite operations call internal functions.

## Done when

`orchestrator.ts` is a thin coordinator. Behavior is unchanged per the smoke checklist and golden tests.
