# Task 04: central logger

## Affects

New `utils/logger.ts`, `settings.ts` (new `debugLogging` setting, default `false`), `main.ts`, and every file that calls `console.*` (about 300 calls: orchestrator ~126, fileEditor ~55, TreeRoot ~19, TagNode ~14, eventlistener 14, main 9, modelInterface 8, FileLeaf 3, controllerInterface 1, and Svelte: TagExplorer 23, MetadataView 10, TagTreeView 8, MainView 7).

## What it does

- Logger with `debug`, `info`, `warn`, `error`. `error` and `warn` are always on. `debug` and `info` follow the setting.
- `console.log` becomes `logger.debug`. `console.error` and `console.warn` go through the logger.
- Delete debug dumps instead of converting them: emoji logs, `console.log(this.treeRoot)`, the `"hi"` log, `"part1"`/`"part2"` logs, the `"derivation was triggered"` logs, per-event logging in the listener.
- Add a toggle in the settings tab.
- Mechanical replacement only. No change in control flow. No `Notice` yet (that is Block 2 task 07).

## Risks and consequences

- JavaScript evaluates arguments even when the log is off. Calls like `console.log(structuredClone(x))` or `JSON.parse(JSON.stringify(x))` still cost something, so delete them.
- The logger must not import the plugin or settings, or it creates a new cycle. The plugin sets its flag at load and on settings change.
- Existing `data.json` files lack the new key. `Object.assign({}, DEFAULT_SETTINGS, loaded)` already covers that.
- Run after task 03 so no logs are converted that task 03 deletes.

## Done when

The console is silent during normal use. The toggle brings back the key debug logs.
