import { App, TFile, normalizePath } from "obsidian";
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './utils/logger';


/**
 * Create a new file at the specified path with automatic name conflict resolution
 * @param app - Obsidian App instance
 * @param path - Folder path where the file should be created (defaults to vault root)
 * @param fileName - File name with extension (defaults to "Untitled.md")
 * @returns The created TFile object
 */
export async function createNewFile(
	app: App,
	path: string,
	fileName: string = "Untitled"
): Promise<{ success: boolean; file: TFile | null }> {

	try {
		const extension = ".md"
		// Build the full path
		const folderPath = path ? `${path}/` : "";
		fileName = fileName.replace(/[\[\]#^|\\\/:\?]/g, '').trim();
		
		// Find a unique file name
		let finalName = fileName + extension;
		let counter = 1;
		
		while (await app.vault.adapter.exists(normalizePath(`${folderPath}${finalName}`), false)) {
			finalName = `${fileName} ${counter}${extension}`;
			counter++;
		}
		
		const fullPath = `${folderPath}${finalName}`;
		const file = await app.vault.create(fullPath, "");
		return { success: true, file };
	} catch (error) {
		logger.error("Error creating file:", error);
		return { success: false, file: null };
	}
}

/**
 * Create tags frontmatter property in a file if it doesn't already exist
 * @param app - Obsidian App instance
 * @param file - TFile object to add frontmatter to
 * @returns Object with success status and the file
 */
export async function createTagsFrontMatter(
	app: App,
	file: TFile
): Promise<{ success: boolean; file: TFile }> {
	try {
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			// Initialize tags array if it doesn't exist
			if (!frontmatter.tags) {
				logger.debug('Creating frontmatter for file.')
				frontmatter.tags = [];
			}else{
				logger.debug('Frontmatter tags already exists. No changes made.');
			}
		})
		return { success: true, file };
	} catch (error) {
		logger.error("Error creating frontmatter:", error);
		return { success: false, file };
	}
}

/**
 * Rename a file with automatic name conflict resolution
 * @param app - Obsidian App instance
 * @param file - TFile object to rename
 * @param newName - New file name (without extension)
 * @returns Object with success status and the renamed file
 */
export async function renameFile(
	app: App,
	file: TFile,
	newName: string
): Promise<{ success: boolean; file: TFile }> {
	try {
		const extension = file.extension;
		const folderPath = file.parent ? `${file.parent.path}` : "";
		newName = newName.replace(/[\[\]#^|\\\/:\?]/g, '').trim();

		
		// Find a unique file name
		let finalName = `${newName}.${extension}`;
		let counter = 1;
		

		let normalizedPath = `${folderPath}${finalName}`.replace(/^\/+/, '');

		while (true) {


			const existingFile = app.vault.getAbstractFileByPath(normalizedPath);
			if (!existingFile || existingFile === file) {
				break;
			}
			finalName = `${newName} ${counter}.${extension}`;
			counter++;
			normalizedPath = `${folderPath}${finalName}`.replace(/^\/+/, '');
		}
		
		const newPath = `${folderPath}${finalName}`;
		await app.fileManager.renameFile(file, newPath);
		
		return { success: true, file };
	} catch (error) {
		logger.error("Error renaming file:", error);
		return { success: false, file };
	}
}

/**
 * Extract all tags from file body (not from YAML frontmatter)
 * @param app - Obsidian App instance
 * @param file - TFile object to extract tags from
 * @returns Array of tag strings from file body
 */
// 🔴🔴 DEPRECATED 
// reading tags from the body is not a bad idea, but just that im reading from the cache. 
// which means this could be stale at any point. 
// we have shifted away from this because functions end up using this function to read the state the write to physical. 
// if done frequently enough it will corrupt the cache, since the file changes mid read.
export async function extractAllTagsFromFileBody(
	app: App,
	file: TFile
): Promise<string[]> {
	try {

		// 
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.tags) {
			return [];
		}
		
		// Get tags from the cache (these are inline tags with positions)
		const bodyTags = cache.tags.map(tagCache => {
			// Remove '#' prefix from tag
			return tagCache.tag.startsWith('#') ? tagCache.tag.slice(1) : tagCache.tag;
		});
		
		return bodyTags;
	} catch (error) {
		logger.error("Error extracting tags from file body:", error);
		return [];
	}
}

/**
 * Remove a specific tag from the YAML frontmatter tags list
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @param tag - Tag to remove (with or without '#' prefix)
 * @returns Boolean indicating if the operation was successful
 */
export async function removeTagFromFileYaml(
	app: App,
	file: TFile,
	tag: string
): Promise<boolean> {
	try {
		// Check if the tag is valid

		if (tag === ""){
			return true
		}
		if (!checkIfTagIsValid(tag)) {
			return false;
		}
		
		// Normalize the tag (remove '#' if present)
		const normalizedTag = tag.startsWith('#') ? tag.slice(1) : tag;
		
		// Process frontmatter to update tags
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (frontmatter && frontmatter.tags) {
				let tags = frontmatter.tags;
				
				// Ensure tags is an array
				if (!Array.isArray(tags)) {
					tags = [tags];
				}
				
				// Filter out the tag to remove (normalize each tag for comparison)
				frontmatter.tags = tags.filter((t: string) => {
					const cleanTag = typeof t === 'string' && t.startsWith('#') ? t.slice(1) : t;
					return cleanTag !== normalizedTag;
				});

				// Optional cleanup if tags array is empty
				if (frontmatter.tags.length === 0) {
					delete frontmatter.tags;
				}
			}
		});
		
		return true;
	} catch (error) {
		logger.error("Error removing tag from frontmatter:", error);
		return false;
	}
}

