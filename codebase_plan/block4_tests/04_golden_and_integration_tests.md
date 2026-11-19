# Task 04: golden and integration tests

## Golden tests (note YAML format)

- Run the legend, pin and bookmark operations on sample notes before and after Block 3 task 01 and compare the frontmatter byte for byte.
- Keys: `🏷-Legend-<color>`, `🏷-Pinned`, bookmark key. Values: `🏠/<tagPath>` and `🔒/ <tagPath>` (space after the slash).
- Cover add, remove, cycle, lock and unlock, and move and copy cleanup.
- Golden `.TagNodeMeta` file content for a new folder: path, name, created, modified, description, legend (six colors), raindropLink.

## Integration tests (in-memory vault)

- End-to-end operations: create, rename, move, copy, remove, hard delete, duplicate and recreate folder, clipboard copy, cut and paste (including invalid items).
- Failure injection at each step of the compound operations (Block 2 task 06): the file keeps a tag, the folder is not half-moved, and the tree equals the disk state.
- Queue behavior with rapid operations and with external events arriving mid-operation.
- Startup: tree build from a vault with tagged, untagged and excluded files, and empty folders restored from `.TagNodeMeta`.
- Restart persistence of folder metadata.
- Crash simulation once the journal exists (Block 3 task 06).

## Notes

- Use a fake in-memory vault and adapter that implement the subset the code uses.
- Keep fixtures small and readable.
