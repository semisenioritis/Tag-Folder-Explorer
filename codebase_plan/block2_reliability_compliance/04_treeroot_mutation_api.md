# Task 04: TreeRoot mutation API (new task)

## Affects

`TreeRoot.ts`, `TagNode.ts` (`addFileLeaftoFiles`, `removeFile`), and the places in `orchestrator.ts` that mutate the tree directly.

## Deviation

**D3 (enforces the owner's rule):** object operations live with their object. The orchestrator today reaches into raw collections: `getFilePathMap().set/delete`, `getUntaggedFiles().add/delete`, `getRootNode().getChild/addChildNode`, `fileLeafIndexUpdater`. This breaks encapsulation and forces every caller to know the internals.

## What it does

- Add `TreeRoot` methods such as `addFile`, `removeFile`, `moveFile` (rename), and use `ensureTagPath` (from Block 1 task 06).
- Stop exposing the raw collections to the orchestrator.
- Every add and remove of a file in a tag node or in the untagged set goes through these methods.

## Why it is a separate task

- It is the prerequisite for the reverse index in task 05. A file-to-tag-paths index must be updated at every add or remove. The paths are `TagNode.addFileLeaftoFiles`, `TagNode.removeFile`, and the direct `getUntaggedFiles().add/delete` calls. If the index misses one, files appear in the wrong folder.
- It makes the orchestrator's sync handlers shorter and testable.

## Risks and consequences

- Many call sites in the orchestrator change. Do it handler by handler.
- `TreeRoot` must keep `invalidateCache()` semantics (it clears both serialized caches and bumps `treeVersion`). Decide whether the mutation methods invalidate the cache themselves, or the orchestrator still does. Do not double-bump.
- `TagNode`'s public API is used everywhere. Add methods, do not rename.

## Done when

The orchestrator no longer calls `getFilePathMap()`, `getUntaggedFiles()`, or `getRootNode()` for mutation.
