# Task 05: layer decoupling

## Affects

`main.ts`, `settings.ts`, `orchestrator.ts`, `store.ts`, `windows.ts`, `TagExplorerView`, a new `types.ts`.

## What it does

- Break `main <-> orchestrator` (orchestrator.ts line 7 `import TagFolderPlugin from "./main"`) and `main <-> settings` (settings.ts line 2) with `import type`.
- Define a small `PluginHost` interface: `app`, the lock accessors, `broadcastTreeUpdate`. The orchestrator depends on that, not on the plugin class.
- Stop the orchestrator importing the Svelte store (`orchestrator.ts:9`). The plugin passes a "busy changed" callback and `main.ts` updates the store. **Deviation D4 starts here.** The queue itself moves to the orchestrator in Block 2 task 03.
- Replace `(window as any).app` in `windows.ts` (line 6) with an injected `app`.
- Have `TagExplorerView` read through the model instead of `plugin.treeRoot`.

## Risks and consequences

- The Svelte store update uses `queueMicrotask` to avoid `state_unsafe_mutation`. Keep that timing exactly.
- `windows.ts` is called from Svelte with no `app`. Options: a typed module singleton set in `onload` and cleared in `onunload` (small diff, recommended now), or Svelte `context` passed to `mount` (cleaner, touches three components, later).
- With `verbatimModuleSyntax`, type-only imports must use `import type`, or esbuild may keep a runtime import.
- The model is null until the tree is built. Fixing that null-model problem is Block 2 task 01, not this task.
- Do not change lock logic.

## Done when

A cycle checker (for example `madge` as a dev command or a grep script) reports 0 cycles, with no behavior change.
