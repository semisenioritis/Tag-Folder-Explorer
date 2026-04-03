import { App, TFile, TFolder } from 'obsidian';
import type { ITagNode, IFileLeaf, ISerializedTagNode  } from './interfaces';
import { FileLeaf } from './FileLeaf';
import * as fs from 'fs';
import * as path from 'path';
import {metadataAddNewProperty, metadataReplaceExistingProperty, metadataAppendToProperty} from "./fileEditor"

/**
 * TagNode class - represents tag nodes in the hierarchical tag tree
 * 
 * TagNode objects form the core skeleton of the tree structure. They represent individual
 * tags or nested tag segments and maintain parent-child relationships to create the
 * hierarchical tag tree. Files (FileLeaf objects) are attached to these nodes based
 * on their tag paths.
 */
export class TagNode implements ITagNode {
    // ==================== PROPERTIES ====================
    
    /**
     * The name of the tag that this node represents
     * Multiple nodes may have the same name since they are nested at different
     * locations and under different parents (e.g., "math" under both "school/math" and "hobby/math")
     */
    private name: string;
    
    /**
     * The nested path of tags till now, including this node's tag name
     * Represents the full tag path from root to this node (e.g., "subject/math")
     */
    private path: string;
    
    /**
     * A pointer to the parent object of this node
     * Points to the parent TagNode. If this is the root node, this property is null.
     */
    private parent: ITagNode | null;
    
    /**
     * A dictionary of TagNode objects that are children of this node
     * Keyed by the names of individual tags that exist under this TagNode as children
     */
    private children: Record<string, ITagNode>;
    
    /**
     * A set of FileLeaf objects present under this tag path
     * Contains every file that has this nested tag path in it (guaranteed unique)
     */
    private files: Set<IFileLeaf>;
    
    /**
     * A set of FileLeaf objects present under this tag path
     * Contains every file that has this nested tag path in it (guaranteed unique)
     */
    private refFilePathToLeafMap: Map<string, IFileLeaf>;
    

    /**
     * Reference to the Obsidian App instance for file operations
     * Used for metadata file operations and vault access
     */
    private app: App;
    

    // ==================== CONSTRUCTOR ====================
    
    /**
     * Creates a new TagNode object with the given name, path, and parent
     * 
     * Initializes a new TagNode with the specified properties. Children and files
     * set are left empty on initialization and populated as needed.
     * 
     * @param name - The name of this tag node
     * @param path - The full nested tag path to this node
     * @param parent - The parent TagNode object, or null if this is root
     * @param app - The Obsidian App instance for file operations
     */
    constructor(name: string, path: string, parent: ITagNode | null, app: App, fileLeafMapRef: Map<string, IFileLeaf>) {
        this.name = name;
        this.path = path;
        this.parent = parent;
        this.children = {}; 
        this.refFilePathToLeafMap = fileLeafMapRef;
        this.files = new Set<IFileLeaf>();
        this.app = app;
        
        // Automatically create metadata file for this node
        this.createNewMeta();
    }
    

    // ==================== CREATE METHODS ====================

    /**
     * Given a tag name, creates a new child node under this current node
     * 
     * Creates a new TagNode as a child of this node. The new child will have
     * this node as its parent and will be added to the children dictionary.
     * 
     * @param newChildTagName - The name of the new child tag node to create
     * @returns boolean - true if successful, false if node already exists or other issues
     * 
     * Used when: Building tree structure, adding new tag branches, tree expansion
     */
    addChildNode(newChildTagName: string): boolean {
        try {
            // Validate the child tag name
            if (!newChildTagName || newChildTagName.trim() === '') {
                return false;
            }
            
            newChildTagName = newChildTagName.replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_\-\p{Extended_Pictographic}]/gu, '')
            
            const childName = newChildTagName.trim();
            
            // Check if child already exists
            if (this.children[childName]) {
                return false; // Child already exists
            }
            
            // Create the child path
            const childPath = this.path === '' ? childName : this.path + '/' + childName;
            
            // Create new child node
            const childNode = new TagNode(childName, childPath, this, this.app, this.refFilePathToLeafMap);
            
            // Add to children dictionary
            this.children[childName] = childNode;
            
