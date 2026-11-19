# Task 03: core object files

## Affects

`TreeRoot.ts` (1,216), `TagNode.ts` (764), `FileLeaf.ts` (245), `fileEditor.ts` (1,706), `interfaces.ts` / `types/` (805).

## What it does

- `TreeRoot`: move the serializer (`serializeTree`) to a pure function. Extract the vault scan (`buildFilePathDictionary`, `processVaultFolder`, `processFile`). Type `serializeTree` properly (`any[]`, `Set<any>`, `any` today).
- `buildFilePathDictionary` creates a `FileLeaf` for every vault file including attachments, while only `.md` files enter the tree. Evaluate limiting it.
- `recomputeTree` awaits per file sequentially. Evaluate batching.
- `fileEditor`: shrinks to note-YAML edits once the metadata layer exists.
- `FileLeaf`: not read yet. **Verify** `retrieveAllTagPaths`, `readInitial` (regex fails on CRLF, unused `metadata` variable), `fileMetadata`, `fileObsCreateModDate`.
- `interfaces.ts`: large commented blocks, `any` use, 805 lines. Review.

### Root node (deviation D9, analysis only first)
- `TreeRoot` hand-builds a proxy object (`constructRootNode`) that imitates a `TagNode`, plus parallel `rootTags` and `rootTagsByName`. The owner documented that unifying root and node is a conceptual change. Compare options (real `TagNode` with path `""`, or keep the proxy) before any change. Not changed in earlier blocks.

## Risks and consequences

- `TagNode`'s API is used everywhere. Add and move, do not rename.
- The root-node question ripples through `TreeRoot`, `TagNode`, the model and the serializer.
- `TagNode.deleteMeta` and the constructor change in Block 2 task 02. Do not touch them twice.

## Done when

Each file has one clear responsibility and no behavior has changed.
