# Lint backlog

Produced by `npm run lint` (ESLint 9, `typescript-eslint` 8, `eslint-plugin-obsidianmd` 0.6.0, `eslint-plugin-svelte`) on 2026-11-20, from `src/` only. The lint run is report-only for now: it exits non-zero and is not part of `npm run build`. No findings were fixed in Block 1 task 02, including the auto-fixable ones, because several auto-fixes change behavior (for example `instanceof` to `.instanceOf`).

Total: 561 errors, 245 warnings across 19 files. 205 are auto-fixable.

## By rule

| Count | Rule | Planned home |
|---|---|---|
| 212 | `@typescript-eslint/no-unsafe-member-access` | Typing cleanup of `any` (Block 3) |
| 200 | `@typescript-eslint/no-explicit-any` | Same |
| 164 | `@typescript-eslint/no-unsafe-assignment` | Same |
| 45 | `obsidianmd/rule-custom-message` | Logger task (Block 1 task 04), console usage |
| 32 | `@typescript-eslint/no-unsafe-call` | Typing cleanup |
| 32 | `@typescript-eslint/no-unused-vars` | Dead code removal (Block 1 task 03) |
| 25 | `@typescript-eslint/no-unsafe-argument` | Typing cleanup |
| 24 | `svelte/require-each-key` | Frontend (Block 1 task 07 / Block 3 task 04) |
| 12 | `obsidianmd/no-misused-promises` | Queue and sync (Block 2) |
| 10 | `@typescript-eslint/no-floating-promises` | Queue and sync (Block 2 tasks 03 and 05) |
| 10 | `no-useless-escape` | Mechanical, safe to fix later |
| 9 | `@typescript-eslint/await-thenable` | Dead code / correctness |
| 8 | `@typescript-eslint/no-unsafe-return` | Typing cleanup |
| 4 | `obsidianmd/prefer-create-el` | Obsidian compliance (Block 2 task 07) |
| 4 | `svelte/no-unused-svelte-ignore` | Frontend |
| 3 | `obsidianmd/prefer-active-doc` | Block 2 task 07 |
| 2 | `obsidianmd/prefer-instanceof` | Block 2 task 07 |
| 2 | `@typescript-eslint/no-redundant-type-constituents` | Typing cleanup |
| 1 each | `obsidianmd/hardcoded-config-path`, `obsidianmd/prefer-file-manager-trash-file`, `obsidianmd/prefer-window-timers`, `obsidianmd/settings-tab/prefer-setting-definitions`, `no-prototype-builtins`, `no-empty`, `svelte/prefer-svelte-reactivity`, `svelte/no-useless-mustaches` | Block 2 task 07 for the `obsidianmd/*` ones |

## By file (errors / warnings)

| File | Errors | Warnings |
|---|---|---|
| orchestrator.ts | 277 | 136 |
| fileEditor.ts | 148 | 15 |
| TreeRoot.ts | 45 | 6 |
| main.ts | 29 | 7 |
| eventlistener.ts | 14 | 0 |
| TagTreeView.svelte | 14 | 0 |
| MainView.svelte | 13 | 0 |
| FileLeaf.ts | 9 | 3 |
| TagNode.ts | 6 | 6 |
| MetadataView.svelte | 3 | 0 |
| windows.ts | 2 | 1 |
| controllerInterface.ts | 1 | 56 |
| other files | 0 | 15 |

## Strictness

The plan assumed `strict` was off. It was already on: `@tsconfig/svelte` sets `"strict": true`, and `tsc` passes with it. `tsconfig.json` now states it explicitly. All individual flags the plan listed (`strictFunctionTypes`, `noImplicitThis`, `useUnknownInCatchVariables`, and others) are covered, so there is no `strictness-backlog.md`.
## Update after Block 1 task 08

After the dead-code removal, the logger and the layout work, `npm run lint` reports 434 errors and 136 warnings across 28 files (down from 561 and 245). The breakdown by rule above is still representative: the large groups are `no-unsafe-member-access`, `no-unsafe-assignment` and `no-explicit-any`. The `obsidianmd/rule-custom-message` findings (45) are gone because the console calls now go through the logger. ESLint is configured with `parserOptions.project` instead of `projectService` because the project service crashes with the pinned TypeScript 5.0.
