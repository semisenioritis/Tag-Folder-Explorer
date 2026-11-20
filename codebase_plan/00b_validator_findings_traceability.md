# Obsidian validator findings: traceability

The plugin was published once before the cleanup. The Obsidian validation bot reported the findings below. This document maps **every** finding to the task that fixes it and the check that proves it.

## Acceptance gate

A finding counts as fixed only when it is gone under the scanner's own configuration, not just under our day-to-day lint. Block 2 task 09 adds this gate:

- `npm run lint:scanner` runs the scanner-equivalent ESLint configuration from the `eslint-plugin-obsidianmd` documentation ("Full scanner-equivalent configuration"), with the **newest layer** switched on (`@typescript-eslint/no-unsafe-*` back at warn, plus the stricter `obsidianmd` rules). The bot's report contains `no-unsafe-*` findings, so it ran the newest layer.
- `npx eslint package.json manifest.json LICENSE` runs the metadata rules (`depend/ban-dependencies`, `validate-manifest`, `validate-license`). Our current `lint` script is `eslint src`, which never visits these files. That is why `builtin-modules` and the LICENSE problems were not visible locally.
- The release checks (manifest identity, attestations) are verified on a real tag in a clean vault (Block 2 task 08).

Final state: the scanner-equivalent run reports **0 findings**. Typing findings (`no-unsafe-*`, `no-explicit-any`) reach zero at the end of Block 3 task 07. Everything else reaches zero at the end of Block 2.

## Matrix

"Bot" is the count in the published report. "Now" is measured on the current code (end of Block 1) with the scanner-equivalent configuration on `src/*.ts`. Where "Now" is 0, the task keeps a guard so it cannot come back.

### Warnings

| Finding | Bot | Now | Fixed in | How it is fixed |
|---|---|---|---|---|
| Unsafe member access on an `any` value | 697 | 174 | **Block 3 task 07** | typed frontmatter, metadata JSON, serialized tree; remove `any` sources |
| Unexpected `any` | 212 | 99 | Block 3 task 07 | `error?: any` to `unknown` plus narrowing, typed records |
| Unsafe assignment of an `any` value | 200 | 142 | Block 3 task 07 | same |
| Unsafe call of an `any` value | 164 | 25 | Block 3 task 07 | same |
| Passes unsafe values into typed parameters | 32 | 18 | Block 3 task 07 | same |
| Returns unsafe values from typed code | 9 | 7 | Block 3 task 07 | same |
| `any` overrides all other types in a union | 2 | 1 | Block 3 task 07 | `fileEditor.ts` |
| Promise-returning function where void expected | 25 | 12 | **Block 2 task 09** (modal buttons), Block 3 task 02 moves the modals | `safeAsync` wrapper that catches and reports |
| Floating promises | 12 | 10 | Block 2 tasks 01, 03, 05, 07 fix them where they are touched; **task 09 verifies 0** | `await`, `void`, or `.catch` |
| `await` of a non-thenable | 10 | 9 | **Block 2 task 09** | remove the `await` after the queue exists (ordering check) |
| Unnecessary escape `\/` | 8 | 4 (all in one regex now) | **Block 2 task 09** | rewrite the regex in `utils/sanitize.ts` and `fileEditor.ts`, golden-compare |
| Unnecessary escape `\[` | 4 | (same regex) | Block 2 task 09 | same |
| Unnecessary escape `\?` | 3 | (same regex) | Block 2 task 09 | same |
| Use `activeDocument`, not `document` | 3 | 3 (`main.ts`) | **Block 2 task 09** | `activeDocument.body` |
| `require()` style import | 3 | 0 | done (Block 1 tasks 03 and 06) | guard: lint rule stays on |
| Release manifest differs from repository manifest | | n/a | **Block 2 task 08** | release workflow copies the root `manifest.json` and compares it byte for byte; stale `dist/manifest.json` was untracked in Block 1 task 02 |
| Direct filesystem access (Node `fs`) | | `fs` in `TagNode`, `TreeRoot`, `fileEditor` | **Block 2 task 02** | metadata layer on the Obsidian adapter; no `fs`, `path`, `crypto` imports left |
| `builtin-modules` should be replaced | | in `package.json` and `esbuild.config.mjs` | **Block 2 task 09** | `import { builtinModules } from "node:module"`, remove the dependency |
| `hasOwnProperty` on the target object | | 0 | done (Block 1 task 03) | guard: `no-prototype-builtins` stays on |
| Hardcoded `.obsidian` config folder | | 1 (`writeToRollbackRegister`) | **Block 2 task 07** | `app.vault.configDir` and `manifest.dir` |
| Empty block statement | | 1 (`orchestrator.ts`) | **Block 2 task 09** | handle the case or comment why it is empty |
| `Vault.trash()` instead of `FileManager.trashFile()` | | 1 (`orchestrator.ts`) | **Block 2 task 07** | `fileManager.trashFile` |
| `window.setTimeout` instead of `setTimeout` | | 1 (`revealFileInNavigation`) | **Block 2 task 07** | `window.setTimeout`, or wait on the file-explorer leaf instead of sleeping |

