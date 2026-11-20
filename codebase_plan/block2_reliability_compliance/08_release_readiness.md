# Task 08: release readiness

## Affects

`README.md`, `.github/workflows/`, `manifest.json`, `versions.json`, `package.json`, `LICENSE`.

## What it does

- README: what the plugin does, how to use it, and a data disclosure:
  - it edits the YAML of notes (tags and the legend, pin and bookmark keys)
  - it writes a hidden `.TagNodeMeta` folder in the vault, and this folder is not synced by Obsidian Sync
  - the Raindrop link opens an external site in a web viewer
  - copy, cut and paste of files and folders use the system clipboard (the validator reports "Clipboard access")
  - after task 02, the plugin reads and writes only inside the vault (the validator reports "Direct filesystem access" today)
- A release workflow that builds and attaches `main.js`, `manifest.json` and `styles.css` on a tag.
- **Artifact attestations.** The validator reports "Missing GitHub artifact attestations" for the 3 assets. Give the job `contents: write`, `id-token: write` and `attestations: write`, and attest the three files with `actions/attest-build-provenance` (use the current major version; verify at implementation time).
- **Release manifest must equal the repository manifest.** The validator reports "Release manifest differs from repository manifest". Attach the root `manifest.json` from the tagged commit (never a copy from `dist/`), and fail the workflow if `cmp manifest.json <attached manifest.json>` differs or if the manifest version does not equal the tag.
- **LICENSE.** It still names "Dynalist Inc." and 2025 (sample-plugin template). Set the real copyright holder and the current year. `npm run lint:meta` (task 09) checks this.
- A check that the tag equals the manifest version with no `v` prefix. Current git tags mix `v1.0.0` and `1.0.0`.
- A pass against the `obsidian-releases` validator rules (manifest fields, `fundingUrl`, description).
- Test in a clean vault with only the three release files.
- `isDesktopOnly` stays true (Node and Electron APIs are used until task 02 removes them; revisit after).

## Risks and consequences

- No runtime behavior change.
- The workflow needs the right permissions to create releases.
- `minAppVersion` must match APIs actually used (verify after task 07).

## Done when

A tag produces a release with the three assets.
