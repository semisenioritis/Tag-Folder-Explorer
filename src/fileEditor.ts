import { App, TFile, normalizePath } from "obsidian";
import * as path from 'path';
import * as fs from 'fs';

// hello world. im testing this
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
		console.error("Error creating file:", error);
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
				console.log('Creating frontmatter for file.')
				frontmatter.tags = [];
			}else{
				console.log('Frontmatter tags already exists. No changes made.');
			}
		})
		return { success: true, file };
	} catch (error) {
		console.error("Error creating frontmatter:", error);
		return { success: false, file };
	}
}

/**
 * Check if a file has frontmatter
 * @param app - Obsidian App instance
 * @param file - TFile object to check
 * @returns Object with hasFrontmatter boolean and the file
 */
export async function hasFrontMatter(
	app: App,
	file: TFile
): Promise<{ hasFrontmatter: boolean; file: TFile }> {
	try {
		let hasFrontmatter = false;
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			hasFrontmatter = frontmatter !== undefined;
		});

		return { hasFrontmatter, file };
	} catch (error) {
		console.error("Error checking frontmatter:", error);
		return { hasFrontmatter: false, file };
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
		console.error("Error renaming file:", error);
		return { success: false, file };
	}
}

/**
 * Read all YAML frontmatter from a file
 * @param app - Obsidian App instance
 * @param file - TFile object to read from
 * @returns Object containing the frontmatter data
 */
export async function readAllFileYaml(
	app: App,
	file: TFile
): Promise<Record<string, any>> {
	try {
		let frontmatterData: Record<string, any> = {};
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (frontmatter) {
				const { ...rest } = frontmatter;
				frontmatterData = JSON.parse(JSON.stringify(rest));
			}
		});
		return frontmatterData;
	} catch (error) {
		console.error("Error reading frontmatter:", error);
		return {};
	}
}

/**
 * Read a specific key from YAML frontmatter
 * @param app - Obsidian App instance
 * @param file - TFile object to read from
 * @param key - The key to read from frontmatter
 * @returns The value of the specified key, or undefined if not found
 */
export async function readSpecificYamlSection(
	app: App,
	file: TFile,
	key: string
): Promise<any> {
	try {
		let value: any = undefined;
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (frontmatter && frontmatter.hasOwnProperty(key)) {
				value = frontmatter[key];
			}
		});
		
		return value;
	} catch (error) {
		console.error("Error reading specific frontmatter key:", error);
		return undefined;
	}
}

/**
 * Extract all tags from YAML frontmatter (not from file body)
 * @param app - Obsidian App instance
 * @param file - TFile object to extract tags from
 * @returns Array of tag strings from frontmatter
 */
export async function extractAllTagsFromYaml(
	app: App,
	file: TFile
): Promise<string[]> {
	try {
		const tags: string[] = [];
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (!frontmatter) return;
			
			// Check for 'tags' property (can be array or string)
			if (frontmatter.tags) {
				if (Array.isArray(frontmatter.tags)) {
					tags.push(...frontmatter.tags);
				} else if (typeof frontmatter.tags === 'string') {
					tags.push(frontmatter.tags);
				}
			}
		});
		
		// Remove '#' prefix from all tags
		return tags.map(tag => tag.startsWith('#') ? tag.slice(1) : tag);
	} catch (error) {
		console.error("Error extracting tags from frontmatter:", error);
		return [];
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
		console.error("Error extracting tags from file body:", error);
		return [];
	}
}

/**
 * Extract all tags from a file (both frontmatter and body)
 * @param app - Obsidian App instance
 * @param file - TFile object to extract tags from
 * @returns Array of all tag strings from the file
 */
export async function readAllTagsFromFile(
	app: App,
	file: TFile
): Promise<string[]> {
	try {
		const yamlTags = await extractAllTagsFromYaml(app, file);
		const bodyTags = await extractAllTagsFromFileBody(app, file);
		
		// Combine and deduplicate tags
		const allTags = [...new Set([...yamlTags, ...bodyTags])];

		// Filter out invalid tags
		const validTags = allTags.filter(tag => checkIfTagIsValid(tag));
		
		return validTags;
	} catch (error) {
		console.error("Error reading all tags from file:", error);
		return [];
	}
}