/**
 * Add a tag to the YAML frontmatter tags list if it doesn't already exist
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @param tag - Tag to add (with or without '#' prefix)
 * @returns Boolean indicating if the operation was successful
 */
export async function addTagToFileYaml(
	app: App,
	file: TFile,
	tag: string
): Promise<boolean> {
	try {
		// Check if the tag is valid
		if (!checkIfTagIsValid(tag)) {
			return false;
		}

		// Normalize the tag (remove '#' if present)
		const normalizedTag = tag.startsWith('#') ? tag.slice(1) : tag;
		
		// Process frontmatter to add the tag
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			// Initialize tags array if it doesn't exist
			if (!frontmatter.tags) {
				frontmatter.tags = [];
			}
			
			// Ensure tags is an array
			if (!Array.isArray(frontmatter.tags)) {
				frontmatter.tags = [frontmatter.tags];
			}
			
			// Check if tag already exists (normalize for comparison)
			const tagExists = frontmatter.tags.some((t: string) => {
				const cleanTag = t.startsWith('#') ? t.slice(1) : t;
				return cleanTag === normalizedTag;
			});
			
			// Add tag if it doesn't exist
			if (!tagExists) {
				frontmatter.tags.push(normalizedTag);
			}
		});
		
		return true;
	} catch (error) {
		logger.error("Error adding tag to frontmatter:", error);
		return false;
	}
}

/**
 * Copy all tags from file body to YAML frontmatter (without removing them from body)
 * Useful for migrating to a frontmatter-only system
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @returns Boolean indicating if the operation was successful
 */
export async function shiftTagsFromBodyToMetadata(
	app: App,
	file: TFile
): Promise<boolean> {
	try {
		// Get all tags from the file body
		let bodyTags = await extractAllTagsFromFileBody(app, file);
		
		if (bodyTags.length === 0) {
			return true; // No tags to shift
		}
		
		const normalizedTags: string[] = [];

		for (const rawTag of bodyTags) {
			const tag = rawTag.startsWith('#') ? rawTag.slice(1) : rawTag;

			if (!checkIfTagIsValid(tag)) {
				return false;
			}

			normalizedTags.push(tag);
		}

		bodyTags = normalizedTags

		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (!frontmatter.tags) {
				frontmatter.tags = [];
			}

			if (!Array.isArray(frontmatter.tags)) {
				frontmatter.tags = [frontmatter.tags];
			}

			const existingTags = frontmatter.tags.map((t: string) =>
				t.startsWith('#') ? t.slice(1) : t
			);

			const combined = [...existingTags, ...normalizedTags];
			const uniqueTags = Array.from(new Set(combined));

			frontmatter.tags = uniqueTags;
		});


		
		return true;
	} catch (error) {
		logger.error("Error shifting tags from body to metadata:", error);
		return false;
	}
}

