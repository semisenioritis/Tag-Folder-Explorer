# Task 05: sync handlers

## Affects

`syncExternalFileCreation/Rename/Modify/Delete` in `orchestrator.ts` (lines ~94-401), `eventlistener.ts`, `TreeRoot.getAllInstancesOfFile`, `FileLeaf`, `TagNode.addFileLeaftoFiles` and `removeFile`.

## Problems being fixed

- Nested `this.syncExternalFileCreation(file)` and `syncExternalFileDelete(file)` calls in rename and modify are not awaited, so `invalidateCache` and `broadcastTreeUpdate` run before they finish.
- In `syncExternalFileRename`, when the new location is excluded, `syncExternalFileDelete(file)` looks the leaf up by the new path while the map key is still `oldPath`. It may not find it.
- No debounce. `vault.on("modify")` fires on every autosave (about every 2 seconds while typing). Each triggers tag retrieval, `invalidateCache()` and a full-tree serialize and broadcast, even if tags did not change.
- `getAllInstancesOfFile` is a full tree walk with no index (called from modify, delete, `hardDeleteFile`).
- Events arriving during a plugin operation are dropped, so the tree drifts from disk.

## What it does

- Await all nested calls.
- Fix the rename lookup (use the leaf found by `oldPath`, then update the index).
- Debounce and coalesce `modify` events per file. Tunable constant.
- Skip the update when the tag set did not change.
- Queue events behind running operations (task 03) and recognize the plugin's own writes so they are skipped.
- Consider the metadata cache `changed` event for tag updates, because it fires after Obsidian parses the file.
- Handle excluded-folder transitions in both directions (moving a file into or out of an excluded folder).
- Start with the "tags unchanged" shortcut and profile before adding a reverse index.

## Risks and consequences

- Debounce delays the UI. After typing a tag in a note, the tree updates about a second later.
- If the "no-op" check is wrong, the tree silently stops updating.
- A reverse index (file to tag paths) must be updated at every add or remove. Only safe after task 04.
- Vault folder events stay ignored, because child file events cover them.
- The commented pseudocode in these handlers is the owner's design note. Keep it in source.

## Done when

Typing in a note produces no tree broadcast unless tags changed.