/**
 * Check if a specific tag exists in a file (searches both frontmatter and body)
 * @param app - Obsidian App instance
 * @param file - TFile object to check
 * @param tag - Tag to search for (with or without '#' prefix)
 * @returns Boolean indicating if the tag exists
 */
export async function hasTag(
	app: App,
	file: TFile,
	tag: string
): Promise<boolean> {
	try {

		// Check if the tag is valid
		if (!checkIfTagIsValid(tag)) {
			return false;
		}

		// Normalize the search tag (remove '#' if present)
		const normalizedSearchTag = tag.startsWith('#') ? tag.slice(1) : tag;

		// Get all tags from the file (already without '#')
		const allTags = await readAllTagsFromFile(app, file);
		
		// Check if the normalized tag exists in the file
		return allTags.includes(normalizedSearchTag);
	} catch (error) {
		console.error("Error checking for tag:", error);
		return false;
	}
}

/**
 * Check if a specific tag exists as a parent of any tags in a file
 * @param app - Obsidian App instance
 * @param file - TFile object to check
 * @param tag - Tag to search for (with or without '#' prefix)
 * @returns Boolean indicating if the tag exists as a parent or exact match
 * @example
 * // If file contains "#a/b/c/d/e"
 * hasTagAnywhere(app, file, "#a/b/c/d") // returns true
 * // If file contains "#i/a/b/c/d/e"
 * hasTagAnywhere(app, file, "#a/b/c/d") // returns false
 */
export async function hasTagAnywhere(
	app: App,
	file: TFile,
	tag: string
): Promise<boolean> {
	try {
		// Check if the tag is valid
		if (!checkIfTagIsValid(tag)) {
			return false;
		}

		// Normalize the search tag (remove '#' if present)
		const normalizedSearchTag = tag.startsWith('#') ? tag.slice(1) : tag;
		
		// Get all tags from the file (already without '#')
		const allTags = await readAllTagsFromFile(app, file);
		
		// Check if any tag starts with the normalized search tag
		// Either exact match or starts with searchTag/
		return allTags.some(fileTag => 
			fileTag === normalizedSearchTag || 
			fileTag.startsWith(normalizedSearchTag + '/')
		);
	} catch (error) {
		console.error("Error checking for tag anywhere:", error);
		return false;
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
		console.error("Error removing tag from frontmatter:", error);
		return false;
	}
}

/**
 * Remove a specific tag from the file body (not from YAML frontmatter)
 * Tags inside code blocks are automatically excluded by the metadata cache
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @param tag - Tag to remove (with or without '#' prefix)
 * @returns Boolean indicating if the operation was successful
 */
// 🔴🔴 DEPRECATED 
// Major issue with this function is that it manually slices the files based on a cache. this is ok as long as the cache is consistently updated. 
// However when the function to remove tags is called conscutively for different tags without updating the cache, we endup in a situation where the the cache is old and the function ends up slicing the wrong parts of the file, thus corrupting it. 
export async function removeTagFromFileBody(
	app: App,
	file: TFile,
	tag: string
): Promise<boolean> {
	try {
		// Check if the tag is valid
		if (!checkIfTagIsValid(tag)) {
			return false;
		}

		// Normalize the tag (ensure it has '#' prefix for matching)
		const normalizedTag = tag.startsWith('#') ? tag : '#' + tag;
		
		// Get tag positions from metadata cache
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.tags) {
			return true; // No tags in body
		}
		
		// Filter tags that match our target tag
		// MetadataCache automatically excludes tags in code blocks
		const matchingTags = cache.tags.filter(tagCache => tagCache.tag === normalizedTag);
		
		if (matchingTags.length === 0) {
			return true; // Tag not found
		}
		
		// Sort tags in descending order by start offset to preserve offsets during removal
		matchingTags.sort((a, b) => b.position.start.offset - a.position.start.offset);
		
		// Use vault.process to atomically modify the file
		await app.vault.process(file, (content) => {
			let modifiedContent = content;
			
			// Remove each tag occurrence from end to start
			for (const tagCache of matchingTags) {
				const startOffset = tagCache.position.start.offset -1;
				const endOffset = tagCache.position.end.offset ;
				
				// Remove the tag from the content
				modifiedContent = modifiedContent.slice(0, startOffset) + modifiedContent.slice(endOffset);
			}
			
			return modifiedContent;
		});
		
		return true;
	} catch (error) {
		console.error("Error removing tag from file body:", error);
		return false;
	}
}

