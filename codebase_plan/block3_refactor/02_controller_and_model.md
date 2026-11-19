# Task 02: controller and model

## Affects

`controllerInterface.ts` (966 lines, 59 methods), `modelInterface.ts` (144 lines), `modals.ts`, the six `trigger*Modal` methods, and Svelte call sites if signatures change.

## What it does

### Controller (deviation D2)
- Stays as the only UI write entry.
- Typed results instead of `error?: any`.
- Remove `owner` from the signatures the UI sees. A component can pass `owner=false` today and bypass the lock.
- Fix the header comment that promises validation and error handling, or implement basic validation.
- The 35 methods the UI does not call stay (owner's intended API): file and folder CRUD, legend, pinned and bookmark add/remove/lock, clipboard, bookmark readers.
- Name mismatches to resolve: orchestrator `addLegendLockToFolder` / `removeLegendLockFromFolder` map to controller `addLockedLegendToFolder` / `removeLockedLegendFromFolder`. `updateLegendOfFile` and `updateLegendForFolder` have no controller wrapper.
- Remove the stray `console.log("attempting to call orchestrator")`.

### Model (deviation D8)
- Reads only the tree, the metadata layer, and `FileLeaf`. No `fileEditor` import.
- Drop the unused `getTreeVersion` if still unused.
- UI uses: `getleftSidebarTree`, `getmainViewData`, `getrightSidebarData`, `getDetailedViewData`, `getVaultName`, `doesTagPathExist`.
- Add a bulk "statuses for this folder" read to support Svelte task 04.

### Modals (deviation D7, open default)
- Move modal construction out of the orchestrator into `ui/`. Controller methods the UI calls (`triggerRenameModal`, `triggerNewFileOrFolderModal`, `triggerDeleteModal`, `triggerMoveModal`, `triggerCopyModal`) stay.
- Today the triggers call `invalidateCache` and `broadcastTreeUpdate` before the modal confirms. That should go.
- The owner may decline this part. Default: do it, unless told otherwise.

## Risks and consequences

- Low risk if the signatures Svelte uses are unchanged.
- Moving modals changes the orchestrator's imports and the call path for six triggers.
- `triggerLegendModal` is used only in commented-out code (MainView 69, 184). Leave it for task 05.

## Done when

No UI code can bypass the queue. `modelInterface` has no write-layer imports.
