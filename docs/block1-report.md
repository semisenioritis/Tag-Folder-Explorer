# Block 1 report: clean baseline

Branch `chore/baseline-cleanup`, from commit `225f615`. All tasks were done with no intended behavior change. The one visible change is the new **Debug logging** setting (default off).

## Exit criteria

| Criterion | Baseline | Now |
|---|---|---|
| `tsc -noEmit` errors | 0 | 0 |
| `svelte-check` errors | 7 | 7 (same ones, gated at 7 in `npm run build`) |
| `npm run build` | `tsc` + esbuild | `tsc`, cycle check, `svelte-check` gate, esbuild |
| `main.js` size | 302,677 bytes | 297,829 bytes |
| Import cycles | 4 (found by `scripts/check-cycles.mjs` on the old code) | 0 |
| Active `console.*` calls | 245 | 0 (errors and warnings go through the logger) |
| Commented-out `console.*` lines | 116 | 12 (next to commented-out feature code, kept) |
| ESLint | 561 errors, 245 warnings | 434 errors, 136 warnings |
| Smoke checklist | not run | **pending: needs the owner's vault** |

## Changes per task

1. **Baseline** (`452b18b`): `docs/baseline.md`, `docs/smoke-test.md`.
2. **Repo and tooling hygiene** (`7530be7`): removed `mainold.ts.txt`, untracked `dist/`, moved the rollback sample files to `docs/design/`, removed 10 unused dependencies, pinned `obsidian`, synced versions, fixed `tsconfig.json`, made `strict` explicit (it was already on through `@tsconfig/svelte`), added the `svelte-check` gate, fixed the dev watch and production dispose, shared the Svelte options in `svelte.config.mjs`, added ESLint 9 with `eslint-plugin-obsidianmd` and `eslint-plugin-svelte` (report-only).
3. **Dead code** (`44c2010`): about 1,400 lines removed from `fileEditor.ts`, `eventlistener.ts`, `main.ts` and the Svelte files, plus 102 commented debug logs. Candidates kept on purpose are in `docs/dead-code-candidates.md`.
4. **Central logger** (`c4be98b`): `utils/logger.ts` and the **Debug logging** setting. 54 debug dumps deleted, 150 calls converted.
5. **Layer decoupling** (`35dcdbc`): `PluginHost` interface, busy callback instead of the backend importing the store, injected `app` in `windows.ts`, the view reads through the model, `scripts/check-cycles.mjs` added to `build`.
6. **Backend de-duplication** (`17cb003`): one metadata path and hash helper, one vault base path helper, one sanitizer module, `TreeRoot.ensureTagPath` (two modes, documented), shared `OperationResult` type.
7. **Frontend de-duplication and CSS prefix** (`cec3db8`): `ui/dnd.ts`, `ui/format.ts`, `ui/colors.ts`, `tfe-` prefix on the six global CSS classes.
8. **Folder layout and naming** (`e1c8cce` and the commit after it): files moved into `core/`, `orchestration/`, `api/`, `types/`, `ui/`, `utils/`. `eventlistener.ts` is now `EventListener.ts`. `TagExplorerView` moved out of `main.ts` into `ui/views/`, and depends on an `ExplorerViewHost` interface.

## Final layout

```
src/
  main.ts  settings.ts
  core/           FileLeaf, TagNode, TreeRoot
  orchestration/  orchestrator, fileEditor, EventListener
  api/            controllerInterface, modelInterface
  types/          interfaces, common (PluginHost, OperationResult)
  ui/             modals, windows, store, dnd, format, colors
    components/   the five Svelte components
    views/        TagExplorerView
  utils/          logger, sanitize, metadataPath, vaultPath
```

## Deviations from the plan

- **Strict mode was already on.** There is no `strictness-backlog.md`.
- **`handleDragOverDisabled`, `handleDropDisabled` and `hasPinnedItems` in `MainView` are used**, so they were kept (only the unused copies in `TagTreeView` were removed).
- **The "bare prose lines" in `orchestrator.ts` are inside a comment block**, so they were kept.
- **`madge` could not be installed** (peer conflict with TypeScript 5.0), so cycle checking is a small script.
- **ESLint uses `parserOptions.project`**, not `projectService`. With TypeScript 5.0 the project service crashes part-way through a full run.
- **`types.ts` became `types/common.ts`** (and `interfaces.ts` became `types/interfaces.ts`) to avoid `./types` resolving to the new folder.
- **The `windows.ts` view-type string is still duplicated** (`'tag-explorer-view'`). Importing the constant from the view would create a cycle through the Svelte components. Fix it with the shared-state work in Block 3 task 04.

## Known layering violations (kept for Block 2 and 3)

- `core/TagNode.ts` calls `orchestration/fileEditor` for folder metadata (deviation D5, fixed by the metadata layer in Block 2 task 02).
- `orchestration/orchestrator.ts` imports `ui/modals` (deviation D7, Block 3 task 02).
- `api/modelInterface.ts` no longer imports `fileEditor` (done in task 03).

## Backlog files

- `docs/lint-backlog.md`: lint findings.
- `docs/dead-code-candidates.md`: items kept on purpose and unused locals and parameters.
- `docs/design/`: rollback register samples for Block 3 task 06.

## Smoke checklist

Pending. Run `docs/smoke-test.md` in the owner's vault. Items to look at especially: the restart-with-a-tab-open case (a known baseline failure, fixed in Block 2 task 01), the plugin's modals (CSS prefix), dragging from Obsidian's file explorer, and an existing empty folder after restart.

## Hand-off

Stop here and wait for the owner to validate. Block 2 does not start without approval.