/**
 * Remove a specific tag from both the file body and YAML frontmatter
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @param tag - Tag to remove (with or without '#' prefix)
 * @returns Boolean indicating if the operation was successful
 */
// 🔴🔴 DEPRECATED 
// Major issue with this function is that it manually slices the files based on a cache. this is ok as long as the cache is consistently updated. 
// However when the function to remove tags is called conscutively for different tags without updating the cache, we endup in a situation where the the cache is old and the function ends up slicing the wrong parts of the file, thus corrupting it. 
export async function removeTagFromFile(
	app: App,
	file: TFile,
	tag: string
): Promise<boolean> {
	try {
		// Check if the tag is valid
		if (!checkIfTagIsValid(tag)) {
			return false;
		}

		// Removing from body first and then yaml, since once a single function is complete, cache isnt refreshed. so indexing gets messed up. deleting yaml first would mess up the indexing for body. 

		// Remove from file body
		const bodySuccess = await removeTagFromFileBody(app, file, tag);
		console.log("part1")
		console.log(bodySuccess)

		// Remove from YAML frontmatter
		const yamlSuccess = await removeTagFromFileYaml(app, file, tag);
		console.log("part2")
		console.log(yamlSuccess)





		// Return true only if both operations succeeded
		return yamlSuccess && bodySuccess;
	} catch (error) {
		console.error("Error removing tag from file:", error);
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
		console.error("Error adding tag to frontmatter:", error);
		return false;
	}
}

/**
 * Replace an old tag with a new tag in the YAML frontmatter tags list
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @param oldTag - Tag to replace (with or without '#' prefix)
 * @param newTag - New tag to add (with or without '#' prefix)
 * @returns Boolean indicating if the operation was successful
 */
export async function replaceTagInFileYaml(
	app: App,
	file: TFile,
	oldTag: string,
	newTag: string
): Promise<boolean> {
	try {
		// Check if the tag is valid
		if (!checkIfTagIsValid(oldTag)) {
			return false;
		}

		// Check if the tag is valid
		if (!checkIfTagIsValid(newTag)) {
			return false;
		}

		// Normalize both tags (remove '#' if present)
		const normalizedOldTag = oldTag.startsWith('#') ? oldTag.slice(1) : oldTag;
		const normalizedNewTag = newTag.startsWith('#') ? newTag.slice(1) : newTag;
		
		// Process frontmatter to replace the tag
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (!frontmatter.tags) {
				return;
			}
			
			// Ensure tags is an array
			if (!Array.isArray(frontmatter.tags)) {
				frontmatter.tags = [frontmatter.tags];
			}
			
			// Find and replace the old tag with the new tag
			frontmatter.tags = frontmatter.tags.map((t: string) => {
				const cleanTag = t.startsWith('#') ? t.slice(1) : t;
				return cleanTag === normalizedOldTag ? normalizedNewTag : t;
			});
		});
		
		return true;
	} catch (error) {
		console.error("Error replacing tag in frontmatter:", error);
		return false;
	}
}

/**
 * Replace all instances of an old tag with a new tag in the file body (not in YAML frontmatter)
 * Tags inside code blocks are automatically excluded by the metadata cache
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @param oldTag - Tag to replace (with or without '#' prefix)
 * @param newTag - New tag to replace with (with or without '#' prefix)
 * @returns Boolean indicating if the operation was successful
 */
