# Task 03: dead code removal

## Affects

`eventlistener.ts`, `main.ts`, `orchestrator.ts`, `fileEditor.ts`, `TreeRoot.ts`, `interfaces.ts`, `modelInterface.ts`, and unused items in the five Svelte files.

## Owner constraint

Commented-out **feature** code stays as it is (legend modal, bookmark menu items, `triggerLegendModal` references). It is handled in Block 3 task 05. Design-note comments (sync-handler pseudocode, `🔴 write action step pre/post`) also stay.

## What it removes (verify each by grep first)

- `eventlistener.ts`: the four `handle*Test` methods and the ~30 blank lines.
- `main.ts`: the commented `ExplorerView` block and `activateView`, the commented loop in `getTreeVersion`, unused imports (`Editor`, `MarkdownView`, and others the linter flags).
- `fileEditor.ts`: dead exports with no reference anywhere, including internally: `hasFrontMatter`, `readAllFileYaml`, `readSpecificYamlSection`, `hasTag`, `removeTagFromFile`, `replaceTagInFile`, `convertBodyTagsToYaml`, `deleteAllYaml`, `deleteSpecificYaml`, `addNewMetadataSection`, `appendMetadataSection`, `normalizeFrontmatter`, `checkIfMetadataFileExists`, `metadataReadSpecificProperty`, `metadataRemoveAllMetadata`, `metadataRemoveSpecificProperty`. Functions used only by those wrappers become dead too (`extractAllTagsFromYaml`, `extractAllTagsFromFileBody`, `readAllTagsFromFile`, `hasTagAnywhere`, `removeTagFromFileBody`, `replaceTagInFileYaml`, `replaceTagInFileBody`): check after the first pass.
- `modelInterface.ts`: the unused import of `metadataReadAllFrontmatter`. Remove `ModelInterface.getTreeVersion` only if confirmed unused (the plugin reads `treeRoot` directly).
- Svelte: unused `writable` import (TagExplorer), `mainViewRef`, the `controller` prop in `TagTreeView` (also remove it from the parent that passes it), the `colorDictionary` prop in `MetadataView`, `handleDragOverDisabled` and `handleDropDisabled` in both `MainView` and `TagTreeView`, the written-but-never-read `treeVersion`.
- Commented-out debug `console.log` lines.
- Stray bare prose lines in `orchestrator.ts` (around lines 3534 and 3730: verify they are actually bare and not inside a comment).
- Typo `refreshCurerntFolder`.
- The stray `{{` in `TreeRoot.ts` (~577), if it is a real syntax oddity.

## What it keeps and documents

List in `docs/dead-code-candidates.md`, without deleting: `writeToRollbackRegister`, `TreeRoot.delChildNode`, `delChildFile`, `getSkipFolderPath`, public `recomputeTree`, and uncertain `FileLeaf` members (`fileMetadata`, `fileObsCreateModDate`, `readInitial`).

## Risks and consequences

- A grep for "unused" misses dynamic use and same-named symbols. Build and svelte-check after each file.
- Removing a Svelte prop requires editing the parent that passes it.
- `svelte-ignore` comments hide accessibility warnings. Leave them; Block 3 task 04 handles accessibility.
- `hasPinnedItems` in `MainView` is computed; confirm whether it is used in markup before touching it.

## Done when

The diff is deletions plus the typo fix. Build and svelte-check show the same or fewer warnings.
