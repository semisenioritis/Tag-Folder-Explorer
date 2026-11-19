# Task 06: backend de-duplication

## Affects

`TagNode.ts`, `TreeRoot.ts`, `fileEditor.ts`, `orchestrator.ts`, `types.ts`, and new helper modules.

## What it does

- **Metadata path and hash:** one helper replaces three copies (`TagNode.getMetadataFilePath`, `fileEditor.metadataRecomputeName`, `TreeRoot.extractTagPathFromFilename`). This is the seam that Block 2 task 02 swaps. `grep createHash` should find one place.
- **Tag-path walk-or-create:** one `ensureTagPath` in `TreeRoot`, replacing the loops in `syncExternalFileCreation`, `syncExternalFileModify`, `TreeRoot.addFileToTagPath`, and `TreeRoot.createTagNodeHierarchy`. Object operations live with their object, per the owner's rule.
- **Name sanitizing:** one module. The same regex appears in `TagNode.addChildNode`, the root proxy `addChildNode`, `Orchestrator.toHashtagSafe`, `toSafeFileName`, and `createNewFile`.
- **Vault base path:** one helper using `FileSystemAdapter` replaces `(adapter as any).basePath` (fileEditor ~1268) and `(adapter as any).getBasePath()` (TagNode ~348).
- **Result type:** a shared `OperationResult` replaces the repeated `{ success: boolean; error?: any }`, keeping the same shape so callers do not change.

## Risks and consequences

- **Hash input:** `fileEditor` strips a leading `#` before hashing, `TagNode` does not. They agree today only because paths never start with `#`. Keep the stripping and verify file names on disk are unchanged.
- **Walk-or-create semantics:** orchestrator loops go through `addChildNode` (sanitizes: spaces to `_`, other characters removed). `TreeRoot` loops construct `TagNode` directly (no sanitizing). Merging could place a tag with unusual characters in a different node. Preserve each caller's behavior in the merge or document the difference.
- **Result type:** `error?: any` to `unknown` can break callers that read `error.message`. Keep `any` where `unknown` would fail compilation (owner rule: small changes only).
- Do not change lock logic or metadata storage here.

## Done when

Build and smoke checklist pass, and the metadata file names on disk are identical to before.
