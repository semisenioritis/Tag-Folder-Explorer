# Block 4: tests (optional, run when the owner chooses)

## Goal

Add automated tests that cover both the Obsidian API layer and individual functions. The owner asked for this as a final step that can be chosen later.

## Why it is cheap later

Blocks 1 and 2 pass dependencies in (app, plugin host, storage) instead of reading globals, and put the metadata store and queue behind interfaces. No rework is needed to add tests.

## Tasks

| # | Task | File |
|---|---|---|
| 01 | Unit tests | `01_unit_tests.md` |
| 02 | Obsidian API layer tests | `02_obsidian_api_layer_tests.md` |
| 03 | Svelte component tests | `03_svelte_component_tests.md` |
| 04 | Golden and integration tests | `04_golden_and_integration_tests.md` |

## Shared setup

- `vitest` with a stub module aliased to `obsidian` (Obsidian ships types only, no runtime).
- `jsdom` for components.
- A `test` script and a CI step. A coverage threshold is optional.

## Exit criteria

All tests pass in CI, and each seam named in the task files has coverage.
