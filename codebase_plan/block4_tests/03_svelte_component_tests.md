# Task 03: Svelte component tests

## Tooling

`@testing-library/svelte` with `jsdom`. Components get a fake controller and model.

## Targets

- `TagTreeView`: expand and collapse, folder click and Ctrl-click, drag start and drop payloads, drop-target highlight, empty states for each `treeView` mode.
- `MainView`: blocks, list and details modes, pinned vs unpinned sections, click vs double-click timing per row, context menu, drop on background, legend and pin buttons.
- `MetadataView`: null data guard, description edit, Raindrop URL validation, legend edit, tag pill click.
- `TagExplorer`: navigation history (back, forward, home, parent), `getNearestExistingPath`, collapse and resize (with listener cleanup), loading overlay tied to the busy store, exported `updateTreeData`, `refreshCurrentNode`, `getNavigationState`.
- `BottomStatusBar`: reflects the busy store, has an accessible label.
- Accessibility assertions: roles, `aria-expanded`, keyboard activation (Enter and Space).

## Notes

- Write these after Block 3 task 04, because row components change the structure.
- Mocking the Obsidian `Menu` and `setIcon` is needed.