// 🔴🔴 DEPRECATED 
// Major issue with this function is that it manually slices the files based on a cache. this is ok as long as the cache is consistently updated. 
// However when the function to remove tags is called conscutively for different tags without updating the cache, we endup in a situation where the the cache is old and the function ends up slicing the wrong parts of the file, thus corrupting it. 
export async function replaceTagInFileBody(
	app: App,
	file: TFile,
	oldTag: string,
	newTag: string
): Promise<boolean> {
	try {
		// Check if the tag is valid
		if (!checkIfTagIsValid(oldTag)) {
			return false;
		}

		// Check if the tag is valid
		if (!checkIfTagIsValid(newTag)) {
			return false;
		}
		// Normalize the tags (ensure they have '#' prefix for matching)
		const normalizedOldTag = oldTag.startsWith('#') ? oldTag : '#' + oldTag;
		const normalizedNewTag = newTag.startsWith('#') ? newTag : '#' + newTag;
		
		// Get tag positions from metadata cache
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.tags) {
			return true; // No tags in body
		}
		
		// Filter tags that match our old tag
		// MetadataCache automatically excludes tags in code blocks
		const matchingTags = cache.tags.filter(tagCache => tagCache.tag === normalizedOldTag);
		
		if (matchingTags.length === 0) {
			return true; // Old tag not found
		}
		
		// Sort tags in descending order by start offset to preserve offsets during replacement
		matchingTags.sort((a, b) => b.position.start.offset - a.position.start.offset);
		
		// Use vault.process to atomically modify the file
		await app.vault.process(file, (content) => {
			let modifiedContent = content;
			
			// Replace each tag occurrence from end to start
			for (const tagCache of matchingTags) {
				const startOffset = tagCache.position.start.offset;
				const endOffset = tagCache.position.end.offset;
				
				// Replace the old tag with the new tag
				modifiedContent = modifiedContent.slice(0, startOffset) + 
				                  normalizedNewTag + 
				                  modifiedContent.slice(endOffset);
			}
			
			return modifiedContent;
		});
		
		return true;
	} catch (error) {
		console.error("Error replacing tag in file body:", error);
		return false;
	}
}

/**
 * Replace an old tag with a new tag in both the file body and YAML frontmatter
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @param oldTag - Tag to replace (with or without '#' prefix)
 * @param newTag - New tag to replace with (with or without '#' prefix)
 * @returns Boolean indicating if the operation was successful
 */
// 🔴🔴 DEPRECATED 
// Major issue with this function is that it manually slices the files based on a cache. this is ok as long as the cache is consistently updated. 
// However when the function to remove tags is called conscutively for different tags without updating the cache, we endup in a situation where the the cache is old and the function ends up slicing the wrong parts of the file, thus corrupting it. 
export async function replaceTagInFile(
	app: App,
	file: TFile,
	oldTag: string,
	newTag: string
): Promise<boolean> {
	try {
		// Check if the tag is valid
		if (!checkIfTagIsValid(oldTag)) {
			return false;
		}

		// Check if the tag is valid
		if (!checkIfTagIsValid(newTag)) {
			return false;
		}
		// Replace in file body
		const bodySuccess = await replaceTagInFileBody(app, file, oldTag, newTag);
		
		// Replace in YAML frontmatter
		const yamlSuccess = await replaceTagInFileYaml(app, file, oldTag, newTag);
		

		// Return true only if both operations succeeded
		return yamlSuccess && bodySuccess;
	} catch (error) {
		console.error("Error replacing tag in file:", error);
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
		const bodyTags = await extractAllTagsFromFileBody(app, file);
		
		if (bodyTags.length === 0) {
			return true; // No tags to shift
		}
		
		// Add each tag to frontmatter (addTagToFileYaml handles duplicates)
		for (const tag of bodyTags) {
			const success = await addTagToFileYaml(app, file, tag);
			if (!success) {
				return false;
			}
		}
		
		return true;
	} catch (error) {
		console.error("Error shifting tags from body to metadata:", error);
		return false;
	}
}

/**
 * Convert all tags from file body to YAML frontmatter and remove them from body
 * Useful for migrating to a frontmatter-only system
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @returns Boolean indicating if the operation was successful
 */
