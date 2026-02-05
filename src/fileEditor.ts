import { App, TFile } from "obsidian";

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
		
		// Find a unique file name
		let finalName = fileName + extension;
		let counter = 1;
		
		while (app.vault.getAbstractFileByPath(`${folderPath}${finalName}`)) {
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
		const cache = app.metadataCache.getFileCache(file);
		const hasFrontmatter = cache?.frontmatter !== undefined;
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
		const folderPath = file.parent ? `${file.parent.path}/` : "";
		
		// Find a unique file name
		let finalName = `${newName}.${extension}`;
		let counter = 1;
		
		while (app.vault.getAbstractFileByPath(`${folderPath}${finalName}`)) {
			// Skip if it's the same file
			if (`${folderPath}${finalName}` === file.path) {
				return { success: true, file };
			}
			finalName = `${newName} ${counter}.${extension}`;
			counter++;
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
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			return {};
		}
		
		// Return a copy of the frontmatter object, excluding the internal 'position' property
		const { position, ...frontmatterData } = cache.frontmatter;
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
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			return undefined;
		}
		
		return cache.frontmatter[key];
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
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			return [];
		}
		
		const frontmatter = cache.frontmatter;
		const tags: string[] = [];
		
		// Check for 'tags' property (can be array or string)
		if (frontmatter.tags) {
			if (Array.isArray(frontmatter.tags)) {
				tags.push(...frontmatter.tags);
			} else if (typeof frontmatter.tags === 'string') {
				tags.push(frontmatter.tags);
			}
		}
		
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
export async function extractAllTagsFromFileBody(
	app: App,
	file: TFile
): Promise<string[]> {
	try {
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
		
		return allTags;
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
		// Normalize the tag (remove '#' if present)
		const normalizedTag = tag.startsWith('#') ? tag.slice(1) : tag;
		
		// Get current tags from metadata cache
		const cache = app.metadataCache.getFileCache(file);
		const currentTags = cache?.frontmatter?.tags;
		
		if (!currentTags) {
			return true; // No tags to remove
		}
		
		// Process frontmatter to update tags
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			if (frontmatter.tags) {
				let tags = frontmatter.tags;
				
				// Ensure tags is an array
				if (!Array.isArray(tags)) {
					tags = [tags];
				}
				
				// Filter out the tag to remove (normalize each tag for comparison)
				frontmatter.tags = tags.filter((t: string) => {
					const cleanTag = t.startsWith('#') ? t.slice(1) : t;
					return cleanTag !== normalizedTag;
				});
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
		// Check if file has frontmatter
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			return true; // No frontmatter to delete
		}
		
		// Process frontmatter to delete all keys
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			// Get all keys and delete them
			const keys = Object.keys(frontmatter);
			for (const key of keys) {
				delete frontmatter[key];
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
		// Check if file has frontmatter
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			return true; // No frontmatter exists
		}
		
		// Process frontmatter to delete the specific key
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			delete frontmatter[key];
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
				// Only add if the key doesn't already exist
				if (!(key in frontmatter)) {
					// check if the field already exists in the types.json
					if (key in properties){
						// if it does then check if the type matches
						// calculate key type
						console.log(key)
						let keyType = getObsidianMetadataType(content[key])
						console.log(keyType)
						// calculate my content type
						// if key exists then extract widget else return null
						let actualType = properties[key].widget ? properties[key].widget : "text";
						// check if they match
						// if they do match 
						if (areMetadataTypesCompatible(actualType,keyType)){
							frontmatter[key] = content[key];	
						}else{
							console.warn(`Skipping key '${key}': type mismatch (expected ${actualType}, got ${keyType})`);
							continue;
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
 
		// Retrive the fields and their types
		// @ts-ignore
		const properties = app.metadataTypeManager?.properties;

		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			// Iterate through each key in the content object
			for (const key in content) {
				// check if the field already exists in the types.json
				if (key in properties){
					// if it does then check if the type matches
					// calculate key type
					console.log(key)
					let keyType = getObsidianMetadataType(content[key])
					console.log(keyType)
					// calculate my content type
					// if key exists then extract widget else return null
					let actualType = properties[key].widget ? properties[key].widget : "text";
					// check if they match
					// if they do match 
					if (areMetadataTypesCompatible(actualType,keyType)){
						frontmatter[key] = content[key];	
					}else{
						console.warn(`Skipping key '${key}': type mismatch (expected ${actualType}, got ${keyType})`);
						continue;
					}
				}else{
					// if it doesnt exist just create it. 
					frontmatter[key] = content[key];
				}					
				
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

		// Retrive the fields and their types
		// @ts-ignore
		const properties = app.metadataTypeManager?.properties;

		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			// Iterate through each key in the content object
			for (const key in content) {
				// check if the field already exists in the types.json
				if (key in properties){
					// if it does then check if the type matches
					// calculate key type
					console.log(key)
					let keyType = getObsidianMetadataType(content[key])
					console.log(keyType)
					// calculate my content type
					// if key exists then extract widget else return null
					let actualType = properties[key].widget ? properties[key].widget : "text";
					// check if they match
					// if they do match 
					if (areMetadataTypesCompatible(actualType,keyType)){
						// if actual type is date or datetime or checkbox, dont 
                        if (actualType === 'date' || actualType === 'datetime' || actualType === 'checkbox') {
                            // Skip appending for these types as they don't support appending
                            console.warn(`Skipping key '${key}': type '${actualType}' does not support appending`);
                            continue;
                        } else if(actualType === 'tags' || actualType === 'multitext'){
							if(frontmatter[key] == null){
								frontmatter[key] = content[key];	
							} 
							else {	
								frontmatter[key]  = [...frontmatter[key], ...content[key]];
							}
						}
						
						else {
							frontmatter[key] = frontmatter[key] + content[key];	
						}
						
					}else{
						console.warn(`Skipping key '${key}': type mismatch (expected ${actualType}, got ${keyType})`);
						continue;
					}
				}else{
					// if it doesnt exist just create it. 
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
		// Get current tags from frontmatter
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter?.tags) {
			return true; // No tags to normalize
		}
		
		// Extract and deduplicate tags
		let tags = cache.frontmatter.tags;
		if (!Array.isArray(tags)) {
			tags = [tags];
		}
		
		// Convert to set and back to array to remove duplicates
		// Also normalize by removing '#' prefix if present
		const normalizedTags = [...new Set(tags.map((tag: string) => {
			return tag.startsWith('#') ? tag.slice(1) : tag;
		}))];
		
		// Update frontmatter with normalized tags
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
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
