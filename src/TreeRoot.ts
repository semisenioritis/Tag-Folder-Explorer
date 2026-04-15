import { App, TFile, TFolder } from 'obsidian';
import type { ITreeRoot, ITagNode, IFileLeaf, ISerializedTagNode, SerializedTreeData} from './interfaces';
import { TagNode } from './TagNode';
import { FileLeaf } from './FileLeaf';
import * as fs from 'fs';
import * as path from 'path';

import  type { TagFolderPluginSettings } from './settings';
/**
 * TreeRoot class - represents the root of the tag tree
 * 
 * TreeRoot object is the root of the tag tree structure. It contains the top-level tag nodes
 * and untagged files. It manages the overall tree structure and provides methods to query
 * and manipulate nodes throughout the entire tree hierarchy.
 */
export class TreeRoot implements ITreeRoot {
    // ==================== PROPERTIES ====================
    
    /**
     * The tags that have no parents and are directly under the root.
     * Contains a set of top-level TagNode objects.
     */
    private rootTags: Set<ITagNode>;
    
    /**
     * Files that don't have any parent tags associated with them.
     * Contains a set of FileLeaf objects that are untagged.
     */
    private untaggedFiles: Set<IFileLeaf>;
    
    /**
     * A set of folder paths that should be skipped during tree computation.
     * Each string is a folder path relative to the vault root.
     * For example: "Private", "Work/Secret", etc.
     */
    private excludedFolders: Set<string>;
    
    /**
     * Reference to the Obsidian App instance for vault operations.
     * Used for file access, metadata operations, and tree computation.
     */
    private app: App;
    
   
    private settings: TagFolderPluginSettings;
    
    /**
     * Version counter that tracks the state of the serialized tree.
     * Incremented every time the tree is recomputed or serialized tree changes.
     * Used for synchronization between backend and frontend views.
     */
    private treeVersion: number = 0;
    
    /**
     * Cache of the last serialized tree to avoid recomputation.
     * Invalidated whenever tree structure changes.
     */
    private cachedSerializedTree: Record<'asc' | 'desc', SerializedTreeData | null> = {
        asc: null,
        desc: null,
    }

    /**
     * Dictionary mapping file paths to their corresponding FileLeaf objects.
     * Created before tree construction to enable fast file lookups.
     * Key: file path (relative to vault root), Value: FileLeaf object
     */
    private filePathToLeafMap: Map<string, IFileLeaf> = new Map() 



    /**
     * The ITagNode Version of the Root of the file structure. 
     * Orignally the constructRootNode function was used to just wrap the properties of the TreeRoot such as untaggedFiles etc and allow direct manipulation without a middle man.
     * The root-tag-node technically didnt exist and was just a way to interact with the tree root in a tagnode format. 
     * But it creates unnecesary duplications such as:
     *      the original way to delete from a tree would be via delChildFile, and that should hand over to the tagnode.removeFile
     *      But instead when it comes to the root tag node, delChildFile takes things into its own hands and makes the changes itself. 
     *      Not a big deal now, but will lead to inconsistencies later. 
     * 
     * Simply put it is the Root Tag Node.
     */
    private rootTagNode!: ITagNode;

    // ==================== CONSTRUCTOR ====================
    
    /**
     * Creates a new TreeRoot object
     * 
     * Initializes the tree root with empty root tags and untagged files collections.
     * The actual tree structure is populated via recomputeTree() method.
     * 
     * @param app - The Obsidian App instance for vault access and file operations
     * @param excludedFolders - Optional set of folder paths to skip during computation
     */
    private constructor(app: App, settings: TagFolderPluginSettings ) {
        this.app = app;
        this.excludedFolders = new Set<string>();

        // retrieve the excluded folders from the obsidian settings. in obsidian, the excluded folders is a simple text box where each path to be expluded is placed on a separate line. 

        this.settings = settings;

        this.rootTags = new Set<ITagNode>();
        this.untaggedFiles = new Set<IFileLeaf>();

        // rootTagNode will be properly initialized in create
        this.rootTagNode = null as unknown as ITagNode;
    }

    public static async create(app: App, settings: TagFolderPluginSettings): Promise<TreeRoot> {
        const instance = new TreeRoot(app, settings);
        instance.rootTagNode = instance.constructRootNode();
        await instance.recomputeTree(settings);
        return instance;
    }

    // ==================== READ METHODS ====================
    
    /**
     * Gets the set of TagNode objects at the root level of the tree
     * 
     * @returns Set<ITagNode> - The set of root tags in the tree
     * 
     * Used when: Displaying top-level tags, tree traversal starting point
     */
    public getRootTags(): Set<ITagNode> {
        return this.rootTags;
    }
    
