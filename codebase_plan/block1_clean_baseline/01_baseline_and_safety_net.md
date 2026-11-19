# Task 01: baseline and safety net

## Affects

A new git branch, a new `docs/` folder, and recorded numbers. No source changes.

## What it does

- Create branch `chore/baseline-cleanup`.
- Record current results of `tsc -noEmit -skipLibCheck`, `npm run svelte-check` and `npm run build`: error and warning counts.
- Record `main.js` size, `git ls-files`, and the active and commented `console.*` count per file.
- Write `docs/smoke-test.md`, a manual checklist:
  - open the explorer from ribbon and command
  - navigate, back and forward
  - drag a file onto a folder (internal) and from Obsidian's file explorer (external)
  - pin and unpin a file and a folder
  - set a legend color
  - rename and delete a file and a folder
  - edit a folder description and a file description
  - create a file and a folder
  - restart Obsidian with an explorer tab open
  - open two explorer tabs on different folders
- Ask the owner to copy their test vault as a safety copy.

## Risks and consequences

- The baseline may already fail `tsc` or `svelte-check`. Then "no regression" means "no more errors than baseline". The `build` script must not start failing on existing errors (see task 02).
- The smoke checklist is manual and only catches what is checked.
- Restarting with a tab open probably already fails (null model at startup, see Block 2 task 01). Record that as a known baseline failure, not a regression.

## Done when

Baseline numbers and the checklist exist in `docs/`.
