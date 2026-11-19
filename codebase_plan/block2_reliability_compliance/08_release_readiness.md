# Task 08: release readiness

## Affects

`README.md`, `.github/workflows/`, `manifest.json`, `versions.json`, `package.json`, `LICENSE`.

## What it does

- README: what the plugin does, how to use it, and a data disclosure:
  - it edits the YAML of notes (tags and the legend, pin and bookmark keys)
  - it writes a hidden `.TagNodeMeta` folder in the vault, and this folder is not synced by Obsidian Sync
  - the Raindrop link opens an external site in a web viewer
- A release workflow that builds and attaches `main.js`, `manifest.json` and `styles.css` on a tag.
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