    /**
     * Gets the set of FileLeaf objects that are untagged
     * 
     * @returns Set<IFileLeaf> - The set of untagged files in the tree
     * 
     * Used when: Displaying untagged files, handling files without tags
     */
    public getUntaggedFiles(): Set<IFileLeaf> {
        return this.untaggedFiles;
    }
    
    /**
     * Gets the list of folder paths that should be skipped during tree computation
     * 
     * @returns string[] - Array of excluded folder paths relative to vault root
     * 
     * Used when: Tree computation, filtering folders, configuration queries
     */
    public getSkipFolderPath(): string[] {
        return Array.from(this.excludedFolders);
    }
    
    /**
     * Gets the Obsidian App instance
     * 
     * @returns App - The Obsidian App instance used by this TreeRoot
     * 
     * Used when: Accessing vault operations from external code
     */
    public getApp(): App {
        return this.app;
    }
    
    /**
     * Gets a readonly JSON representation of the sorted tree
     * Currently returns the raw tree structure; sorting implementations can be added later.
     * Uses caching to avoid redundant serialization.
     * 
     * @returns unknown - JSON representation of the tree structure
     * 
     * Used when: Frontend rendering, static tree snapshots, tree serialization
     */
    public getSortedTree(sortFlag: boolean = true): SerializedTreeData | null{
        const cacheKey: 'asc' | 'desc' = sortFlag ? 'asc' : 'desc';

        // Return cached version if available
        if (this.cachedSerializedTree[cacheKey] !== null) {
            return this.cachedSerializedTree[cacheKey];
        }
        
        // Serialize and cache the tree
        this.cachedSerializedTree[cacheKey] = this.serializeTree(sortFlag);
        return this.cachedSerializedTree[cacheKey];
    }
    
    /**
     * Gets the current tree version counter
     * 
     * @returns number - The current version counter
     * 
     * Used when: Views need to check if their cached tree is up-to-date
     */
    public getTreeVersion(): number {
        return this.treeVersion;
    }
    /**
     * Gets the file path to FileLeaf dictionary
     * 
     * @returns Map<string, IFileLeaf> - Dictionary mapping file paths to FileLeaf objects
     * 
     * Used when: Fast lookups of FileLeaf objects by path, checking if file exists in vault
     */
    public getFilePathMap(): Map<string, IFileLeaf> {
        return this.filePathToLeafMap;
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
        
        return this.filePathToLeafMap.get(filepath) || null;
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
        const fileLeaf = this.filePathToLeafMap.get(oldfilepath);
        if (!fileLeaf) {
            console.error(`Old file path not found in map: ${oldfilepath}`);
            return false;
        }
        
        // Check if new path already exists (avoid overwriting)
        if (this.filePathToLeafMap.has(newfilepath)) {
            console.error(`New file path already exists in map: ${newfilepath}`);
            return false;
        }
        
        // Remove the old key and add the new key with the same FileLeaf reference
        this.filePathToLeafMap.delete(oldfilepath);
        this.filePathToLeafMap.set(newfilepath, fileLeaf);
        
        return true;
    }

    /**
     * Gets the root tag node (proxy TagNode version of TreeRoot)
     * 
     * @returns ITagNode - The root TagNode object
     * 
     * Used when: Need to treat TreeRoot as a TagNode for unified operations
     */
    public getRootNode(): ITagNode {
        return this.rootTagNode;
    }

    /**
     * Invalidates the cached serialized tree and increments version.
     * Should be called whenever the tree structure is modified without full recomputation.
     */
    public invalidateCache(): void {
        this.cachedSerializedTree.asc = null;
        this.cachedSerializedTree.desc = null;
        this.treeVersion++;
    }
    
    /**
     * Returns all instances of a file in the tree by searching all tag paths
     * 
     * Traverses the entire tree to find all locations where a file appears based on its tags.
     * Since files can have multiple tags, they can appear in multiple locations.
     * 
     * @param filename - The name of the file
     * @param filepath - The path of the file relative to vault root
     * @returns string[] - Array of tag paths where this file appears
     * 
     * Used when: File location queries, tag path retrieval, file analysis
     */
    public getAllInstancesOfFile(filename: string, filepath: string): string[] {
        const instances: string[] = [];
        
        // Check untagged files
        for (const file of this.untaggedFiles) {
            if (file.getPath() === filepath) {
                instances.push(''); // Empty string represents untagged
                break;
            }
        }
        
        // Recursively search in root tags
        const searchInNode = (node: ITagNode) => {
            const files = node.getFiles();
            for (const file of files) {
                if (file.getName() === filename && file.getPath() === filepath) {
                    instances.push(node.getPath());
                } 
            }
            
            // Search in children
            const children = node.getChildren();
            for (const childName in children) {
                searchInNode(children[childName]);
            }
        };
        
        for (const rootTag of this.rootTags) {
            searchInNode(rootTag);
        }
        
        return instances;
    }
    
