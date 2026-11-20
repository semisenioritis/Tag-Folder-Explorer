# Task 07: type safety (remove `any`)

## Affects

Everything that touches `any`: about 99 explicit `any` and about 370 unsafe-`any` findings across `orchestrator.ts`, `fileEditor.ts`, `TreeRoot.ts`, `FileLeaf.ts`, `TagNode.ts`, `controllerInterface.ts`, `TagExplorerView.ts`, and the Svelte components. Maps to the unsafe-`any` rows in `codebase_plan/00b_validator_findings_traceability.md`.

## Why this task exists

The validator reported about 1,300 findings of this type on the published version (unsafe member access 697, `any` 212, unsafe assignment 200, unsafe call 164, unsafe argument 32, unsafe return 9, union 2). Block 1 removed dead code and brought the count down, but the rest cannot be fixed mechanically: each `any` needs a real type. My earlier lint backlog assigned them to "Block 3" without a task. This is that task.

## What it does

Most unsafe findings come from a few sources. Fix the source and the findings disappear.

1. **Frontmatter.** `fileManager.processFrontMatter` hands out `any`. Define a `Frontmatter` type (`Record<string, unknown>`) and small typed readers and writers for the plugin's keys (`tags`, `🏷-Legend-<color>`, pinned, bookmark). The key and value formats do not change.
2. **Folder metadata JSON.** `JSON.parse` returns `any`. Define `FolderMetadata` (path, name, created, modified, description, legend with six colors, raindropLink, pinned, bookmark) and validate it once where it is read, in the metadata layer from Block 2 task 02.
3. **Serialized tree.** `getSortedTree` returns `unknown` and `any[]` today. Type `SerializedTreeData`, the folder and file records, and the detailed-view data end to end, so the Svelte components get real types.
4. **Errors.** `error?: any` in `OperationResult` becomes `error?: unknown`, with one `errorMessage(error)` helper. Callers that read `error.message` use it.
5. **Records and handlers.** `Record<string, any>` for update payloads becomes typed payload interfaces (description, legend, raindrop link).
6. **Interfaces.** Replace `any` in `types/interfaces.ts`.

Order inside the task: types first (1 to 3), then call sites, then the `error` change last because it touches the most signatures.

## Risks and consequences

- **YAML format.** The typed readers and writers must produce byte-identical frontmatter. Use the golden tests from Block 4 task 04, or an equivalent before and after comparison on a copy of the vault, before and after.
- **Runtime validation can change behavior.** A typed reader that rejects bad JSON instead of passing it through will now return an empty result. Keep the existing "corrupt JSON returns `{}`" behavior from task 02.
- **`unknown` forces narrowing.** That finds real bugs (for example reads of `error.message` on non-Error values). Expect a few behavior fixes. Each one is listed in the task report.
- Large but mechanical diff. Do it module by module, build after each, and keep `svelte-check` at or below its baseline.
- Ordering: after Block 3 tasks 01 to 03, so each module is typed once, not typed and then split.

## Done when

`npm run lint:scanner` reports 0 findings in the `no-unsafe-*`, `no-explicit-any`, `no-redundant-type-constituents` group. `svelte-check` is at 0 errors (the baseline 7 `null` errors were fixed by Block 2 task 01 and this task).