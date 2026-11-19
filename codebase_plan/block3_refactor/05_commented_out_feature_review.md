# Task 05: commented-out feature review (new, from owner answer 3)

## Owner statement

Most of these features are already implemented. Where code is commented out, it was breaking something, was unnecessary, or was not fully implemented yet. Leave it as is. Tackle it when we get to it, as a separate task.

## Scope

Review commented-out **feature** code one item at a time, with the owner deciding for each: finish it, delete it, or keep it.

Known items:
- `MainView.svelte` legend context-menu item (about lines 69-87), with the note "for some reason it was not displaying the results on the ui".
- `MainView.svelte` around 120 lines of commented context-menu items.
- `controller.triggerLegendModal` use in commented code (MainView 69, 184), and `Orchestrator.triggerLegendModal`.
- A commented `<button class="legend-button circle" ... await getFileButtonColor(file) ...>` in `MainView` (two places).
- `ModelInterface` commented lines.
- `interfaces.ts` commented blocks (e.g. around lines 490-497).
- `fileEditor.ts` commented `metadataCreateSpecificEmptyFrontmatter` and `metadataAddCreatedProperty`.
- The `🔴 write action divider/start/plan/step pre/post` markers and sync-handler pseudocode (design notes for the rollback work, see task 06).

## Rules

- Nothing here is touched in Blocks 1 and 2.
- For each item, record: what it was for, why it was disabled, what is needed to finish it.
- The owner decides. Do not delete without a decision.

## Done when

Every item has a recorded decision and is either finished, removed, or documented.
