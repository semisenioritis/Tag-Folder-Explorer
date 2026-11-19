# Dead-code candidates (kept, not deleted)

Block 1 task 03. These items look unused or are not wired up. They were left in place on purpose. Each one belongs to unfinished work or needs a decision.

## Unfinished work, kept on purpose

| Item | File | Why it stays |
|---|---|---|
| `writeToRollbackRegister` | `orchestrator.ts` (line ~61, comment reference at ~83) | Never called. Part of the rollback journal (Block 3 task 06). The hardcoded plugin path in it is a Block 2 task 07 fix. |
| `TreeRoot.delChildNode`, `TreeRoot.delChildFile` | `TreeRoot.ts` (~707, ~765), `interfaces.ts` | Only the declaration and the interface entry reference them. Revisit in Block 3 task 03. |
| `TreeRoot.getSkipFolderPath` | `TreeRoot.ts` (~160), `interfaces.ts` | Only declared. Revisit with the excluded-folders fix (Block 2 task 07). |
| `TreeRoot.recomputeTree` (public) | `TreeRoot.ts` | Called from inside `TreeRoot`; the public exposure may be unnecessary. Revisit in Block 3 task 03. |
| `ModelInterface.getrightSidebarData` | `modelInterface.ts` | Used by `MetadataView.svelte`. Not dead. Listed because its comment calls it a placeholder. |

## Corrections to the plan

- `FileLeaf.fileMetadata`, `fileObsCreateModDate` and `readInitial` are read through `ModelInterface` (`getDetailedViewData`) and the Svelte views. They are live.
- `handleDragOverDisabled` and `handleDropDisabled` in `MainView.svelte` are bound to file-row `ondragover`/`ondrop` handlers (to block drops onto files). They are live there, so only the unused copies in `TagTreeView.svelte` were removed.
- `hasPinnedItems` in `MainView.svelte` is used in the markup (section dividers). It stays.
- The "stray bare prose lines" near `orchestrator.ts` lines 3534 and 3730 are inside a `/** ... **/` comment block ("complete the function" notes). They are comments, not code, and stay as design notes.

## Unused locals and parameters left in place

`tsc --noUnusedLocals --noUnusedParameters` reports these after the removals. They are not in the task 03 scope. Most are `owner` parameters (part of method signatures, removed with the queue work in Block 2 task 03) or locals in the orchestrator that disappear when it is split in Block 3 task 01.

- `controllerInterface.ts`: `owner` parameter in 6 methods.
- `orchestrator.ts`: `owner` in 8 methods, plus about 20 unused locals (`prefixedOldTagPath`, `lockedOldTagPath`, `prefixedSourcePath`, `fileMetadata2`, `lockStatus`, `colorList`, `currLegendColor`, and others).
- `TreeRoot.ts`: unused `settings` field parameter, three unused parameters on a rename stub, and `filename` in two functions.
- `FileLeaf.ts`, `modals.ts`, `settings.ts`, `modelInterface.ts` (`app` constructor parameter): one unused item each.
- Svelte: `updateTreeData(newTreeData, newVersion)` in `TagTreeView.svelte` ignores both arguments. Block 3 task 04 replaces this mechanism.

## Skipped commented-out debug lines

12 commented `console.*` lines sit directly next to other commented code (the commented-out feature blocks the owner wants kept). They were left alone.