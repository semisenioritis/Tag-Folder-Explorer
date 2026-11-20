import { TFile, App } from 'obsidian';
import type { IFileLeaf } from '../types/interfaces';
import { logger } from '../utils/logger';

/**
 * FileLeaf class - Represents individual files as leaf nodes in the tag tree
 * 
 * FileLeaf objects are always leaf nodes in the tree structure. They represent actual files
 * in the vault and their ancestors (TagNode chain) represent the nested tag path that
 * leads to this file.
 */
export class FileLeaf implements IFileLeaf {
    // ==================== PROPERTIES ====================
    

    private name: string;
    private path: string;
    private file: TFile;
    private app: App;
    
    // ==================== CONSTRUCTOR ====================
    
    /**
     * Creates new FileLeaf object with the given name and path
     * 
     * @param name - The name of the file
     * @param path - The relative path of the file in the vault
     * @param file - The TFile reference of the actual file
     * @param app - The Obsidian App instance for API access
     * 
     * Used when: Building the tree structure from vault scan, adding new files to tree
     */
    constructor(name: string, path: string, app: App) {
        this.name = name;
        this.path = path;
        this.app = app;
        
        // Get the TFile reference from the vault using the path
        const tFile = this.app.vault.getAbstractFileByPath(path);
        if (tFile instanceof TFile) {
            this.file = tFile;
        } else {
            throw new Error(`File not found at path: ${path}`);
        }
    }
    
    

    // ==================== FUNCTIONS ====================
    
    /**
     * Gets the name of the file
     * 
     * @returns string - The filename (e.g., "my-notes.md")
     * 
     * Used when: Displaying file names in UI, file operations, tree rendering
     */
    public getName(): string {
        return this.name;
    }
    
    /**
     * Gets the path of the file
     * 
     * @returns string - The relative path of the file in the vault
     * 
     * Used when: File operations, path-based lookups, tree navigation
     */
    public getPath(): string {
        return this.path;
    }
    
    /**
     * Gets the tFile of the file
     * 
     * @return tFile - The obsidian representation of the file in the vault
     * 
     * 
     */
    public getTFile(): TFile{
        return this.file
    }

    /**
     * Updates the referenced tFile of the file
     * 
     * @param tFile - The new TFile instance
     */
    public setTFile(tFile: TFile): void {
        this.file = tFile;
    }

    /**
     * Edits/updates the name of the file
     * 
     * @param newName - The new filename to set
     * 
     * Used when: Renaming files, file management operations
     */
    public editFileName(newName: string): void {
        this.name = newName;
    }

    /**
     * Edits/updates the path of the file
     * 
     * @param newPath - The new relative path of the file in the vault
     * 
     * Used when: Moving files, reorganizing vault structure
     */
    public editPath(newPath: string): void {
        this.path = newPath;
    }



    /**
     * Retrieves all the tag paths that this file exists under
     * 
     * Reads the actual file and extracts all the tags that are present in this file,
     * both in the metadata and file body. These represent all the "paths" or locations
     * where this file appears in the tag tree.
     * 
     * @returns string[] - List of all tag paths as strings (e.g., ["subject/math", "homework"])
     * 
     * Used when: Building tree structure, updating file positions, tree validation
     */
    public async retrieveAllTagPaths(): Promise<string[]> {
        try {

            // Extract all tags from file body
            // 🔴🔴  ONLY PARTIAL SECTION OF FUNCTION IS DEPRECATED 
            // Since we are not handling the existence of tags inside the body, because deleting them from the body is a very tedious task, right now we are not using this at all. 

            const allTags: string[] = [];
            
            await this.app.fileManager.processFrontMatter(this.file, (frontmatter) => {
                if (!frontmatter) {
                    return;
                }
                
                const cleanTag = (tag:string) => tag.replace(/^#/, '');
                if (frontmatter.tags) {
                    if (Array.isArray(frontmatter.tags)) {
                        allTags.push(...frontmatter.tags.map(cleanTag));
                    } else if (typeof frontmatter.tags === 'string') {
                        allTags.push(cleanTag(frontmatter.tags));
                    }
                }
            });

            return allTags;
        } catch (error) {
            logger.error('Failed to retrieve all paths:', error);
            return [];
        }
    }
    
    /**
     * Retrieves the metadata of the actual file
     * 
     * Returns the metadata of the actual file as a dictionary/object with
     * keys representing the metadata fields.
     * 
     * @returns Record<string, any> - Dictionary with keys as the metadata fields
     * 
     * Used when: Displaying file properties, metadata-based operations, file analysis
     */
    public async fileMetadata(): Promise<Record<string, any>> {
        try {
            let metadataData: Record<string, any> = {};
            await this.app.fileManager.processFrontMatter(this.file, (frontmatter) => {
                if (frontmatter) {
                    // Make a deep copy to ensure we don't accidentally hold references to Obsidian's internal object
                    metadataData = JSON.parse(JSON.stringify(frontmatter));
                }
            });
            return metadataData;
        } catch (error) {
            logger.error('Failed to retrieve file metadata:', error);
            return {};
        }
    }
    


    /**
     * Retrieves the file's creation and modification timestamps
     * 
     * Returns an object containing the file's creation date (ctime) and
     * modification date (mtime) as stored by Obsidian. These are Unix timestamps
     * in milliseconds.
     * 
     * @returns object - Object with ctime and mtime properties
     * 
     * Used when: Displaying file timestamps, sorting by date, file metadata display
     */
    public fileObsCreateModDate(): { ctime: number; mtime: number } {
        return {
            ctime: this.file.stat.ctime,
            mtime: this.file.stat.mtime
        };
    }



    /**
     * Reads the initial content of the file for preview
     * 
     * Reads the file contents (after metadata) and strips away all initial spaces
     * and then returns the first "k" characters. "k" is yet to be decided.
     * 
    * @returns Promise<string> - String of the first k characters of the file content
     * 
     * Used when: File preview in UI, quick content display, search result previews
     */
    public async readInitial(): Promise<string> {
        try {
            // For now, setting k = 200 characters as a reasonable preview length
            const k = 200;
            
            // Get the cached metadata to find where content starts
            const metadata = this.app.metadataCache.getFileCache(this.file);
            
            // Read file content from Obsidian's cache-aware API
            let content = await this.app.vault.cachedRead(this.file);
            
            // Remove frontmatter if present
            if (content.startsWith('---')) {
                const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n/);
                if (frontmatterMatch) {
                    content = content.substring(frontmatterMatch[0].length);
                }
            }
            
            // Strip initial whitespace and newlines
            content = content.trim();
            
            // Return first k characters
            return content.length > k ? content.substring(0, k) + '...' : content;
        } catch (error) {
            logger.error('Failed to read initial content:', error);
            return '';
        }
    }
}