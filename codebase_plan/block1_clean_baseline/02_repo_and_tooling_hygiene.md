# Task 02: repo and tooling hygiene

## Affects

`package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`, `.eslintignore`, `.editorconfig`, `versions.json`, `manifest.json`, `esbuild.config.mjs`, `svelte.config.js`, tracked `dist/*`, `mainold.ts.txt`, `sampleRollbackRegister.*`.

## What it does

### Files
- Delete `mainold.ts.txt`.
- Move `sampleRollbackRegister.json` and `.ndjson` to `docs/design/` (they feed the future rollback journal; do not delete).
- `git rm --cached dist/*`, add `dist/` to `.gitignore` and `.eslintignore`. Fix the trailing space on the `.vscode` line.

### Dependencies
- Re-verify with grep that nothing imports these, then uninstall: `bits-ui`, `@lucide/svelte`, `@tailwindcss/vite`, `tailwindcss`, `tailwind-merge`, `tailwind-variants`, `tw-animate-css`, `clsx`, `svelte-sidebar-panels`, `@internationalized/date`.
- Everything is bundled, so nothing needs to be in `dependencies`.
- Pin `obsidian` to the installed version instead of `latest`.
- Do not upgrade esbuild, TypeScript or Svelte in this block.

### Versions
- Sync `package.json` to 1.0.1 to match `manifest.json`.
- Add `1.0.1 -> 1.7.2` to `versions.json`.
- Remove `fundingUrl: ""` from `manifest.json`.
- Fill `author` and `repository` in `package.json`.

### `tsconfig.json`
- Fix `include` to `src/**/*.ts` and `src/**/*.svelte`; remove the `mainold.ts.txtt` entry.
- Remove the `$lib` paths (the folder does not exist). Remove `inlineSources`.
- Align `lib` with `target`.
- Add `exclude` for `node_modules` and `dist`.
- Strict flags: try `strictFunctionTypes`, `noImplicitThis` one at a time and keep only those that compile with no code change. `useUnknownInCatchVariables` will flag every `catch (error)`, so it goes to `docs/strictness-backlog.md`.

### Build and lint
- `build` runs `tsc`, then `svelte-check`, then esbuild. Gate `svelte-check` on "no new errors" if the baseline has errors.
- Fix the dev watch so `dist/main.js` is re-copied after every rebuild. Call `context.dispose()` in the production path.
- Dedupe the Svelte options shared by `svelte.config.js` and `esbuild.config.mjs`.
- Add `eslint`, `typescript-eslint`, `eslint-plugin-svelte` and `eslint-plugin-obsidianmd` with a flat config and a `lint` script. Report-only: fix only auto-fixable, non-semantic issues, and put the rest in `docs/lint-backlog.md`.
- Align `.editorconfig` with the actual indentation. Do not reformat the whole codebase.

## Risks and consequences

- `npm uninstall` can shift transitive versions and churn the lockfile. Rebuild and compare bundle size.
- Narrowing `include` and changing `lib` can expose or hide type errors. Compare against baseline.
- The lint plugins need newer ESLint and typescript-eslint than the pinned 5.29. That is a toolchain upgrade, so keep it report-only and separate from source edits.
- `useUnknownInCatchVariables` and similar flags can force deep changes. The owner's rule: fix a flag only if the change is small.
- Align versions before `npm version` is used again, or `version-bump.mjs` writes the wrong map entry.

## Done when

`npm run build` runs the full chain and the bundle is no larger than baseline.
