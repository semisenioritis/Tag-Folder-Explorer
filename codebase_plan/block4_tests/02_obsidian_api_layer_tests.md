# Task 02: Obsidian API layer tests

## Targets (against a stub `obsidian` module)

- Frontmatter helpers in `fileEditor`: `addTagToFileYaml`, `removeTagFromFileYaml`, `replaceMetadataSection`, `createTagsFrontMatter`, using a fake `fileManager.processFrontMatter` that applies the callback to an in-memory object.
- Vault event handling: `EventListener` -> orchestrator for create, rename, modify and delete, including `.md` filtering and folder-event ignoring.
- Sync handlers: debounce, tags-unchanged shortcut, own-write echo suppression, excluded-folder transitions, awaited nested calls.
- Plugin lifecycle: `onload` / `onunload`, single `initializeTree`, ready signal, listener registered once, cleanup.
- View lifecycle: `TagExplorerView` open and close, restored state (`getState` / `setState`), loading state before the tree is ready.
- Settings: `loadSettings` with missing keys (new `debugLogging`), `saveSettings`, body class toggle.
- Delete and rename go through `fileManager.trashFile` and `fileManager.renameFile`.
- Adapter-backed metadata store calls (`exists`, `read`, `write`, `list`, `rename`, `remove`, `mkdir`) with a fake adapter.

## Notes

- The stub must model only what the code uses: `TFile`, `TFolder`, `Vault`, `Workspace`, `MetadataCache`, `FileManager`, `Notice`, `Modal`, `Menu`, `ItemView`, `Plugin`, `normalizePath`.
- Keep the stub in one place so new API use shows up as a clear failure.
