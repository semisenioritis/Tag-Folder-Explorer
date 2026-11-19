/**
 * Pure drag-and-drop helpers shared by the explorer views.
 *
 * The data formats here are a contract: the internal `application/json` payload written by
 * `handleDragStart`, and the `text/uri-list` that Obsidian's own file explorer produces.
 * Drop *behavior* is not shared: each view applies its own rules.
 */

export interface DragPayload {
type: 'folder' | 'file';
path: string;
parentPath: string;
source: 'internal' | 'external';
}

/** Attach the internal payload to a drag that starts on a folder or file row. */
export function handleDragStart(event: DragEvent, type: 'folder' | 'file', path: string, parentPath: string): void {
if (event.dataTransfer) {
event.dataTransfer.setData('application/json', JSON.stringify({ type, path, parentPath }));
event.dataTransfer.effectAllowed = 'move';
}
}

/** Extract the vault file path from an `obsidian://open?file=...` URI, or null. */
export function parseObsidianOpenUri(raw: string): string | null {
try {
const url = new URL(raw);
if (url.protocol !== 'obsidian:') return null;

const fileParam = url.searchParams.get('file');
if (!fileParam) return null;

return decodeURIComponent(fileParam).trim() || null;
} catch {
return null;
}
}

/** Extract a vault file path from the text of an external drop (Obsidian URI, wikilink or plain path). */
export function parseExternalFilePath(raw: string): string | null {
const trimmed = raw.trim();
if (!trimmed) return null;

const firstLine = trimmed
.split(/\r?\n/)
.map((line) => line.trim())
.find((line) => line.length > 0 && !line.startsWith('#'));

if (!firstLine) return null;

const obsidianPath = parseObsidianOpenUri(firstLine);
if (obsidianPath) return obsidianPath;

const wikiMatch = firstLine.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
if (wikiMatch?.[1]) {
return wikiMatch[1].trim() || null;
}

return firstLine;
}

/** Read what is being dragged: the internal payload first, then an external Obsidian drop. */
export function getDragPayload(event: DragEvent): DragPayload | null {
const dataTransfer = event.dataTransfer;
if (!dataTransfer) return null;

// Internal plugin drag payload
const internalJson = dataTransfer.getData('application/json');
if (internalJson) {
try {
const data = JSON.parse(internalJson) as Partial<DragPayload>;
if ((data.type === 'folder' || data.type === 'file') && typeof data.path === 'string') {
return {
type: data.type,
path: data.path,
parentPath: typeof data.parentPath === 'string' ? data.parentPath : '',
source: 'internal',
};
}
} catch {
// Not our payload: fall through to the external format.
}
}

// External drag payload from Obsidian file explorer
const textUriList = dataTransfer.getData('text/uri-list');
const uriPath = parseExternalFilePath(textUriList);
if (uriPath) {
return { type: 'file', path: uriPath, parentPath: '', source: 'external' };
}

return null;
}