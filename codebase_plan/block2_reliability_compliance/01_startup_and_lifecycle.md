# Task 01: startup and lifecycle

## Affects

`main.ts` (`onload`, `initializeTree`, `onunload`), `TagExplorerView`, and the four Svelte components that throw `"model is not initialized"`: `TagExplorer`, `MainView`, `TagTreeView`, `MetadataView`.

## Problems being fixed

- `if (this.app.metadataCache.resolvedLinks)` is always truthy (it is an object), so the wait-for-`resolved` branch never runs. The tree may be built before the cache is populated, and then `getFileCache` returns null and tags are missed.
- `initializeTree` is async and not awaited by `onLayoutReady`. Until it finishes, `treeRoot`, `controller` and `model` are `null`.
- A restored explorer tab (Obsidian reopens saved tabs at startup) calls `onOpen` before the tree exists. The four components throw. This likely already fails when Obsidian is restarted with a tab open.
- `initializeTree` could run twice (layout-ready path and `resolved` event) and would register the `EventListener` twice.
- `onunload` nulls fields but does not clean up views. `activeViews` holds strong view references and is never cleared.

## What it does

- A single guarded `initializeTree` with a "tree ready" signal.
- Build at layout-ready. If the metadata cache finishes resolving later, rebuild once and update views. **Verify** the exact readiness API in current Obsidian types before choosing it.
- Views show a loading state until the tree is ready, then mount the explorer. No component throws on a missing model.
- `onunload`: unmount Svelte components, clear `activeViews`, drop references, remove the body class. Obsidian guidance is not to detach leaves in `onunload`. **Verify** what Obsidian does with open views of an unloaded plugin.
- Register the `EventListener` exactly once.

## Risks and consequences

- Waiting only for a `resolved` event is wrong when the plugin is enabled mid-session, because the event has already fired and the wait never ends.
- A rebuild must not duplicate event registrations or lose open views' state (current path, back and forward stacks).
- Multiple explorer tabs are intended and must keep working (`getLeaf(true)` stays).
- This task changes visible behavior (loading state). Note it for the owner.

## Done when

Restarting with an explorer tab open works. Disabling and re-enabling the plugin many times leaves no stray listeners, views, or body classes.