/**
 * Replace or add metadata sections in YAML frontmatter
 * Updates existing keys or creates them if they don't exist
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @param content - Object containing key-value pairs to update/add
 * @returns Boolean indicating if the operation was successful
 */
export async function replaceMetadataSection(
	app: App,
	file: TFile,
	content: Record<string, any>
): Promise<boolean> {
	try {
		// Process frontmatter to update/add keys
 
		// @ts-ignore
		const properties = app.metadataTypeManager?.properties;

		

		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			// Iterate through each key in the content object
			for (const key in content) {
				// let lowCaseKey = key.toLowerCase()
				// console.log(properties[lowCaseKey])
				
				// only check if the key already exists. only if exists get its widget. else if it is new then just create it
				// Update if exists, create if doesn't exist
				frontmatter[key] = content[key];
			}
		});
		
		return true;
	} catch (error) {
		logger.error("Error replacing metadata section:", error);
		return false;
	}
}

/**
 * Check if a tag string is valid
 * Valid tags can contain letters, numbers, underscores, hyphens, and forward slashes (for nesting)
 * @param tag - Tag string to validate (with or without '#' prefix)
 * @returns Boolean indicating if the tag is valid
 */
export function checkIfTagIsValid(tag: string): boolean {
	try {
		// Remove '#' prefix if present
		const normalizedTag = tag.startsWith('#') ? tag.slice(1) : tag;
		
		// Check if tag is empty
		if (!normalizedTag || normalizedTag.trim() === '') {
			return false;
		}
		
		// Check for invalid characters (spaces, special characters except / - _)
		// Valid characters: letters, numbers, underscore, hyphen, forward slash
		const validPattern = /^[a-zA-Z0-9_\-\/]+$/;
		if (!validPattern.test(normalizedTag)) {
			return false;
		}
		
		// Check for consecutive slashes
		if (normalizedTag.includes('//')) {
			return false;
		}
		
		// Check if starts or ends with slash
		if (normalizedTag.startsWith('/') || normalizedTag.endsWith('/')) {
			return false;
		}
		
		// Check if any segment is empty (e.g., "a//b" would have empty segment)
		const segments = normalizedTag.split('/');
		for (const segment of segments) {
			if (segment.trim() === '') {
				return false;
			}
		}
		
		return true;
	} catch (error) {
		logger.error("Error validating tag:", error);
		return false;
	}
}

// ==================== JSON METADATA FILE FUNCTIONS ====================
// These functions work with JSON metadata files outside the vault using fs




/**
 * Compute the metadata filename for a nested tag path using base64 encoding
 * @param tagPath - The nested tag path (e.g., "folder/subfolder/tag")
 * @returns The base64-encoded filename string or false if the tagpath is invalid
 */
export function metadataRecomputeName( app: App, tagPath: string): string {
	
	// Validate the tag path
	if (!checkIfTagIsValid(tagPath)) {
		logger.error('Invalid tag path:', tagPath);
		return '';
	}

	// Get the vault's base path from the app
	const vaultPath = (app.vault.adapter as any).basePath || '';

	// Normalize the tag path by removing leading '#' if present
	const normalizedPath = tagPath.startsWith('#') ? tagPath.slice(1) : tagPath;
	

	const crypto = require('crypto');

	function hashPath(path:string) {
	return crypto.createHash('sha256').update(path).digest('hex');
	}

	const filename = `${hashPath(normalizedPath)}.json`;


	// Return absolute path
	return path.join(vaultPath, '.TagNodeMeta', filename);
}

/**
 * Create an empty frontmatter field in a metadata JSON file
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @param frontmatterName - The name of the frontmatter field to create
 * @returns Boolean indicating if the operation was successful
 */