    /**
     * Private method to kinda convert the TreeRoot object into a TagNode object.
     * The reason for this is that while inside the whole tree, we basically just treat each tag like a TagNode object and all methods of interface basically have learnt to process TagNodes, the root node doesnt act like one. 
     * Rather than forcing each method to take in a root aswell as a common node, we have two options
     * 1. convert the root into a common node. (ideal solution, but it would take reworking on a very conceptual level. there is a reason why the root is separate and not like the nodes and id have to find a way to find the union of a node and a root for this)
     * 2. create a proxy tagnode version of the root with refercnces to the original treeroot properties. since we will have the orchestrator and the controller layers in the middle, we can ealiy expose this "tag node" object and since its functions mimic the actions of what a root would do if treatd as a node, we get best of oth worlds
     * 
     * Only one issue in the current implementation is that properties of the root and node for eg children-rootTags which should be exactly the same arent the same and thus result in each function having to pickup that slack of unifying them and then proceeding.
     * eg in this method, getChildren requires teh creation of a Record for the root. The rootTags of the root should already have been in a Record format. 
     *
     * @param null 
     * @returns ITagNode  - The TagNode object version of the TreeRoot object with the same references as that of the TreeRoot. 
     * 
     */
    private constructRootNode(): ITagNode{
        let rootNode = {
            // Creates new child tag object and adds it to rootTags
            addChildNode: (newChildTagName: string): boolean => {
                try {
                    if (!newChildTagName || newChildTagName.trim() === '') {
                        return false;
                    }
                    
                    newChildTagName = newChildTagName.replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_\-\p{Extended_Pictographic}]/gu, '')
            
                    const childName = newChildTagName.trim();
                    
                    // Check if child already exists in rootTags
                    for (const tag of this.rootTags) {
                        if (tag.getName() === childName) {
                            return false; // Child already exists
                        }
                    }
                    
                    // Create new root tag node
                    const childNode = new TagNode(childName, childName, this.rootTagNode, this.app, this.filePathToLeafMap);
                    this.rootTags.add(childNode);
                    
                    return true;
                } catch (error) {
                    console.error('Error adding child node to root:', error);
                    return false;
                }
            },
            
            // Creates new file object and adds it to untaggedFiles
            createNewFile: (nameOfFile: string, pathToFile: string): boolean => {
                try {
                    if (!nameOfFile || !pathToFile || nameOfFile.trim() === '' || pathToFile.trim() === '') {
                        return false;
                    }
                    
                    // Check if file already exists in untaggedFiles
                    for (const file of this.untaggedFiles) {
                        if (file.getPath() === pathToFile) {
                            return false; // File already exists
                        }
                    }
                    
                    // Create FileLeaf instance and add to untaggedFiles
                    // const fileLeaf = new FileLeaf(nameOfFile.trim(), pathToFile.trim(), this.app);
                    
                    
                    // Retriveing the file from the file map
                    const fileLeaf = this.fileLeafRetriever(pathToFile.trim())


                    if (fileLeaf){
                        this.untaggedFiles.add(fileLeaf);
                    }else{
                        console.error('File map did not contain the required FileLeaf');
                        return false
                    }
                    
                    
                    return true;
                } catch (error) {
                    console.error('Error creating new file in root:', error);
                    return false;
                }
            },
            
            createNewMeta: () => false,
            getName: () => "",
            getPath: () => "",
            getParent: () => null,
            
            // Returns the rootTags as a Record
            getChildren: (): Record<string, ITagNode> => {
                const children: Record<string, ITagNode> = {};
                for (const tag of this.rootTags) {
                    children[tag.getName()] = tag;
                }
                return children;
            },
            
            // Returns specific tag from rootTags
            getChild: (nameOfChild: string): ITagNode | null => {
                for (const tag of this.rootTags) {
                    if (tag.getName() === nameOfChild) {
                        return tag;
                    }
                }
                return null;
            },
            
            // Returns the untaggedFiles set
            getFiles: () => this.untaggedFiles,
            
            // Returns specific file from untaggedFiles
            getFile: (pathToFile: string): IFileLeaf | null => {
                for (const file of this.untaggedFiles) {
                    if (file.getPath() === pathToFile) {
                        return file;
                    }
                }
                return null;
            },
            
