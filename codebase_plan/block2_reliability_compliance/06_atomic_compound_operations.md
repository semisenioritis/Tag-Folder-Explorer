# Task 06: atomic compound operations

## Affects

`moveFileToFolder`, `hardDeleteFile`, `moveFolderToFolder`, `renameFolder`, `removeFolderFromFolder`, `duplicateFolder`, `recreateFolder`, `pasteFilesAndFolders`, `writeToRollbackRegister`, and the rollback design files.

## Owner goal

A system powerful enough to roll back from crashes and interruptions without corrupting actual data or state. The owner said "decide later" on the journal. This task ships reorder-and-compensate and makes every operation **journal-ready**, so the journal can be added later without rework (Block 3 task 06).

## Problems being fixed

- `moveFileToFolder` (1724-1892): removes the source tag first. A failure of `removeTagFromFileYaml` is only `console.warn`ed and the operation continues. Legend and pin cleanup ignores return values. If `addTagToFileYaml` then fails, the file has no tag. If `updateMeta` for the destination fails after the YAML change, the same partial state remains.
- `hardDeleteFile` (1282-1383): trashes the file first. `filePathMap.delete` runs before `updateMeta` in a loop that can fail, leaving the tree half-updated.
- Folder operations do per-file YAML edits sequentially. A failure at file 400 of 500 leaves a mixed state.
- `updateMeta` failures return failure after earlier steps already ran, with no undo.

## What it does

- **Reorder:** add the destination tag first, then remove the source tag, so a failure never leaves a file with no tag.
- **Explicit steps with before-images:** each operation is a list of steps. Before touching a note, snapshot its frontmatter. Before touching folder metadata, snapshot that JSON (through the metadata layer from task 02). Update the in-memory tree only after all physical steps succeed.
- **Compensate:** on failure, undo completed steps in reverse order. Report clearly if the undo itself fails.
- Keep the "physical edits, virtual edits, broadcast" ordering.
- Keep the sample register files (moved to `docs/design/` in Block 1) and the `🔴 write action` markers. Fix the facts: path from `manifest.dir` (not hardcoded), one JSON object per line.

## Journal-ready design (so crash recovery can be added later)

- Every step has a name, a target, and a before-image.
- The step list can be written to disk before execution and removed after commit.
- On startup, a leftover journal means an interrupted operation that can be replayed or rolled back.

## Risks and consequences

- Rollback can fail too. Define what is reported.
- Folder operations edit one note per file. 399 reversals for a failure at file 400 is slow and can itself be interrupted.
- The user may edit a note mid-operation. `processFrontMatter` is atomic per file, but the whole operation is not.
- The sample register files and the code disagree today (multi-line JSON vs one line per record; timestamp in seconds vs ISO strings).
- Depends on task 02 (folder metadata snapshots) and task 03 (queue, so nothing interleaves).

## Done when

Forced failure at each step leaves no file untagged and no half-moved folder.
