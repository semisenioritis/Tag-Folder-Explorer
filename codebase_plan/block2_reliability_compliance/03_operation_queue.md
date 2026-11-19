# Task 03: operation queue

## Affects

- The lock accessors in `main.ts`.
- `orchestrator.ts`: about 70 methods and about 380 hand-written lock lines (`if (owner){this.setInconsistencyFlag(false)}`).
- Busy state in `BottomStatusBar` and `TagExplorer` (via the Block 1 callback).
- The sync handlers, which return early while the flag is set.
- `ControllerInterface` (which returns `"Inconsistency flag is true"` today).

## Owner decision

Operations that arrive while another runs should be queued, not rejected. Rejection is the current easy way out.

## Deviation

**D4:** the queue is owned by the orchestrator. The plugin only receives a busy callback for the UI.

## What it does

- One `runOperation(name, fn)`: runs operations in order, always releases in a `finally`, never stops on an error.
- Public methods go through it, which removes the boilerplate. `owner=false` composite calls call the internal unlocked implementation, and never wait on the queue.
- Busy flag for the UI.
- Broadcast the tree once after a batch where possible.
- External events are queued behind running operations, not dropped (see task 05).

## Risks and consequences

- **Deadlock:** an operation that awaits another queued public operation waits forever. Composite operations (paste, folder moves, recreate) must call internal versions.
- **Mass edit:** 70 methods change mechanically. Do one family at a time with a smoke test between. A script can do the pattern, but review each diff.
- **Own-edit echo:** once external events queue instead of drop, the plugin's own frontmatter writes arrive as `modify` events after the operation ends. They must be recognized and skipped (task 05).
- **Stale metadata cache:** Obsidian updates its cache after a write finishes, not instantly. A sync handler that reads tags right after an edit can see old tags and revert the tree. **Verify** how `FileLeaf.retrieveAllTagPaths` reads tags.
- **Visible behavior change:** rapid clicks that used to be dropped now execute in order. Dragging 10 files runs 10 operations.
- No Svelte code may depend on the `"Inconsistency flag is true"` string. Grep first.
- Modal triggers must not hold the queue while a dialog is open.
- Consider a timeout so a runaway operation cannot block the queue forever.

## Done when

A stuck-lock state is impossible, and rapid actions are processed in order.