            readMeta: () => ({name:"", path:""}),
            renameNode: (newName: string) => false,
            editPath: (newPath: string) => false,
            updateMeta: (payload: Record<string, any>) => false,
            
            // Removes specific tag from rootTags
            removeChildNode: (childTagName: string): boolean => {
                try {
                    // Find and remove the child from rootTags
                    for (const tag of this.rootTags) {
                        if (tag.getName() === childTagName) {
                            this.rootTags.delete(tag);
                            return true;
                        }
                    }
                    return false; // Child not found
                } catch (error) {
                    console.error('Error removing child node from root:', error);
                    return false;
                }
            },
            
            // Removes specific file from untaggedFiles
            removeFile: (filePath: string): boolean => {
                try {
                    // Find and remove the file from untaggedFiles
                    for (const file of this.untaggedFiles) {
                        if (file.getPath() === filePath) {
                            this.untaggedFiles.delete(file);
                            return true;
                        }
                    }
                    return false; // File not found
                } catch (error) {
                    console.error('Error removing file from root:', error);
                    return false;
                }
            },
            deleteMeta: () => false,
            serializeTagNode: (sortFlag: boolean = true): ISerializedTagNode => {
               
                // Get children with names and paths
                const childrenData = Object.values(rootNode.getChildren()).map(child => ({
                    name: child.getName(),
                    path: child.getPath(),
                    parentPath: ""
                }))
                .sort((a, b) => sortFlag ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
                
                // Get files with names and paths
                const filesData = Array.from(rootNode.getFiles()).map(file => ({
                    name: file.getName(),
                    path: file.getPath(),
                    parentPath: ""
                }))
                .sort((a, b) => sortFlag ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

                
                return {
                    name: rootNode.getName(),
                    path: rootNode.getPath(),
                    parent: null,
                    children: childrenData,
                    files: filesData
                };


            }, 

            addFileLeaftoFiles: (fileLeaf:IFileLeaf):boolean =>{
                if(fileLeaf){
                    this.untaggedFiles.add(fileLeaf);
                    return true
                } else{
                    return false
                }

            },

            fileLeafIndexUpdater: (oldfilepath: string, newfilepath: string): boolean =>{
                // Validate inputs
                if (!oldfilepath || !newfilepath || oldfilepath.trim() === '' || newfilepath.trim() === '') {
                    return false;
                }
                
                // Check if old path exists in the map
                const fileLeaf = this.filePathToLeafMap.get(oldfilepath);
                if (!fileLeaf) {
                    console.error(`Old file path not found in map: ${oldfilepath}`);
                    return false;
                }
                
                // Check if new path already exists (avoid overwriting)
                if (this.filePathToLeafMap.has(newfilepath)) {
                    console.error(`New file path already exists in map: ${newfilepath}`);
                    return false;
                }
                
                // Remove the old key and add the new key with the same FileLeaf reference
                this.filePathToLeafMap.delete(oldfilepath);
                this.filePathToLeafMap.set(newfilepath, fileLeaf);
                
                return true;

            },  
        };
        return rootNode;
    }



    /**
     * Returns a specific node from the entire tree by its tag path
     * 
     * Uses the full tag path to directly navigate to the node without searching.
     * Splits the path and traverses the tree hierarchy step by step.
     * 
     * @param tagpath - The full path of the tag (e.g., "subject/math")
     * @returns ITagNode | null - The found TagNode object, or null if not found
     * 
     * Used when: Node lookup, node-based operations, tree navigation
     */
    public getNode(tagpath: string): ITagNode | null {
        if (!tagpath || tagpath.trim() === '') {{
            let rootNode = this.rootTagNode
            return rootNode;
        }}
        
        // Split the tag path into segments
        const tagSegments = tagpath.split('/').filter(segment => segment.length > 0);
        
        if (tagSegments.length === 0) {
            let rootNode = this.rootTagNode
            return rootNode;
        }
        
        // Find the root tag
        let currentNode: ITagNode | null = null;
        for (const rootTag of this.rootTags) {
            if (rootTag.getName() === tagSegments[0]) {
                currentNode = rootTag;
                break;
            }
        }
        
        if (!currentNode) {
            return null;
        }
        
        // If only one segment, return the root tag
        if (tagSegments.length === 1) {
            return currentNode;
        }
        
        // Navigate through the path
        for (let i = 1; i < tagSegments.length; i++) {
            currentNode = currentNode.getChild(tagSegments[i]);
            if (!currentNode) {
                return null;
            }
        }
        
        return currentNode;
    }
    