// 🔴🔴 DEPRECATED 
// Major issue with this function is that it manually slices the files based on a cache. this is ok as long as the cache is consistently updated. 
// However when the function to remove tags is called conscutively for different tags without updating the cache, we endup in a situation where the the cache is old and the function ends up slicing the wrong parts of the file, thus corrupting it. 
export async function convertBodyTagsToYaml(
	app: App,
	file: TFile
): Promise<boolean> {
	try {
		// Get all tags from the file body first (before removal)
		const bodyTags = await extractAllTagsFromFileBody(app, file);
		
		if (bodyTags.length === 0) {
			return true; // No tags to convert
		}
		
		// Add each tag to frontmatter (addTagToFileYaml handles duplicates)
		for (const tag of bodyTags) {
			const success = await addTagToFileYaml(app, file, tag);
			if (!success) {
				return false;
			}
		}
		
		// Remove each tag from the body
		for (const tag of bodyTags) {
			const success = await removeTagFromFileBody(app, file, tag);
			if (!success) {
				return false;
			}
		}
		
		return true;
	} catch (error) {
		console.error("Error converting body tags to YAML:", error);
		return false;
	}
}

/**
 * Delete all YAML frontmatter from a file
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @returns Boolean indicating if the operation was successful
 */
export async function deleteAllYaml(
	app: App,
	file: TFile
): Promise<boolean> {
	try {
		// Process frontmatter to delete all keys
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (frontmatter) {
				// Get all keys and delete them
				const keys = Object.keys(frontmatter);
				for (const key of keys) {
					delete frontmatter[key];
				}
			}
		});
		
		return true;
	} catch (error) {
		console.error("Error deleting all YAML:", error);
		return false;
	}
}

/**
 * Delete a specific key from YAML frontmatter
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @param key - The key to delete from frontmatter
 * @returns Boolean indicating if the operation was successful
 */
export async function deleteSpecificYaml(
	app: App,
	file: TFile,
	key: string
): Promise<boolean> {
	try {
		// Process frontmatter to delete the specific key
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (frontmatter) {
				delete frontmatter[key];
			}
		});
		
		return true;
	} catch (error) {
		console.error("Error deleting specific YAML key:", error);
		return false;
	}
}

/**
 * Add new metadata sections to YAML frontmatter (only if keys don't already exist)
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @param content - Object containing key-value pairs to add
 * @returns Boolean indicating if the operation was successful
 */
export async function addNewMetadataSection(
	app: App,
	file: TFile,
	content: Record<string, any>
): Promise<boolean> {
	try {
		// Process frontmatter to add new keys

		// Retrive the fields and their types
		// @ts-ignore
		const properties = app.metadataTypeManager?.properties;

		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			// Iterate through each key in the content object
			for (const key in content) {
				console.log(content)
				console.log(key)
				// Only add if the key doesn't already exist
				if (!(key in frontmatter)) {
					// check if the field already exists in the types.json
					if (key in properties){
						// if it does then check if the type matches
						// calculate key type
						let keyType = getObsidianMetadataType(key)
						// calculate my content type
						// if key exists then extract widget else return null
						let actualType = properties[key].widget ? properties[key].widget : "text";

						// check if they match
						// if they do match 
						if (areMetadataTypesCompatible(actualType,keyType)){
							frontmatter[key] = content[key];	
						}else{
							return false
						}
					}else{
						// if it doesnt exist just create it. 
						frontmatter[key] = content[key];
					}					
				}
			}
		});
		return true;
	} catch (error) {
		console.error("Error adding new metadata section:", error);
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
				// console.log(properties[lowCaseKey].widget)
				// console.log(properties[key].widget)
				
				// only check if the key already exists. only if exists get its widget. else if it is new then just create it
				// Update if exists, create if doesn't exist
				frontmatter[key] = content[key];
			}
		});
		
		return true;
	} catch (error) {
		console.error("Error replacing metadata section:", error);
		return false;
	}
}

/**
 * Append content to metadata sections in YAML frontmatter
 * Appends to existing keys (converts to array if needed) or creates them if they don't exist
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @param content - Object containing key-value pairs to append/add
 * @returns Boolean indicating if the operation was successful
 */