### Other

| Finding | Bot | Now | Fixed in | How it is fixed |
|---|---|---|---|---|
| Unused `prefixedOldTagPath` | 35 | 3 | **Block 2 task 09** | delete the dead local (check the initializer has no side effects first) |
| Unused `lockedOldTagPath` | 3 | 3 | Block 2 task 09 | same |
| Unused `prefixedTagPath`, `lockedTagPath`, `prefixedSourcePath`, `lockedSourcePath`, `sourceTagNode`, `fileName`, `fileMetadata2`, `lockStatus`, `colorList`, `currLegendColor`, `metadata`, `properties`, `nodesToProcess`, `modalTitle`, `showObsMetaData` | 1 to 2 each | present | Block 2 task 09 | same |
| Unused imports `Editor`, `MarkdownView`, `TFile`, `TFolder`, `FileLeaf`, `ITagNode`, `metadataReadAllFrontmatter`, `crypto` | 1 to 2 each | 0 | done (Block 1 tasks 03 and 06) | guard: `no-unused-vars` stays on |
| Missing GitHub artifact attestations for release assets | 3 | n/a | **Block 2 task 08** | workflow attests `main.js`, `manifest.json`, `styles.css` (`id-token` and `attestations` write permissions) |
| Clipboard access | | `navigator.clipboard` in copy, cut, paste | **Block 2 tasks 07 and 08** | keep the feature (owner intent), limit it to explicit user actions and plugin MIME types, and disclose it in the README |

## Found while checking, not in the bot report

| Finding | Fixed in |
|---|---|
| `LICENSE` still names "Dynalist Inc." and 2025 (sample-plugin template) | Block 2 task 08 |
| `obsidianmd/prefer-create-el` (4, `modals.ts`) | Block 2 task 09 |
| `obsidianmd/prefer-instanceof` (2, `settings.ts`) | Block 2 task 09 |
| `obsidianmd/settings-tab/prefer-setting-definitions` (1) | Block 2 task 09 (decision: stay on `display()` while `minAppVersion` is below 1.13) |
| `console` use inside `utils/logger.ts` is flagged by `rule-custom-message` | Block 2 task 09 (one `eslint-disable` with a description) |
| Local lint config breaks on JSON files (the Svelte block has no `files` scope) and `eslint src` skips `package.json`, `manifest.json`, `LICENSE` | Block 2 task 09 |
| Editor warnings: `baseUrl` and `moduleResolution: node` are deprecated in TypeScript 6 and removed in 7 | Block 2 task 09 (verified: delete both; `tsc`, `svelte-check` unchanged) |

## Watch list

The scanner's newest layer turns these `obsidianmd` rules into errors: `no-view-references-in-plugin`, `detach-leaves`, `no-plugin-as-component`, `no-static-styles-assignment`, `platform`, `no-unsupported-api`, `sample-names`, `no-sample-code`, and two settings-heading rules. None is reported today. Block 3 task 04 removes `activeViews` (the plugin holding view references), and Block 2 task 07 guards `revealInFolder` (undocumented API). The gate in Block 2 task 09 keeps them at error so any new finding shows up immediately.