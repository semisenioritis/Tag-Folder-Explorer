# Smoke test checklist

Run in a copy of the test vault after every Block 1 task. Record pass/fail per item.

## Results: end of Block 1 (build from commit `d1161be`)

16 of 17 pass. The only failure is the restart case, which was already failing at baseline.


- [x] Open the explorer from the ribbon icon.
- [x] Open the explorer from the command palette.
- [x] Navigate into folders, then use back and forward.
- [x] Drag a file onto a folder inside the explorer (internal drop).
- [x] Drag a file from Obsidian's file explorer into a folder (external drop).
- [x] Pin and unpin a file.
- [x] Pin and unpin a folder.
- [x] Set a legend color on a file and on a folder.
- [x] Rename a file.
- [x] Rename a folder.
- [x] Delete a file.
- [x] Delete a folder.
- [x] Edit a folder description.
- [x] Edit a file description.
- [x] Create a file.
- [x] Create a folder (and confirm an empty folder survives a reload).
- [ ] Restart Obsidian with an explorer tab open. (Known baseline failure until Block 2 task 01.) **FAIL** (expected: baseline failure, fixed in Block 2 task 01)
- [x] Open two explorer tabs on different folders and confirm both stay in sync.