export async function appendMetadataSection(
	app: App,
	file: TFile,
	content: Record<string, any>
): Promise<boolean> {
	try {
		// Process frontmatter to append/add keys
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			// Iterate through each key in the content object
			for (const key in content) {
				if (key in frontmatter) {
					// Key exists - append to it
					const existingValue = frontmatter[key];
					const newValue = content[key];
					
					if (Array.isArray(existingValue)) {
						// If existing is array, append new value(s)
						if (Array.isArray(newValue)) {
							frontmatter[key] = [...existingValue, ...newValue];
						} else {
							frontmatter[key] = [...existingValue, newValue];
						}
					} else {
						// If existing is not array, convert to array with both values
						if (Array.isArray(newValue)) {
							frontmatter[key] = [existingValue, ...newValue];
						} else {
							frontmatter[key] = [existingValue, newValue];
						}
					}
				} else {
					// Key doesn't exist - create it
					frontmatter[key] = content[key];
				}
			}
		});
		
		return true;
	} catch (error) {
		console.error("Error appending metadata section:", error);
		return false;
	}
}

/**
 * Normalize frontmatter by removing duplicate tags
 * Extracts tags from frontmatter, converts to set (removes duplicates), and updates
 * @param app - Obsidian App instance
 * @param file - TFile object to modify
 * @returns Boolean indicating if the operation was successful
 */
export async function normalizeFrontmatter(
	app: App,
	file: TFile
): Promise<boolean> {
	try {
		// Update frontmatter with normalized tags
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (!frontmatter || !frontmatter.tags) {
				return; // No tags to normalize
			}
			
			// Extract and deduplicate tags
			let tags = frontmatter.tags;
			if (!Array.isArray(tags)) {
				tags = [tags];
			}
			
			// Convert to set and back to array to remove duplicates
			// Also normalize by removing '#' prefix if present
			const normalizedTags: string[] = Array.from(new Set(tags.map((tag: string) => {
				return typeof tag === 'string' && tag.startsWith('#') ? tag.slice(1) : tag;
			})));
			
			frontmatter.tags = normalizedTags;
		});
		
		return true;
	} catch (error) {
		console.error("Error normalizing frontmatter:", error);
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
		console.error("Error validating tag:", error);
		return false;
	}
}

/**
 * Determine the Obsidian metadata type for a given key-value pair
 * @param value - The metadata value to type-check
 * @returns The Obsidian metadata type: 'multitext', 'date', 'datetime', 'number', 'checkbox', or 'text'
 */
function getObsidianMetadataType(value: any): string {
	// Check for multitext (array of strings)
	if (Array.isArray(value)) {
		if (value.every(item => typeof item === 'string')) {
			return 'multitext';
		}
	}
	
	// Check for checkbox (boolean)
	if (typeof value === 'boolean') {
		return 'checkbox';
	}
	
	// Check for number
	if (typeof value === 'number') {
		return 'number';
	}
	
	// Check for string-based types (date, datetime, text)
	if (typeof value === 'string') {
		// Check for datetime format: YYYY-MM-DDTHH:mm (more specific, check first)
		// Examples: 2026-02-04T18:05, 2024-12-31T23:59
		const datetimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
		if (datetimePattern.test(value)) {
			return 'datetime';
		}
		
		// Check for date format: YYYY-MM-DD
		// Examples: 2026-02-04, 2024-12-31
		const datePattern = /^\d{4}-\d{2}-\d{2}$/;
		if (datePattern.test(value)) {
			return 'date';
		}
		
		// Default to text for any other string
		return 'text';
	}
	
	// Default fallback for any other type
	return 'text';
}

/**
 * Check if two Obsidian metadata types are compatible
 * @param targetType - The expected/target metadata type
 * @param sourceType - The actual/source metadata type to check compatibility
 * @returns Boolean indicating if sourceType is compatible with targetType
 */
