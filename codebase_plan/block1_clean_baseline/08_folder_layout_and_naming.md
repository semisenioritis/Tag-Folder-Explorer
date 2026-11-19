# Task 08: folder layout and naming

## Affects

Every file path and import, `tsconfig.json`, Svelte relative imports, and `main.ts` (which loses the view class). Done last in Block 1, in its own commit.

## What it does

- Move files with `git mv` to preserve history. Target layout:

```
src/
  main.ts                    plugin lifecycle only
  settings.ts
  types/                     shared types (was interfaces.ts), OperationResult, PluginHost
  core/                      FileLeaf, TagNode, TreeRoot
  orchestration/             orchestrator, fileEditor, EventListener
  api/                       controllerInterface, modelInterface
  ui/
    views/TagExplorerView.ts extracted from main.ts
    modals, windows, store, dnd, format, colors
    components/              the five Svelte components
  utils/                     logger, sanitizing, metadata path helper
```

- Keep the owner's names: `orchestrator`, `controllerInterface`, `modelInterface`, `TreeRoot`, `TagNode`, `FileLeaf`.
- **Deviation:** the types file becomes `types/` and the controller and model live under `api/`, because an `interfaces/` folder would clash with `interfaces.ts`.
- Fix casing: `eventlistener.ts` becomes `EventListener.ts`.
- Extract `TagExplorerView` to its own file.
- The `storage/` folder is added later, in Block 2 task 02.

## Risks and consequences

- **Windows case-only renames:** `git mv eventlistener.ts EventListener.ts` can be ignored on a case-insensitive filesystem. Rename through a temp name in two steps.
- Svelte files use relative imports (`../modelInterface`), so each changes.
- The extracted view must depend on `PluginHost`, not the plugin class, or a `main <-> view` cycle returns.
- Large diff and conflicts with open branches. This is why it goes last.

## Done when

Build, `svelte-check` and lint match baseline, and there are 0 cycles. Write `docs/block1-report.md` with changes per task, backlog files, and checklist results, then stop and wait for owner validation.
