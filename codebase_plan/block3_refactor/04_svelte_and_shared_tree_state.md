# Task 04: Svelte and shared tree state

## Affects

`MainView.svelte` (1,889), `TagExplorer.svelte` (1,153), `TagTreeView.svelte` (789), `MetadataView.svelte` (787), `BottomStatusBar.svelte` (38), `main.ts`, the view class, and (for shared state) the plugin's broadcast code.

## What it does

### Components
- Row components for blocks, list and details views, replacing about 6 copies of the same markup in `MainView`.
- An `Icon` component or `setIcon` use for the inline SVGs (24 in `MainView`, 34 in `TagExplorer`, 7 in `TagTreeView`, 4 in `MetadataView`).
- Split `TagExplorer` (layout, navigation history, drag-and-drop orchestration, resizing) and `MainView`'s 883-line script.
- Keyed `{#each}` blocks. `$state.raw` for the tree instead of deep `$state`.
- Replace per-row controller calls (`getFolderPinnedStatus`, `getFolderButtonColor` inline in templates, and a per-file `Promise.all` in an `$effect`) with one bulk model call.
- Accessibility: tree roles (`tree`, `treeitem`, `aria-expanded`), Space key support, labels on status icons and textareas, keyboard path for pin, legend and context menu, resize handles with `role="separator"`, `role="status"` on the loading overlay, `role="grid"` for details view.
- Theme: replace hard-coded colors (`#ffffffB0`, `#333`, `#e84545`, `#3cb44a`, the white chevron image) with theme variables.
- Bug fixes: null guard for `metadataViewData` in `MetadataView`, per-row click timeout instead of one shared, window resize listener cleanup in `onDestroy`, honor the `newTreeData` argument in `TagTreeView.updateTreeData`.
- Virtualization for large folders and trees, if profiling shows a need.

### Shared tree state (deviation D6)
- One shared reactive tree state that all open tabs subscribe to. This matches the owner's "all tabs show the central object" design.
- Removes `activeViews`, version polling on `active-leaf-change`, and the push of a full serialized tree to visible views.
- Touches `main`, the view class, and three components. Needs its own detailed plan and approval.

## Risks and consequences

- It touches the most visible code.
- Row components change prop shapes.
- The shared tree state replaces working (if heavy) machinery. Keep the old path until the new one is verified.
- Svelte `$derived` with top-level `await` in `MetadataView` needs the `experimental.async` flag. Review whether to keep it.

## Done when

Visual and keyboard behavior match the smoke checklist, and the large components are split.