// export function metadataCreateSpecificEmptyFrontmatter(
// 	app: App,
// 	tagPath: string,
// 	frontmatterName: string
// ): boolean {
// 	try {
// 		// Validate the tag path
// 		if (!checkIfTagIsValid(tagPath)) return false;

// 		// Compute the actual filename from the tag path
// 		const computedFilename = metadataRecomputeName(app, tagPath);
		
// 		let jsonData: any = {};
		
// 		// Check if file exists and read it
// 		if (fs.existsSync(computedFilename)) {
// 			const fileContent = fs.readFileSync(computedFilename, 'utf-8');
// 			jsonData = JSON.parse(fileContent);
// 		}
		
// 		// Create empty field with the frontmatter name
// 		jsonData[frontmatterName] = null;
		
// 		// Write back to the file
// 		fs.writeFileSync(computedFilename, JSON.stringify(jsonData, null, 2), 'utf-8');
		
// 		return true;
// 	} catch (error) {
// 		console.error("Error creating empty frontmatter:", error);
// 		return false;
// 	}
// }

/**
 * Add a "created" property to a metadata JSON file
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @returns Boolean indicating if the operation was successful
 */
// export function metadataAddCreatedProperty(
// 	app: App,
// 	tagPath: string
// ): boolean {
// 	return metadataCreateSpecificEmptyFrontmatter(app, tagPath, 'created');
// }

/**
 * Add a "modified" property to a metadata JSON file
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @returns Boolean indicating if the operation was successful
 */
// export function metadataAddModifiedProperty(
// 	app: App,
// 	tagPath: string
// ): boolean {
// 	return  metadataCreateSpecificEmptyFrontmatter(app, tagPath, 'modified');
// }

/**
 * Rename a metadata JSON file by computing new filename from new tag path
 * @param app - Obsidian App instance
 * @param tagPath - The current nested tag path (used to compute the current filename)
 * @param newTagPath - The new nested tag path (used to compute the new filename)
 * @returns Boolean indicating if the operation was successful
 */
export function metadataRenameFile(
	app: App,
	tagPath: string,
	newTagPath: string
): boolean {
	try {
		// Validate both tag paths
		if (!checkIfTagIsValid(tagPath) || !checkIfTagIsValid(newTagPath)) return false;

		// Compute the actual filenames from the tag paths
		const oldFilename = metadataRecomputeName(app, tagPath);
		const newFilename = metadataRecomputeName(app, newTagPath);
		
		// Check if the old file exists
		if (!fs.existsSync(oldFilename)) {
			logger.error("Old metadata file does not exist:", oldFilename);
			return false;
		}
		
		// Check if the new filename already exists
		if (fs.existsSync(newFilename)) {
			logger.error("New metadata file already exists:", newFilename);
			return false;
		}
		
		// Rename the file using filesystem
		fs.renameSync(oldFilename, newFilename);
		
		return true;
	} catch (error) {
		logger.error("Error renaming metadata file:", error);
		return false;
	}
}

/**
 * Read all frontmatter data from a metadata JSON file
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @returns JSON object containing all metadata, or null if file doesn't exist or error occurs
 */
export function metadataReadAllFrontmatter(
	app: App,
	tagPath: string
):any | null{
	try {
		// Validate the tag path
		if (!checkIfTagIsValid(tagPath)) return null;

		// Compute the actual filename from the tag path
		const computedFilename = metadataRecomputeName(app, tagPath);
		
		// Check if file exists
		if (!fs.existsSync(computedFilename)) {
			logger.warn("Metadata file does not exist:", computedFilename);
			return null;
		}
		
		// Read the file content
		const fileContent = fs.readFileSync(computedFilename, 'utf-8');
		
		// Parse and return the JSON object
		const jsonData = JSON.parse(fileContent);
		return jsonData;
	} catch (error) {
		logger.error("Error reading metadata frontmatter:", error);
		return null;
	}
}

/**
 * Add new properties to a metadata JSON file (only if they don't already exist)
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @param jsonObject - Object containing new properties to add
 * @returns Boolean indicating if the operation was successful
 */
