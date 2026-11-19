# Task 02: metadata access layer

## Affects

- `TagNode.ts`: `createNewMeta`, `readMeta`, `updateMeta`, `deleteMeta`, `getMetadataFilePath`, the constructor (which calls `createNewMeta()`).
- `TreeRoot.ts`: `populateEmptyTagFoldersFromMetadata`, `extractTagPathFromFilename`.
- `fileEditor.ts`: `metadataRecomputeName`, `metadataRenameFile`, `metadataReadAllFrontmatter`, `metadataAddNewProperty`, `metadataReplaceExistingProperty`, `metadataAppendToProperty`.
- New `storage/` module. Startup tree build.
- About 78 call sites in `orchestrator.ts` and `modelInterface.ts` that must **not** need edits.

## Owner constraints

- Folder metadata is hidden on purpose. Keep the folder name `.TagNodeMeta` and the structure of its files. Obsidian Sync not seeing it is accepted.
- Old contents are throwaway test data. No migration.

## What it does

- One `MetadataStore` owns the `.TagNodeMeta` folder, the per-folder JSON files, and the hash file names (the single helper from Block 1 task 06 supplies the path and hash).
- Keeps the synchronous API (`readMeta`, `updateMeta` returning boolean). An in-memory cache serves reads and writes. Files are written through the Obsidian adapter instead of Node `fs`.
- The existing `fileEditor.metadata*` functions delegate to the store, so orchestrator call sites do not change (deviation D5).
- Removes `fs`, `path`, and `crypto` imports from `TagNode`, `TreeRoot` and `fileEditor`.
- Removes the file write from the `TagNode` constructor: entries are created lazily with the same result on disk.
- Startup discovery of empty folders lists the folder through the adapter instead of `readdirSync`.
- `deleteMeta` moves the file into a subfolder of the metadata folder instead of the vault's `.trash`.

## Risks and consequences

- **Sync versus async.** Adapter calls are async, but callers branch on synchronous boolean results. Changing to async would ripple through all ~78 call sites and the constructor. The cache avoids that. Consequence: a write is not on disk until the async write finishes, so write promptly and flush on unload.
- **Hand edits are not seen.** Today every read hits disk. With a cache, editing a JSON file by hand needs a reload.
- **Empty folders persist only through these files.** Startup discovery is the highest-risk path. Test empty-folder survival across restart.
- **Rename.** The file name is a hash of the path, so a folder rename is "write new file, delete old" across all descendants. `metadataRenameFile` has a check-then-rename gap today.
- **Hash input.** One helper must apply the `#` stripping consistently.
- **Integrity check.** Keep the check that rejects files whose hash does not match their stored path. Corrupt JSON still returns `{}`.
- **Crash safety.** Write to a temp name then rename, or accept that a crash can leave a partial file. Decide here, because the later journal depends on it.
- This task is the seam the future journal uses to snapshot and restore folder state.

## Done when

No `fs`/`path`/Node `crypto` imports remain. Description, legend, pin, bookmark and empty folders survive restart.