    /**
     * Returns a specific file from a specific tag node by filename, filepath, and tag path
     * 
     * Navigates directly to the specified tag node and retrieves the file from it.
     * If tagpath is empty, searches in untagged files.
     * 
     * @param filename - The name of the file (this is the filename without the extension)
     * @param filepath - The path of the file relative to vault root
     * @param tagpath - The path of the tag node parent (e.g., "subject/math"), or empty for untagged
     * @returns IFileLeaf | null - The found FileLeaf object, or null if not found
     * 
     * Used when: File lookup, file-based operations, file queries
     */
    public getFile(filename: string, filepath: string, tagpath: string): IFileLeaf | null {
        // If tagpath is empty follow the same method as before. this time getNode will return the rootTagNode
        
    
        // Navigate to the specific tag node
        const tagNode = this.getNode(tagpath);
        if (!tagNode) {
            return null;
        }
        
        // Get the file from that specific node
        return tagNode.getFile(filepath);
    }
    
    // ==================== TREE COMPUTATION & MANIPULATION ====================
    
    /**
     * Recomputes the entire tree structure from the vault
     * 
     * Clears all existing tree data and rebuilds it by:
     * 1. Scanning all files in the vault (respecting excludedFolders)
     * 2. Reading tags from each file
     * 3. Creating TagNode hierarchy based on nested tags
     * 4. Attaching FileLeaf objects to appropriate TagNodes
     * 5. Collecting untagged files
     * 
     * @returns void
     * 
     * Used when: Initial tree creation, tree refresh, bulk changes
     */
    public async recomputeTree(currentSettings:TagFolderPluginSettings): Promise<void> {
        // Clear existing tree
        this.rootTags.clear();
        this.untaggedFiles.clear();
        
        // Get all files from vault
        const vaultRoot = this.app.vault.getRoot();
        if (!vaultRoot || !(vaultRoot instanceof TFolder)) {
            console.error('Cannot access vault root');
            return;
        }
        

        this.excludedFolders= new Set(currentSettings.folderPathsToSkip.split("\n").filter(line => line.length > 0));

        // Build file path dictionary BEFORE tree construction
        this.filePathToLeafMap = this.buildFilePathDictionary();
        // Recursively process all files
        await this.processVaultFolder(vaultRoot);

        // After computing tree from files, populate empty tag folders from metadata
        this.populateEmptyTagFoldersFromMetadata();
        
        // Increment version counter and invalidate cache after tree recomputation
        this.treeVersion++;
        this.cachedSerializedTree.asc = null;
        this.cachedSerializedTree.desc = null;

        // console.log("test map")
        // console.log(this.filePathToLeafMap)
    }
    
    /**
     * Deletes a specific child node from the tree
     * 
     * Uses the full tag path to directly navigate to the node's parent and remove it.
     * This operation removes the node and all its children.
     * 
     * @param tagpath - The full path of the tag to delete (e.g., "subject/math")
     * @returns boolean | null - true if deleted, false if deletion failed, null if not found
     * 
     * Used when: Tag removal, tree cleanup, node deletion
     */


    // 🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴🔴
    // remember that this is a very dangerous function.
    // the issue is that if you delete a node in the middle of a tree, you loose all references to its children
    // thus firstly only the orchestrator should have access to this this function. no one else should use this. 
    // secondly, the method for the orchestrator to use this function is to go to lowest leaf of the tree and then delete from there. dont delete from the middle. 
    // im guessing that if you do that, probably the garbage collection will handle itself, negating my worries, but still. ill figure it out when i get there. 
    
    public delChildNode(tagpath: string): boolean | null {
        if (!tagpath || tagpath.trim() === '') {
            return null;
        }
        
        // Split the tag path into segments
        const tagSegments = tagpath.split('/').filter(segment => segment.length > 0);
        
        if (tagSegments.length === 0) {
            return null;
        }
        
        // If only one segment, delete from root tags
        if (tagSegments.length === 1) {
            for (const rootTag of this.rootTags) {
                if (rootTag.getName() === tagSegments[0]) {
                    this.rootTags.delete(rootTag);
                    return true;
                }
            }
            return null; // Not found
        }
        
        // Navigate to the parent node
        let parentNode: ITagNode | null = null;
        for (const rootTag of this.rootTags) {
            if (rootTag.getName() === tagSegments[0]) {
                parentNode = rootTag;
                break;
            }
        }
        
        if (!parentNode) {
            return null; // Root not found
        }
        
        // Navigate to the parent of the target node
        for (let i = 1; i < tagSegments.length - 1; i++) {
            parentNode = parentNode.getChild(tagSegments[i]);
            if (!parentNode) {
                return null; // Path doesn't exist
            }
        }
        
        // Remove the child from its parent
        const childName = tagSegments[tagSegments.length - 1];
        return parentNode.removeChildNode(childName);
    }
    
