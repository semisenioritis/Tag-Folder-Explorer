# Task 01: unit tests (individual functions)

## Targets

- Pure helpers: metadata path and hash (including the `#` stripping), name sanitizing (`toHashtagSafe`, `toSafeFileName`, `addChildNode` regex), exclusion matching (boundary cases such as `Archive` vs `Archive2`, trimmed lines), the logger gate.
- Drag helpers in `ui/dnd.ts`: `parseObsidianOpenUri`, `parseExternalFilePath`, `getDragPayload` (internal JSON, `text/uri-list`, wiki-link, invalid input).
- Date and color helpers.
- `TreeRoot` methods: `ensureTagPath`, add/remove/move file, `getNode`, `invalidateCache` (version bump), `getSortedTree` cache, `getAllInstancesOfFile`, the serializer.
- `TagNode` methods: `addChildNode`, `createNewFile`, `removeFile`, `renameNode`, `editPath`, `serializeTagNode`.
- `FileLeaf` methods (after the file has been reviewed).
- `OperationQueue`: order, always-release on error, no deadlock with internal calls, busy callback, timeout.
- `MetadataStore`: read, update (add, replace, append), delete to subfolder, rename, integrity check, corrupt JSON returns `{}`, empty-folder discovery.

## Notes

- Test through the stable public surface. Do not test private details that change in Block 3.
- Each bug fixed in Block 2 gets a regression test (stuck lock, rename lookup, exclusion matching, startup double-init).