export function metadataAddNewProperty(
	app: App,
	tagPath: string,
	jsonObject: Record<string, any>
): boolean {
	try {
		// Validate the tag path
		if (!checkIfTagIsValid(tagPath)) return false;

		// Read existing metadata from the file
		let existingData = metadataReadAllFrontmatter(app, tagPath);
		
		// If file doesn't exist, start with empty object
		if (!existingData) {
			existingData = {};
		}
		
		// Add only new keys that don't already exist
		const updatedData = { ...existingData };
		for (const key in jsonObject) {
			if (!(key in existingData)) {
				updatedData[key] = jsonObject[key];
			}
		}
		
		// Compute the filename and write back to file
		const computedFilename = metadataRecomputeName(app, tagPath);
		fs.writeFileSync(computedFilename, JSON.stringify(updatedData, null, 2), 'utf-8');
		
		return true;
	} catch (error) {
		logger.error("Error adding new metadata properties:", error);
		return false;
	}
}

/**
 * Replace existing properties in a metadata JSON file (adds them if they dont already exist)
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @param jsonObject - Object containing properties to replace
 * @returns Boolean indicating if the operation was successful
 */
export function metadataReplaceExistingProperty(
	app: App,
	tagPath: string,
	jsonObject: Record<string, any>
): boolean {
	try {
		// Validate the tag path
		if (!checkIfTagIsValid(tagPath)) return false;

		// Read existing metadata from the file
		const existingData = metadataReadAllFrontmatter(app, tagPath);
		
		// If file doesn't exist, nothing to replace
		if (!existingData) {
			logger.warn("Metadata file does not exist, nothing to replace");
			return true;
		}
		
		// Replace only keys that already exist
		const updatedData = { ...existingData };
		for (const key in jsonObject) {
			
			updatedData[key] = jsonObject[key];
			
		}
		
		// Compute the filename and write back to file
		const computedFilename = metadataRecomputeName(app, tagPath);
		fs.writeFileSync(computedFilename, JSON.stringify(updatedData, null, 2), 'utf-8');
		
		return true;
	} catch (error) {
		logger.error("Error replacing existing metadata properties:", error);
		return false;
	}
}

/**
 * Append to existing properties or add new ones in a metadata JSON file
 * If property exists and is an array, appends to it. Otherwise creates/replaces the property.
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @param jsonObject - Object containing properties to append or add
 * @returns Boolean indicating if the operation was successful
 */
export function metadataAppendToProperty(
	app: App,
	tagPath: string,
	jsonObject: Record<string, any>
): boolean {
	try {
		// Validate the tag path
		if (!checkIfTagIsValid(tagPath)) return false;

		// Read existing metadata from the file
		let existingData = metadataReadAllFrontmatter(app, tagPath);
		
		// If file doesn't exist, start with empty object
		if (!existingData) {
			existingData = {};
		}
		
		// Process each key in the jsonObject
		const updatedData = { ...existingData };
		for (const key in jsonObject) {
			if (key in existingData) {
				// Key exists - append if it's an array, otherwise replace
				if (Array.isArray(existingData[key])) {
					// Append to existing array
					if (Array.isArray(jsonObject[key])) {
						updatedData[key] = [...existingData[key], ...jsonObject[key]];
					} else {
						updatedData[key] = [...existingData[key], jsonObject[key]];
					}
				} else {
					// Not an array - convert to array and append
					if (Array.isArray(jsonObject[key])) {
						updatedData[key] = [existingData[key], ...jsonObject[key]];
					} else {
						updatedData[key] = [existingData[key], jsonObject[key]];
					}
				}
			} else {
				// Key doesn't exist - create new field
				updatedData[key] = jsonObject[key];
			}
		}
		
		// Compute the filename and write back to file
		const computedFilename = metadataRecomputeName(app, tagPath);
		fs.writeFileSync(computedFilename, JSON.stringify(updatedData, null, 2), 'utf-8');
		
		return true;
	} catch (error) {
		logger.error("Error appending to metadata properties:", error);
		return false;
	}
}