    /**
     * Deletes a specific file from a specific tag node
     * 
     * Navigates directly to the specified tag node and removes the file from it.
     * If tagpath is empty, removes from untagged files.
     * 
     * @param filename - The name of the file
     * @param filepath - The path of the file relative to vault root
     * @param tagpath - The path of the tag node parent (e.g., "subject/math"), or empty for untagged
     * @returns boolean | null - true if deleted, false if deletion failed, null if not found
     * 
     * Used when: File removal, file deletion handling, tree maintenance
     */
    public delChildFile(filename: string, filepath: string, tagpath: string): boolean | null {
        // If tagpath is empty follow the same method as before. this time getNode will return the rootTagNode
    
        // Navigate to the specific tag node
        const tagNode = this.getNode(tagpath);
        if (!tagNode) {
            return null; // Tag node not found
        }
        
        // Remove the file from that specific node
        
        return tagNode.removeFile(filepath);
    }
    
    // ==================== PRIVATE HELPER METHODS ====================
    
    /**
     * Builds a dictionary mapping file paths to FileLeaf objects for all files in the vault.
     * This function runs before tree construction to create a comprehensive lookup table.
     * 
     * The dictionary enables O(1) access to any FileLeaf by its path, which is useful for:
     * - Fast file lookups during tree operations
     * - Preventing duplicate FileLeaf creation
     * - Maintaining consistent FileLeaf references across the tree
     * 
     * @returns Map<string, IFileLeaf> - Dictionary with file paths as keys and FileLeaf objects as values
     * 
     * Implementation notes:
     * - Recursively scans the entire vault
     * - Respects excluded folders (skips processing them)
     * - Creates exactly one FileLeaf per file in the vault
     * - If vault has n files, the returned map will have n entries
     */
    private buildFilePathDictionary(): Map<string, IFileLeaf> {
        const fileMap = new Map<string, IFileLeaf>();
        
        // Get vault root
        const vaultRoot = this.app.vault.getRoot();
        if (!vaultRoot || !(vaultRoot instanceof TFolder)) {
            console.error('Cannot access vault root for building file path dictionary');
            return fileMap;
        }
        
        // Recursive helper to scan folders and build the map
        const scanFolder = (folder: TFolder): void => {
            // Check if this folder should be excluded
            if (this.isExcludedFolder(folder.path)) {
                return;
            }
            
            // Process all children
            for (const child of folder.children) {
                if (child instanceof TFolder) {
                    // Recursively process subfolders
                    scanFolder(child);
                } else if (child instanceof TFile) {
                    // Create FileLeaf and add to dictionary
                    try {
                        const fileLeaf = new FileLeaf(child.basename, child.path, this.app);
                        fileMap.set(child.path, fileLeaf);
                    } catch (error) {
                        console.error(`Error creating FileLeaf for ${child.path}:`, error);
                    }
                }
            }
        };
        
        // Start recursive scan from vault root
        scanFolder(vaultRoot);
        
        return fileMap;
    }
    
    /**
     * Recursively processes a vault folder and extracts files and tags
     * 
     * @param folder - The folder to process
     */
    private async processVaultFolder(folder: TFolder): Promise<void> {
        // Check if this folder should be excluded
        if (this.isExcludedFolder(folder.path)) {
            return;
        }
        
        // Process all children
        for (const child of folder.children) {
            if (child instanceof TFolder) {
                // Recursively process subfolders
                await this.processVaultFolder(child);
            } else if (child instanceof TFile) {
                // Process file
                await this.processFile(child);
            }
        }
    }
    
    /**
     * Processes a single file and adds it to the tree
     * 
     * @param file - The file to process
     */
    private async processFile(file: TFile): Promise<void> {
        try {
            // Create FileLeaf for this file
            // const fileLeaf = new FileLeaf(file.basename, file.path, this.app);
            
            // Retriveing the file from the file map
            const fileLeaf = this.fileLeafRetriever(file.path.trim())

            if(!fileLeaf?.getPath?.().endsWith(".md")){
                return
            }


            if (fileLeaf){
                // Get all tags from the file
                const tagPaths = await fileLeaf.retrieveAllTagPaths();
                
                if (tagPaths.length === 0) {
                    // No tags, add to untagged files
                    this.untaggedFiles.add(fileLeaf);
                } else {
                    // Process each tag path
                    for (const tagPath of tagPaths) {
                        this.addFileToTagPath(fileLeaf, tagPath);
                    }
                }
            }else{
                console.error('File map did not contain the required FileLeaf');

                throw new Error("File map did not contain the required FileLeaf");
                }
        } catch (error) {
            console.error(`Error processing file ${file.path}:`, error);
        }
    }
    
