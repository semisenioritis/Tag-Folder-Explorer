/**
 * Name sanitizing shared by the tree and the orchestrator.
 * Both functions are used for names that end up on disk or in tag paths, so their
 * output must stay stable.
 */

/**
 * Make a string safe to use as one tag path segment: spaces become underscores, and anything
 * other than letters, numbers, "_", "-" and emoji is removed.
 */
export function sanitizeTagName(name: string): string {
return name.replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_\-\p{Extended_Pictographic}]/gu, "");
}

/** Remove the characters Obsidian does not allow in file names (`[ ] # ^ | \ / : ?`) and trim. */
export function sanitizeFileName(name: string): string {
return name.replace(/[\[\]#^|\\\/:\?]/g, "").trim();
}