function areMetadataTypesCompatible(sourceType: string, targetType: string): boolean {
	// Exact match is always compatible
	if (targetType === sourceType) {
		return true;
	}
	
	// Type-specific compatibility rules
	switch (sourceType) {
		case 'multitext':
			// multitext only accepts multitext
			return targetType === 'multitext';
			
		case 'date':
			// date accepts date or datetime
			return targetType === 'date' || targetType === 'datetime';
			
		case 'datetime':
			// datetime accepts date or datetime
			return targetType === 'date' || targetType === 'datetime';
			
		case 'number':
			// number only accepts number
			return targetType === 'number';
			
		case 'checkbox':
			// checkbox only accepts checkbox
			return targetType === 'checkbox';
			
		case 'text':
			// text accepts anything (most permissive)
			return true;

		case 'tags':
			// tags only accepts multitext
			return targetType === 'multitext';

		case 'aliases':
			// aliases only accepts multitext
			return targetType === 'multitext';

		default:
			// Unknown target type, default to false
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
		console.error('Invalid tag path:', tagPath);
		return '';
	}

	// Get the vault's base path from the app
	const vaultPath = (app.vault.adapter as any).basePath || '';

	// Normalize the tag path by removing leading '#' if present
	const normalizedPath = tagPath.startsWith('#') ? tagPath.slice(1) : tagPath;
	
	// Replace / with _ for human-readable part
	const humanReadablePath = normalizedPath.replace(/\//g, '_');

	// Base64 encode the original path
	const base64Path = btoa(normalizedPath);

	// Combine both parts with underscore separator and .json extension
	const filename = `${humanReadablePath}_${base64Path}.json`;

	// Return absolute path
	return path.join(vaultPath, '.TagNodeMeta', filename);
}

/**
 * Check if a metadata JSON file exists for a given tag path
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @returns Boolean indicating if the metadata file exists
 */
export function checkIfMetadataFileExists(
	app: App,
	tagPath: string
): boolean {
	try {
		// Validate the tag path
		if (!checkIfTagIsValid(tagPath)) return false;

		// Compute the actual filename from the tag path
		const computedFilename = metadataRecomputeName(app, tagPath);
		
		// Use file system to check if the file exists (for hidden folders)
		return fs.existsSync(computedFilename);
	} catch (error) {
		console.error("Error checking if metadata file exists:", error);
		return false;
	}
}

/**
 * Create an empty frontmatter field in a metadata JSON file
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @param frontmatterName - The name of the frontmatter field to create
 * @returns Boolean indicating if the operation was successful
 */
export function metadataCreateSpecificEmptyFrontmatter(
	app: App,
	tagPath: string,
	frontmatterName: string
): boolean {
	try {
		// Validate the tag path
		if (!checkIfTagIsValid(tagPath)) return false;

		// Compute the actual filename from the tag path
		const computedFilename = metadataRecomputeName(app, tagPath);
		
		let jsonData: any = {};
		
		// Check if file exists and read it
		if (fs.existsSync(computedFilename)) {
			const fileContent = fs.readFileSync(computedFilename, 'utf-8');
			jsonData = JSON.parse(fileContent);
		}
		
		// Create empty field with the frontmatter name
		jsonData[frontmatterName] = null;
		
		// Write back to the file
		fs.writeFileSync(computedFilename, JSON.stringify(jsonData, null, 2), 'utf-8');
		
		return true;
	} catch (error) {
		console.error("Error creating empty frontmatter:", error);
		return false;
	}
}

/**
 * Add a "created" property to a metadata JSON file
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @returns Boolean indicating if the operation was successful
 */
export function metadataAddCreatedProperty(
	app: App,
	tagPath: string
): boolean {
	return metadataCreateSpecificEmptyFrontmatter(app, tagPath, 'created');
}

/**
 * Add a "modified" property to a metadata JSON file
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @returns Boolean indicating if the operation was successful
 */
export function metadataAddModifiedProperty(
	app: App,
	tagPath: string
): boolean {
	return  metadataCreateSpecificEmptyFrontmatter(app, tagPath, 'modified');
}

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
			console.error("Old metadata file does not exist:", oldFilename);
			return false;
		}
		
		// Check if the new filename already exists
		if (fs.existsSync(newFilename)) {
			console.error("New metadata file already exists:", newFilename);
			return false;
		}
		
		// Rename the file using filesystem
		fs.renameSync(oldFilename, newFilename);
		
		return true;
	} catch (error) {
		console.error("Error renaming metadata file:", error);
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
			console.warn("Metadata file does not exist:", computedFilename);
			return null;
		}
		
		// Read the file content
		const fileContent = fs.readFileSync(computedFilename, 'utf-8');
		
		// Parse and return the JSON object
		const jsonData = JSON.parse(fileContent);
		return jsonData;
	} catch (error) {
		console.error("Error reading metadata frontmatter:", error);
		return null;
	}
}

