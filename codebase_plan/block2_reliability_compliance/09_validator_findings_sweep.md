# Task 09: validator findings sweep and scanner gate

## Affects

`eslint.config.mjs`, `package.json` (`lint` scripts, `builtin-modules`), `esbuild.config.mjs`, `tsconfig.json`, `orchestrator.ts`, `fileEditor.ts`, `utils/sanitize.ts`, `main.ts`, `settings.ts`, `modals.ts`, `utils/logger.ts`. Maps to `codebase_plan/00b_validator_findings_traceability.md`.

## Why this task exists

The Obsidian validator bot reported findings on the earlier published version. Most are fixed along the way by other tasks. This task covers the ones that no other task owns, then adds the gate that proves all of them are gone. It runs last in Block 2 so the promise and filesystem findings are already fixed by tasks 01 to 07.

## What it does

### Mechanical fixes (no behavior change)
- **Unused locals and parameters.** Delete: `prefixedOldTagPath`, `lockedOldTagPath`, `prefixedTagPath`, `lockedTagPath`, `prefixedSourcePath`, `lockedSourcePath`, `sourceTagNode`, `fileName`, `fileMetadata2`, `lockStatus`, `colorList`, `currLegendColor`, `metadata`, `properties`, `nodesToProcess`, `modalTitle`, `showObsMetaData`. Read each initializer first: delete the variable but keep any call with a side effect.
- **Unnecessary regex escapes.** Rewrite `/[\[\]#^|\\\/:\?]/g` as `/[[\]#^|\\/:?]/g` in `utils/sanitize.ts` and `fileEditor.ts`. Golden-compare old and new regex over every ASCII character plus emoji; the output must be identical.
- **Empty block** in `orchestrator.ts`: handle the case or add a comment that says why it is empty.
- **`document` to `activeDocument`** (`main.ts`, three places), so the metadata-hiding class also applies in popout windows.
- **`instanceof HTMLElement` to `.instanceOf(HTMLElement)`** (`settings.ts`, two places) and **`createEl`** for the four manual element creations in `modals.ts`.
- **`logger.ts`:** the single `console` site gets one `eslint-disable-next-line` with a description (`eslint-comments/require-description` is an error in the newest scanner layers).
- **Guards for items already at zero:** `require()` and `hasOwnProperty`. The rules stay on.

### Promise findings
- `obsidianmd/no-misused-promises` (12): modal button handlers that are `async`. Wrap with a small `safeAsync(fn)` helper that catches, logs, and shows a `Notice` (task 07). Block 3 task 02 later moves these modals to `ui/`.
- `no-floating-promises` (10): tasks 01, 03, 05 and 07 fix the ones they touch. This task verifies zero remain.
- `await-thenable` (9): remove `await` on non-promises. An `await` on a plain value still yields to the microtask queue, so removing it can change ordering. Check each of the nine against the queue from task 03 before removing.

### Tooling
- Replace `builtin-modules` with `import { builtinModules } from "node:module"` in `esbuild.config.mjs`. Remove the dependency from `package.json`. The `depend/ban-dependencies` rule flags the package.
- `tsconfig.json`: delete `baseUrl` and the `moduleResolution: "node"` override (the base config already sets `bundler`). Verified on TypeScript 5.0.4: `tsc` passes and `svelte-check` is unchanged. This clears the TypeScript 6 deprecation messages in the editor.
- Re-check the unused-dependency list against `package.json` after task 02 removes `fs`-related code.

### Scanner gate
- Make `eslint.config.mjs` scanner-equivalent: the documented "Full scanner-equivalent configuration", with the newest layer on (`@typescript-eslint/no-unsafe-*` at warn and the stricter `obsidianmd` rules at error). Keep `parserOptions.project` rather than `projectService` while TypeScript is 5.0.
- Scope the Svelte block to `files: ["**/*.svelte"]`. Today it also applies to `package.json` and crashes.
- Scripts: `lint:scanner` runs `eslint .` with the scanner config (source), and `lint:meta` runs `eslint package.json manifest.json LICENSE`. `build` stays unchanged.
- Add both to the CI job from task 08.

## Risks and consequences

- Removing a local that looks unused can remove a call with a side effect. Read before deleting.
- Removing `await` changes microtask ordering. Test the queue and the sync handlers after.
- `activeDocument` differs from `document` only when a popout window is focused. In the main window nothing changes.
- A stricter local lint will show more findings than the bot did if the scanner has changed. The gate follows the plugin documentation, so it can lag the live scanner. Re-run the gate against the plugin's latest version before each release.
- The typing findings (`no-unsafe-*`, `no-explicit-any`) stay until Block 3 task 07. They are warnings in the scanner and do not block a release, but they stay on the list.

## Done when

- `npm run lint:scanner` reports 0 findings except the typing group, which Block 3 task 07 closes.
- `npm run lint:meta` reports 0 findings.
- `npm run build` still passes and the smoke checklist is unchanged.