# Task 07: Obsidian API compliance

## Affects

`fileEditor.ts`, orchestrator delete and rename, `TreeRoot.isExcludedFolder`, `main.ts` commands, `windows.ts`, `settings.ts`, and a new notify helper.

## What it does

- `fileManager.trashFile` instead of `vault.trash(f, true)` (orchestrator ~1314).
- `fileManager.renameFile` for renames so links update. **Verify** what `fileEditor.renameFile` (~100-145) ends with now.
- A `Notice` on failed operations, raised once from the queue wrapper and aggregated per operation.
- Exclusion matching on path boundaries with trimmed lines. Today `startsWith` makes `Archive` also exclude `Archive2`.
- `normalizePath` everywhere, `manifest.dir` and `app.vault.configDir` instead of hardcoded `.obsidian/plugins/...`.
- `await` `shiftTagsFromBodyToMetadata` in the command callback.
- Guard the undocumented `revealInFolder` call (orchestrator ~7300) and the `webviewer` view type in `windows.ts` with a fallback.
- **Verify by grep:** `innerHTML` use, settings headings (`setHeading`), command names and IDs. Command IDs stay unchanged.
- `settings.ts`: confirm sentence case and no `.then` chain problems.

## Risks and consequences

- `trashFile` follows the user's "Deleted files" setting, so deleted notes may go somewhere different than today.
- **Exclusion semantics change.** If the owner relies on prefix matching, boundary matching changes which files appear. Default: boundary matching, unless the owner says otherwise.
- A `Notice` per failure could be noisy during multi-file operations. Aggregate.
- Undocumented explorer APIs can break in new Obsidian versions. Wrap in try/catch with a Notice fallback.
- Command names containing branding ("Launch Tag File Explorer") may need sentence-case review. IDs do not change.

## Done when

Failure paths show a `Notice`, and nothing writes to a hardcoded path.