    /**
     * Adds a file to a specific tag path, creating nodes as needed
     * 
     * @param fileLeaf - The file to add
     * @param tagPath - The nested tag path (e.g., "subject/math")
     */
    private addFileToTagPath(fileLeaf: IFileLeaf, tagPath: string): void {
        // Split the tag path into segments
        const tagSegments = tagPath.split('/').filter(segment => segment.length > 0);
        
        if (tagSegments.length === 0) {
            return;
        }
        
        // Navigate or create the tag node hierarchy
        let currentNode: ITagNode | null = null;
        let currentPath = '';
        
        for (let i = 0; i < tagSegments.length; i++) {
            const segmentName = tagSegments[i];
            currentPath = i === 0 ? segmentName : `${currentPath}/${segmentName}`;
            
            if (i === 0) {
                // First segment - check if it exists in root tags
                let rootTag = null;
                for (const tag of this.rootTags) {
                    if (tag.getName() === segmentName) {
                        rootTag = tag;
                        break;
                    }
                }
                
                if (!rootTag) {
                    // Create new root tag
                    rootTag = new TagNode(segmentName, currentPath, this.rootTagNode, this.app, this.filePathToLeafMap);
                    this.rootTags.add(rootTag);
                }
                
                currentNode = rootTag;
            } else {
                // Subsequent segments - check if it exists as a child
                if (!currentNode) {
                    return; // Safety check
                }
                
                let childNode: ITagNode | null = currentNode.getChild(segmentName);
                if (!childNode) {
                    // Create new child node
                    currentNode.addChildNode(segmentName);
                    childNode = currentNode.getChild(segmentName);
                }
                
                currentNode = childNode;
            }
        }
        
        // Add the file to the final node
        if (currentNode) {
            // currentNode.createNewFile(fileLeaf.getName(), fileLeaf.getPath());
            currentNode.addFileLeaftoFiles(fileLeaf)
        }
    }
    
