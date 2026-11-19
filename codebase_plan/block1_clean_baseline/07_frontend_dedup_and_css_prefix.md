# Task 07: frontend de-duplication and CSS prefix

## Affects

`MainView.svelte`, `TagTreeView.svelte`, `TagExplorer.svelte`, `MetadataView.svelte`, `styles.css`, `modals.ts`, `settings.ts`, and new `ui/dnd.ts`, `ui/format.ts`, `ui/colors.ts`.

## What it does

- Share the pure drag helpers in `ui/dnd.ts`: `parseObsidianOpenUri`, `parseExternalFilePath`, `getDragPayload`, `handleDragStart`, and the `DragPayload` type (about 80 duplicated lines).
- One date formatter in `ui/format.ts` (`formatDate` in `MainView` and `MetadataView`, `formatTimestamp` in `MetadataView`).
- Move `colorDictionary` and `getColorForName` (defined in `TagExplorer`, passed down as props) to `ui/colors.ts`.
- Prefix global CSS (`.modal-input`, `.modal-button-container`, `.modal-left-button`, `.modal-right-button`, `.setting-item-control-wide`, `.setting-item-data-contents`) with `tfe-`. Update `styles.css`, `modals.ts` and `settings.ts` together. Remove the leftover sample-plugin comment and commented debug rules in `styles.css`.
- Leave the repeated row markup (about 6 copies in `MainView`) and inline SVGs for Block 3 task 04.

## Risks and consequences

- **Drop handlers differ.** `MainView.handleBgDrop` and `TagTreeView.handleRootDrop` apply different rules. Share only the pure parsing and drag-start, not the drop logic.
- **The drag data format is a contract.** The internal `application/json` payload and the external `text/uri-list` parsing must not change. Test dragging from the explorer tree and from Obsidian's file explorer.
- `formatDate` and `formatTimestamp` have slightly different options. Confirm they match before merging, or parametrize.
- **CSS:** `.modal-button-container` is an Obsidian core class. Today `styles.css` restyles every Obsidian modal. Prefixing fixes that leak, but the plugin's own modals may lose styling they get from the core class. Check visually.
- Removing `colorDictionary` and `getColorForName` from props means editing `TagExplorer`, `MainView` and `MetadataView` together.

## Done when

`svelte-check` is unchanged. Drag behavior, modals and settings look the same as baseline.