            return true;
        } catch (error) {
            console.error('Error adding child node:', error);
            return false;
        }
    }

    /**
     * Creates a new FileLeaf object under this Tag Node and adds it to the files set
     * 
     * Instantiates a new FileLeaf with the provided name and path, then adds it
     * to this node's files set.
     * 
     * @param nameOfFile - The name of the file to create
     * @param pathToFile - The path to the file in the vault
     * @returns boolean - true if successful, false otherwise
     * 
     * Used when: Adding files to tag locations, building tree from vault scan
     */
    createNewFile(nameOfFile: string, pathToFile: string): boolean {
        try {
            // Validate inputs
            if (!nameOfFile || !pathToFile || nameOfFile.trim() === '' || pathToFile.trim() === '') {
                return false;
            }
            
            // Check if file already exists in this node
            if (this.getFile(pathToFile)) {
                return false; // File already exists
            }
            


            // Create FileLeaf instance and add it to this node
            // const fileLeaf = new FileLeaf(nameOfFile.trim(), pathToFile.trim(), this.app);

            // Rather than creating a new FileLeaf, just retrive it from the filePathToLeafMap
            const fileLeaf = this.fileLeafRetriever(pathToFile.trim())

            if (fileLeaf){
                this.files.add(fileLeaf);
            }else{
                console.error('File map did not contain the required FileLeaf');
                return false
            }
            
            
            return true;
        } catch (error) {
            console.error('Error creating new file:', error);
            return false;
        }
    }
    
    /**
     * Checks if a metadata file corresponding to this node exists, creates it if it doesn't
     * 
     * Creates a new metadata file in the `.TagNodeMeta` hidden folder at vault root.
     * The filename follows the convention: `{path_with_underscores}_{base64_encoded_path}.json`
     * For example, path "subject/math" becomes "subject_math_c3ViamVjdC9tYXRo.json"
     * The file contains a JSON object for metadata storage.
     * 
     * @returns boolean - true if created successfully, false if already exists or other issues
     * 
     * Used when: Initializing tag metadata, setting up tag properties, first-time tag creation
     */
    createNewMeta(): boolean {
        try {
            const metadataPath = this.getMetadataFilePath();
            
            // Check if metadata file already exists
            if (fs.existsSync(metadataPath)) {
                return false; // File already exists
            }
            
            // Ensure .TagNodeMeta folder exists
            const metaFolderPath = path.dirname(metadataPath);
            if (!fs.existsSync(metaFolderPath)) {
                fs.mkdirSync(metaFolderPath, { recursive: true });
            }
            
            // Create initial metadata object
            const metadataObject = {
                path: this.path,
                name: this.name,
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                description: ``,
                legend:{
                    Red: "",
                    Orange: "",
                    Yellow: "",
                    Green: "",
                    Blue: "",
                    Purple: ""
                }
            };
            
            // Convert to JSON string with formatting
            const jsonContent = JSON.stringify(metadataObject, null, 2);
            
            // Create the metadata file
            fs.writeFileSync(metadataPath, jsonContent, 'utf8');
            
            return true;
        } catch (error) {
            console.error('Error creating metadata file:', error);
            return false;
        }
    }




    // ==================== READ METHODS ====================
    
    /**
     * Gets the name of the node object and returns it
     * 
     * @returns string - The name of this tag node
     * 
     * Used when: Display operations, node identification, tree traversal
     */
    getName(): string {
        return this.name;
    }
    
    /**
     * Gets the path of the node object and returns it
     * 
     * @returns string - The full nested tag path to this node
     * 
     * eg if the folder name is "math" and its parent is "subject", the path is "subject/math"
     * 
     * Used when: Path display, breadcrumb generation, node location identification
     */
    getPath(): string {
        return this.path;
    }
    
    /**
     * Gets the parent of the node object and returns it
     * 
     * @returns ITagNode | null - The parent TagNode object, or null if this is root
     * 
     * Used when: Tree traversal upward, path reconstruction, parent operations
     */
    getParent(): ITagNode | null {
        return this.parent;
    }
    
    /**
     * Gets all children of the node object and returns them
     * 
     * @returns Record<string, ITagNode> - Dictionary of all child TagNode objects
     * 
     * Used when: Tree traversal downward, displaying child tags, tree expansion
     */
    getChildren(): Record<string, ITagNode> {
        return this.children;
    }
    
    /**
     * Gets a specific child of the node object with a given name and returns it
     * 
     * @param nameOfChild - The name of the child node to retrieve
     * @returns ITagNode | null - The child TagNode object, or null if not found
     * 
     * Used when: Navigating to specific child, checking child existence, targeted operations
     */
    getChild(nameOfChild: string): ITagNode | null {
        return this.children[nameOfChild] || null;
    }
    
    /**
     * Gets all the files of the node object and returns them
     * 
     * @returns Set of all FileLeaf objects under this node
     * 
     * Used when: Displaying files under tag, file listing, content operations
     */
    getFiles(): Set<IFileLeaf> {
        return this.files;
    }
    
    /**
     * Gets a specific file of the node object with a given name and returns it
     * 
     * @param nameOfFile - The name of the file to retrieve
     * @returns IFileLeaf | null - The FileLeaf object, or null if not found
     * 
     * Used when: Finding specific file, file operations, targeted file access
     */
    getFile(pathOfFile: string): IFileLeaf | null {
        for (const file of this.files) {
            if (file.getPath() === pathOfFile) {
                return file;
            }
        }
        return null;
    }
    
    
    /**
     * Generates the absolute file system path for this TagNode's metadata file
     * 
     * Creates the full path using the convention: {vault_path}/.TagNodeMeta/{path_with_underscores}_{base64_encoded_path}.json
     * For example, path "subject/math" becomes "{vault}/.TagNodeMeta/subject_math_c3ViamVjdC5tYXRo.json"
     * 
     * @returns string - The absolute file system path to the metadata file
     */
    private getMetadataFilePath(): string {
        // Get the vault's base path from the app
        const vaultPath = (this.app.vault.adapter as any).basePath || '';
        
        // Replace / with _ for human-readable part
        const humanReadablePath = this.path.replace(/\//g, '_');
        
        // Base64 encode the original path
        const base64Path = btoa(this.path);
        
        // Combine both parts with underscore separator and .json extension
        const filename = `${humanReadablePath}_${base64Path}.json`;
        
        // Return absolute path
        return path.join(vaultPath, '.TagNodeMeta', filename);
    }
    

    /**
     * Retrieves the metadata inside the metadata file corresponding to this node
     * 
     * Reads and parses the metadata file from `.TagNodeMeta` folder for this tag node.
     * Parses the JSON content and returns it as a dictionary/object.
     * Uses the path-based filename convention to locate the file.
     * 
     * @returns Record<string, any> - Contents of metadata JSON file as dictionary
     * 
     * Used when: Reading tag properties, loading tag settings, metadata operations
     */
    readMeta(): Record<string, any> {
        try {
            const metadataPath = this.getMetadataFilePath();
            
            // Check if metadata file exists
            if (!fs.existsSync(metadataPath)) {
                return {}; // File doesn't exist, return empty object
            }
            
            // Read file content
            const fileContent = fs.readFileSync(metadataPath, 'utf8');
            
            // Parse JSON content
            const metadata = JSON.parse(fileContent);
            
            return metadata;
        } catch (error) {
            console.error('Error reading metadata file:', error);
            return {};
        }
    }    



    // ==================== UPDATE METHODS ====================
    
    /**
     * Given the new name of the node, renames the node
     * 
     * Updates the name property of this node. Also updates the path with the new name.
     * Does not propagate changes to children or parent relationships.
     * 
     * @param newName - The new name for this tag node
     * @returns boolean - true if successful, false otherwise
     * 
     * Used when: Tag renaming operations, node name corrections, tree restructuring
     */
    renameNode(newName: string): boolean {
        try {
            // Validate the new name
            if (!newName || newName.trim() === '') {
                return false;
            }
            
            // Update the name
            this.name = newName.trim();
            
            // Reconstruct the path with the new name
            if (this.parent) {
                this.path = this.parent.getPath() + '/' + this.name;
            } else {
                this.path = this.name;
            }
            
            return true;
        } catch (error) {
            console.error('Error renaming node:', error);
            return false;
        }
    }
    
    /**
     * Given a new path for this node, replaces the old path with the new path
     * 
     * Updates the path property of this node. Should be used carefully as it
     * affects the node's position in the tree hierarchy.
     * Technically it doesnt affect the actual position in the tree, but changes teh values that this node stores as its own path and name. 
     * Extracts the node name from the new path and updates the name property as well.
     * 
     * @param newPath - The new path for this tag node
     * @returns boolean - true if successful, false otherwise
     * 
     * Used when: Tree restructuring, path corrections, node relocation
     */
    editPath(newPath: string): boolean {
        try {
            // Validate the new path
            if (!newPath || newPath.trim() === '') {
                return false;
            }
            
            // Extract the name from the path (last segment after final '/')
            const pathSegments = newPath.trim().split('/');
            const extractedName = pathSegments[pathSegments.length - 1];
            
            if (!extractedName) {
                return false;
            }
            
            // Update both path and name
            this.path = newPath.trim();
            this.name = extractedName;
            
            return true;
        } catch (error) {
            console.error('Error editing path:', error);
            return false;
        }
    }
    

    /**
     * Updates an existing metadata file with the payload that is provided
     * 
     * Modifies the metadata file in `.TagNodeMeta` folder corresponding to this node.
     * The payload data is written as JSON.
     * The filename is generated using the path-to-filename convention with base64 encoding.
     * 
     * @param payload - The metadata content to write as JSON
     * @param operation - The operation to perform: 'add' (only add new keys), 'replace' (replace existing or add new), 'append' (append to existing or add new)
     * @returns boolean - true if update successful, false otherwise
     * 
     * Used when: Updating tag properties, modifying tag settings, metadata synchronization
     */
    updateMeta(payload: Record<string, any>, operation: 'add' | 'replace' | 'append' = 'replace'): boolean {
        try {
            const metadataPath = this.getMetadataFilePath();
            
            // Check if metadata file exists
            if (!fs.existsSync(metadataPath)) {
                return false; // File doesn't exist
            }
            

            // Call the appropriate function based on operation
            switch (operation) {
                case 'add':
                    return metadataAddNewProperty(this.app, this.path, payload);
                case 'replace':
                    return metadataReplaceExistingProperty(this.app, this.path, payload);
                case 'append':
                    return metadataAppendToProperty(this.app, this.path, payload);
                default:
                    console.error('Invalid operation type:', operation);
                    return false;
            }
        } catch (error) {
            console.error('Error updating metadata file:', error);
            return false;
        }
    }
    


    // ==================== DELETE METHODS ====================
    
    /**
     * Given a child tag name, removes that child node from the children list
     * 
     * Removes the specified child node and recursively deletes that node and
     * all its children. This is a destructive operation.
     * 
     * @param childTagName - The name of the child tag node to remove
     * @returns boolean - true if successful, false otherwise
     * 
     * Used when: Tree pruning, tag removal, tree cleanup operations
     */
    removeChildNode(childTagName: string): boolean {
        try {
            // Check if child exists
            if (!this.children[childTagName]) {
                return false; // Child doesn't exist
            }
            
            // Get the child node
            const childNode = this.children[childTagName];
            
            // Remove from children dictionary
            delete this.children[childTagName];

            childNode.deleteMeta();
            
            return true;
        } catch (error) {
            console.error('Error removing child node:', error);
            return false;
        }
    }
    

    /**
     * Given a filename, removes the FileLeaf object from this node
     * 
     * Searches for the file with the specified name in the files set and
     * removes it from this node.
     * 
     * @param fileName - The name of the file to remove
     * @returns boolean - true if successful, false otherwise
     * 
     * Used when: File deletion, tag removal from files, tree maintenance
     */
    removeFile(filePath:string): boolean {
        try {
            // Find the file with the matching name
            for (const file of this.files) {
                if (file.getPath() === filePath) {
                    // Remove the file from the set
                    this.files.delete(file);
                    return true;
                }
            }
            
            return false; // File not found
        } catch (error) {
            console.error('Error removing file:', error);
            return false;
        }
    }
   
    
    /**
     * Deletes the metadata file corresponding to this node
     * 
     * Removes the metadata file from `.TagNodeMeta` folder associated with this tag node.
     * Uses the path-based filename convention to locate and delete the correct file.
     * This is a destructive operation that permanently removes the metadata.
     * 
     * @returns boolean - true if delete successful, false otherwise
     * 
     * Used when: Tag cleanup, removing tag metadata, tree maintenance
     */

    /**
    Moves the metadata file to .trash/TagNodeMetadata instead of deleting it.
    Creates the necessary folders if they don't exist.
     */
    deleteMeta(): boolean {
        try {
            const metadataPath = this.getMetadataFilePath();
            
            // Check if metadata file exists
            if (!fs.existsSync(metadataPath)) {
                return false; // File doesn't exist
            }
            
            // Get vault path
            const vaultPath = (this.app.vault.adapter as any).basePath || '';
            
            // Create .trash folder if it doesn't exist
            const trashPath = path.join(vaultPath, '.trash');
            if (!fs.existsSync(trashPath)) {
                fs.mkdirSync(trashPath, { recursive: true });
            }
            
            // Create TagNodeMetadata folder inside .trash if it doesn't exist
            const tagNodeMetadataPath = path.join(trashPath, 'TagNodeMetadata');
            if (!fs.existsSync(tagNodeMetadataPath)) {
                fs.mkdirSync(tagNodeMetadataPath, { recursive: true });
            }
            
            // Get the filename from the metadata path
            const filename = path.basename(metadataPath);
            
            // Construct destination path
            const destinationPath = path.join(tagNodeMetadataPath, filename);
            
            // Move the file to the trash folder
            fs.renameSync(metadataPath, destinationPath);
            
            return true;
        } catch (error) {
            console.error('Error moving metadata file to trash:', error);
            return false;
        }
    }
    

   
    /**
     * Serializes a TagNode object into a static format for UI rendering
     * 
     * Converts a TagNode object with object references into a simple static object
     * with string-based identifiers. This static format is designed to be easily
     * consumed by the UI interface without needing to traverse object references.
     * 
     * @param node - The TagNode object to serialize
     * @returns ISerializedTagNode - Static representation of the tag node
     * 
     */
    serializeTagNode(sortFlag:boolean): ISerializedTagNode {
        // Get parent name (null if root node)
        const parentName = this.getParent() ? this.getParent()!.getName() : null;
        
        // Get children with names and paths
        const childrenData = Object.values(this.getChildren()).map(child => ({
            name: child.getName(),
            path: child.getPath(),
            parentPath: child.getParent()?.getPath() ?? ""
        }))
        .sort((a, b) => sortFlag ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
        
        // Get files with names and paths
        const filesData = Array.from(this.getFiles()).map(file => ({
            name: file.getName(),
            path: file.getPath(),
            parentPath: this.getPath() ?? ""


        }))
        .sort((a, b) => sortFlag ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
        
        return {
            name: this.getName(),
            path: this.getPath(),
            parent: parentName,
            children: childrenData,
            files: filesData
        };
    }


    /**
     * Gets the file path to FileLeaf dictionary
     * 
     * @returns Map<string, IFileLeaf> - Dictionary mapping file paths to FileLeaf objects
     * 
     * Used when: Fast lookups of FileLeaf objects by path, checking if file exists in vault
     */
    public getFilePathMap(): Map<string, IFileLeaf> {
        return this.refFilePathToLeafMap;
    }
    
    /**
     * Retrieves a FileLeaf object by its file path
     * 
     * Uses the pre-built file path dictionary for O(1) lookup time.
     * This is the primary method for retrieving FileLeaf objects by path.
     * 
     * @param filepath - The path of the file relative to vault root
     * @returns IFileLeaf | null - The FileLeaf object if found, null otherwise
     * 
     * Used when: Fast file lookups, getting FileLeaf reference, checking file existence
     */
    public fileLeafRetriever(filepath: string): IFileLeaf | null {
        if (!filepath || filepath.trim() === '') {
            return null;
        }
        
        return this.refFilePathToLeafMap.get(filepath) || null;
    }

    public addFileLeaftoFiles(fileLeaf:IFileLeaf):boolean{

        if(fileLeaf){
            this.files.add(fileLeaf);
            return true
        }
        else{
            return false
        }
    }

    /**
     * Updates the file path key in the filePathToLeafMap dictionary
     * 
     * When a file is renamed or moved, this function updates the map entry
     * by removing the old path key and adding the new path key while preserving
     * the same FileLeaf object reference.
     * 
     * @param oldfilepath - The current/old file path (existing key in the map)
     * @param newfilepath - The new file path (new key for the map)
     * @returns boolean - true if update successful, false if old path not found or new path already exists
     * 
     * Used when: File rename operations, file move operations, maintaining map consistency
     */
    public fileLeafIndexUpdater(oldfilepath: string, newfilepath: string): boolean {
        // Validate inputs
        if (!oldfilepath || !newfilepath || oldfilepath.trim() === '' || newfilepath.trim() === '') {
            return false;
        }
        
        // Check if old path exists in the map
        const fileLeaf = this.refFilePathToLeafMap.get(oldfilepath);
        if (!fileLeaf) {
            console.error(`Old file path not found in map: ${oldfilepath}`);
            return false;
        }
        
        // Check if new path already exists (avoid overwriting)
        if (this.refFilePathToLeafMap.has(newfilepath)) {
            console.error(`New file path already exists in map: ${newfilepath}`);
            return false;
        }
        
        // Remove the old key and add the new key with the same FileLeaf reference
        this.refFilePathToLeafMap.delete(oldfilepath);
        this.refFilePathToLeafMap.set(newfilepath, fileLeaf);
        
        return true;
    }

}