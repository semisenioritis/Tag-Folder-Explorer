import { FileSystemAdapter } from "obsidian";
import type { App } from "obsidian";

/**
 * Absolute path of the vault folder on disk, or "" when the vault is not backed by
 * the desktop file system (the plugin is desktop-only, so this is the normal case).
 */
export function getVaultBasePath(app: App): string {
const adapter = app.vault.adapter;
return adapter instanceof FileSystemAdapter ? adapter.getBasePath() || "" : "";
}