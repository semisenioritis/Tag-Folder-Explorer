# Baseline (Block 1 / Task 01)

Recorded on branch `chore/baseline-cleanup`, from commit `225f615`, 2026-11-20.

## Checks

| Check | Result |
|---|---|
| `tsc -noEmit -skipLibCheck` | 0 errors |
| `npm run svelte-check` | 7 errors, 0 warnings, all in `MainView.svelte` (exit code 1) |
| `npm run build` | passes (runs `tsc` + esbuild only; `svelte-check` is not part of it) |
| `main.js` size | 302,677 bytes |
| Tracked files (`git ls-files`) | 41 |
| Tracked build artifacts | `dist/manifest.json`, `dist/styles.css` |

`npm run build` rewrites tracked `dist/manifest.json`. Revert it with `git checkout -- dist/manifest.json` until Task 02 untracks `dist/`.

### svelte-check errors (baseline, not regressions)

| Line:col | Message |
|---|---|
| 40:12 | `model` is possibly null or undefined |
| 894:42 | `mainViewData` is possibly null |
| 894:61 | `mainViewData` is possibly null |
| 1256:31 | `model` is possibly null or undefined |
| 1311:33 | `model` is possibly null or undefined |
| 1374:31 | `model` is possibly null or undefined |
| 1429:33 | `model` is possibly null or undefined |

"No regression" means no more than these 7 errors. The `model` errors relate to the startup null-model problem fixed in Block 2 task 01.

## `console.*` calls (active / commented out)

| File | Active | Commented |
|---|---|---|
| orchestrator.ts | 92 | 34 |
| fileEditor.ts | 51 | 4 |
| TagExplorer.svelte | 23 | 18 |
| TreeRoot.ts | 16 | 3 |
| eventlistener.ts | 14 | 0 |
| TagNode.ts | 14 | 0 |
| MetadataView.svelte | 10 | 0 |
| TagTreeView.svelte | 8 | 9 |
| MainView.svelte | 7 | 37 |
| main.ts | 6 | 3 |
| FileLeaf.ts | 3 | 0 |
| controllerInterface.ts | 1 | 0 |
| modelInterface.ts | 0 | 8 |
| **Total** | **245** | **116** |

The master plan estimated about 300 total; the multi-line and `console.error` variants are counted by line here, so use this table as the baseline for the logger task.

## Known baseline failures

- Restarting Obsidian with an explorer tab open: expected to fail (null model at startup). To be confirmed in the owner's vault. Fixed in Block 2 task 01.
