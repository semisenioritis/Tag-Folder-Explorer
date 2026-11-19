import { createHash } from "crypto";
import * as path from "path";

/** Hidden folder at the vault root that holds one JSON file per tag folder. */
export const METADATA_FOLDER_NAME = ".TagNodeMeta";

/** Tag paths are stored without a leading "#". */
export function normalizeTagPathForMetadata(tagPath: string): string {
return tagPath.startsWith("#") ? tagPath.slice(1) : tagPath;
}

/**
 * sha256 hex digest of the normalized tag path. This is the only place that hashes tag paths.
 * The result is part of the on-disk format: do not change the input or the algorithm.
 */
export function hashTagPath(tagPath: string): string {
return createHash("sha256").update(normalizeTagPathForMetadata(tagPath)).digest("hex");
}

/** File name of the metadata JSON for a tag path: `<sha256(tagPath)>.json`. */
export function metadataFileName(tagPath: string): string {
return `${hashTagPath(tagPath)}.json`;
}

/** Absolute path of the metadata folder inside the vault. */
export function metadataFolderPath(vaultBasePath: string): string {
return path.join(vaultBasePath, METADATA_FOLDER_NAME);
}

/** Absolute path of the metadata JSON for a tag path. */
export function metadataFilePath(vaultBasePath: string, tagPath: string): string {
return path.join(metadataFolderPath(vaultBasePath), metadataFileName(tagPath));
}