    /**
     * Checks if a folder path should be excluded from tree computation
     * 
     * @param folderPath - The path of the folder relative to vault root
     * @returns boolean - true if folder should be excluded
     */
    isExcludedFolder(folderPath: string): boolean {
        for (const excluded of this.excludedFolders) {
            if (
                folderPath === excluded ||
                folderPath.startsWith(excluded)
            ) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Populates empty tag folders from metadata files
     * 
     * After computing the tree from files, this method iterates through all metadata files
     * in the .TagNodeMeta folder. For each metadata file, it extracts the tag path and
     * checks if the corresponding TagNode exists in the tree. If not, it creates the
     * TagNode hierarchy to preserve empty folders that once existed.
     * 
     * @returns void
     * 
     * Used when: Tree recomputation, restoring empty tag folders, tree initialization
     */
    private populateEmptyTagFoldersFromMetadata(): void {
        try {
            // Get the vault's base path
            const vaultPath = (this.app.vault.adapter as any).basePath || '';
            const metaFolderPath = path.join(vaultPath, '.TagNodeMeta');
            
            // Check if .TagNodeMeta folder exists
            if (!fs.existsSync(metaFolderPath)) {
                return; // No metadata folder, nothing to do
            }
            
            // Read all files in the metadata folder
            const metadataFiles = fs.readdirSync(metaFolderPath);
            
            // Process each metadata file
            for (const filename of metadataFiles) {
                // Skip non-.json files
                if (!filename.endsWith('.json')) {
                    continue;
                }
                
                // Extract the tag path from the filename
                const tagPath = this.extractTagPathFromFilename(filename, metaFolderPath);
                
                if (!tagPath || tagPath.trim() === '') {
                    continue; // Invalid or empty path, skip
                }
                
                // Check if this tag path already exists in the tree
                const existingNode = this.getNode(tagPath);

                // console.log(tagPath+"   "+(existingNode) )
                
                if (existingNode) {
                    // Node already exists, move on
                    continue;
                }
                
                // Node doesn't exist, create it
                this.createTagNodeHierarchy(tagPath);
            }
        } catch (error) {
            console.error('Error populating empty tag folders from metadata:', error);
        }
    }
    
    /**
     * Extracts the tag path from a metadata filename
     * 
     * Parses the metadata filename which follows the format:
     * {path_with_underscores}_{base64_encoded_path}.json
     * 
     * For example: "subject_math_c3ViamVjdC9tYXRo.json" -> "subject/math"
     * 
     * @param filename - The name of the metadata file
     * @returns string - The extracted tag path, or empty string if not found
     */
    private extractTagPathFromFilename(filename: string, metaFolderPath: string): string {
        try {
            
            
            let finMetafileName = path.join(metaFolderPath, filename)
            
        
            let fileContent = fs.readFileSync(finMetafileName, 'utf8');
            
            let metadata = JSON.parse(fileContent);

            let tagnodePath = metadata.path
            const crypto = require('crypto');

            function hashPath(path:string) {
            return crypto.createHash('sha256').update(path).digest('hex');
            }

            if(hashPath(tagnodePath) == filename){
                return tagnodePath
            }else {
                return ''
            }



        } catch (error) {
            console.error(`Error extracting tag path from filename ${filename}:`, error);
            return '';
        }
    }
    
    /**
     * Creates a TagNode hierarchy for a given tag path
     * 
     * Creates all necessary TagNode objects along a tag path if they don't exist.
     * This is similar to addFileToTagPath but without adding a file at the end.
     * 
     * @param tagPath - The nested tag path (e.g., "subject/math")
     * @returns void
     */
    private createTagNodeHierarchy(tagPath: string): void {
        // Split the tag path into segments
        const tagSegments = tagPath.split('/').filter(segment => segment.length > 0);
        
        if (tagSegments.length === 0) {
            return;
        }
        
        // Navigate or create the tag node hierarchy
        let currentNode: ITagNode | null = null;
        let currentPath = '';
        
        for (let i = 0; i < tagSegments.length; i++) {
            const segmentName = tagSegments[i];
            currentPath = i === 0 ? segmentName : `${currentPath}/${segmentName}`;
            
            if (i === 0) {
                // First segment - check if it exists in root tags
                let rootTag: ITagNode | null = null;
                for (const tag of this.rootTags) {
                    if (tag.getName() === segmentName) {
                        rootTag = tag;
                        break;
                    }
                }



                
                if (!rootTag) {
                    // Create new root tag
                    rootTag = new TagNode(segmentName, currentPath, this.rootTagNode, this.app, this.filePathToLeafMap);
                    this.rootTags.add(rootTag);
                }
                
                currentNode = rootTag;
            } else {
                // Subsequent segments - check if it exists as a child
                if (!currentNode) {
                    return; // Safety check
                }
                
                let childNode: ITagNode | null = currentNode.getChild(segmentName);
                if (!childNode) {
                    // Create new child node
                    currentNode.addChildNode(segmentName);
                    childNode = currentNode.getChild(segmentName);
                }
                
                currentNode = childNode;
            }
        }
    }
    
    /**
     * Serializes the tree structure to a JSON-compatible format
     * This is a basic implementation; sorting/formatting can be enhanced later.
     * 
     * @returns unknown - JSON representation of the tree
     */
    private serializeTree(sortFlag: boolean = true): SerializedTreeData {
        const emptyTagNodes: any[] = [];

        const allTagNodeFoldersSet: Set<any> = new Set();
        const allFiles: Map<string, any> = new Map();

        const serializeNode = (node: ITagNode): any => {
            const serializedChildren = Object.values(node.getChildren()).map(serializeNode);
            
            // Calculate total file count: direct files + all files in descendant tags
            const directFileCount = node.getFiles().size;
            const childFileCount = serializedChildren.reduce((sum, child) => sum + child.totalFileCount, 0);
            const totalFileCount = directFileCount + childFileCount;

            const serializedNode = {
                name: node.getName(),
                path: node.getPath(),
                children: serializedChildren.sort((a, b) => sortFlag ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)),
                parentPath: node.getParent()?.getPath() ?? "",
                files: Array.from(node.getFiles()).map(file => {
                    const f = {
                        name: file.getName(),
                        path: file.getPath()
                    };
                    allFiles.set(f.path, f);
                    return f

                }).sort((a, b) => sortFlag ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)),
                totalFileCount: totalFileCount,
            };

            if (directFileCount === 0 && serializedChildren.length === 0) {
                emptyTagNodes.push(serializedNode);
            }

            allTagNodeFoldersSet.add(serializedNode)

            return serializedNode;
        };
        return {
            rootTags: Array.from(this.rootTags).map(serializeNode).sort((a, b) => sortFlag ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)),
            untaggedFiles: Array.from(this.untaggedFiles).map(file => {
                const f = {
                    name: file.getName(),
                    path: file.getPath(),
                    tagpath: ""
                };
                allFiles.set(f.path, f);
                return f
                
            }).sort((a, b) => sortFlag ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)),
            emptyTagNodes: emptyTagNodes.sort((a, b) => sortFlag ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)),
            allTagNodeFolders: Array.from(allTagNodeFoldersSet).sort((a, b) => sortFlag ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)),
            allFiles: Array.from(allFiles.values()).sort((a, b) => sortFlag ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)),
        };
    }
 
}