/**
 * Read a specific property from a metadata JSON file
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @param frontmatterName - The name of the specific property to extract
 * @returns The value of the specified property, or undefined if not found
 */
export function metadataReadSpecificProperty(
	app: App,
	tagPath: string,
	frontmatterName: string
): any | undefined {
	try {
		// Validate the tag path
		if (!checkIfTagIsValid(tagPath)) return undefined;

		// Read all frontmatter from the file
		const allMetadata = metadataReadAllFrontmatter(app, tagPath);
		
		// Return undefined if file doesn't exist or is empty
		if (!allMetadata) {
			return undefined;
		}
		
		// Extract and return the specific property
		return allMetadata[frontmatterName];
	} catch (error) {
		console.error("Error reading specific metadata property:", error);
		return undefined;
	}
}

/**
 * Remove all metadata by deleting the entire metadata JSON file
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @returns Boolean indicating if the operation was successful
 */
export function metadataRemoveAllMetadata(
	app: App,
	tagPath: string
): boolean {
	try {
		// Validate the tag path
		if (!checkIfTagIsValid(tagPath)) return false;

		// Compute the actual filename from the tag path
		const computedFilename = metadataRecomputeName(app, tagPath);
		
		// Check if file exists
		if (!fs.existsSync(computedFilename)) {
			console.warn("Metadata file does not exist:", computedFilename);
			return true; // File doesn't exist, consider it a success
		}
		
		// Delete the file
		fs.unlinkSync(computedFilename);
		
		return true;
	} catch (error) {
		console.error("Error removing metadata file:", error);
		return false;
	}
}

/**
 * Remove a specific property from a metadata JSON file
 * @param app - Obsidian App instance
 * @param tagPath - The nested tag path (used to compute the actual filename)
 * @param frontmatterName - The name of the property to remove
 * @returns Boolean indicating if the operation was successful
 */
export function metadataRemoveSpecificProperty(
	app: App,
	tagPath: string,
	frontmatterName: string
): boolean {
	try {
		// Validate the tag path
		if (!checkIfTagIsValid(tagPath)) return false;

		// Read all metadata from the file
		const jsonData = metadataReadAllFrontmatter(app, tagPath);
		
		// If file doesn't exist or is empty, nothing to remove
		if (!jsonData) {
			console.warn("Metadata file does not exist or is empty");
			return true;
		}
		
		// Delete the specific property
		delete jsonData[frontmatterName];
		
		// Compute the filename and write back to file
		const computedFilename = metadataRecomputeName(app, tagPath);
		fs.writeFileSync(computedFilename, JSON.stringify(jsonData, null, 2), 'utf-8');
		
		return true;
	} catch (error) {
		console.error("Error removing specific metadata property:", error);
		return false;
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
		console.error("Error adding new metadata properties:", error);
		return false;
	}
}

/**
 * Replace existing properties in a metadata JSON file (only if they already exist)
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
			console.warn("Metadata file does not exist, nothing to replace");
			return true;
		}
		
		// Replace only keys that already exist
		const updatedData = { ...existingData };
		for (const key in jsonObject) {
			if (key in existingData) {
				updatedData[key] = jsonObject[key];
			}
		}
		
		// Compute the filename and write back to file
		const computedFilename = metadataRecomputeName(app, tagPath);
		fs.writeFileSync(computedFilename, JSON.stringify(updatedData, null, 2), 'utf-8');
		
		return true;
	} catch (error) {
		console.error("Error replacing existing metadata properties:", error);
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
		console.error("Error appending to metadata properties:", error);
		return false;
	}
}
