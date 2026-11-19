import type { App } from "obsidian";

/**
 * The small surface of the plugin that the backend (orchestrator) depends on.
 * The backend imports this type instead of the plugin class, so `main.ts` and
 * `orchestrator.ts` no longer import each other.
 */
export interface PluginHost {
readonly app: App;
getTagExplorerInconsistentStateFlag(): boolean;
setTagExplorerInconsistentStateFlag(value: boolean): void;
broadcastTreeUpdate(): void;
}