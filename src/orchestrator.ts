import { App, TFile } from "obsidian";
import { TreeRoot } from "./TreeRoot";
import { FileLeaf } from "./FileLeaf";
import * as fileEditor from "./fileEditor";
import type { ITagNode, IFileLeaf } from "./interfaces";

import TagFolderPlugin from "./main";


/**
 * Orchestrator class - coordinates all write operations between file system and tree structure
 * 
 * This class maintains strict control flow:
 * User → Svelte Frontend → controllerInterface.ts → orchestrator.ts → fileEditor.ts/TreeRoot.ts
 * 
 * Each operation follows three phases:
 * 1. Physical File Edits - actual file system operations
 * 2. Virtual Edits - in-memory tree modifications
 * 3. Frontend Refresh - UI updates via broadcastTreeUpdate
 */

export class Orchestrator {
    private app: App;
    private treeRoot: TreeRoot;
    private plugin: TagFolderPlugin;

    constructor(app: App, treeRoot: TreeRoot, plugin: TagFolderPlugin) {
        this.app = app;
        this.treeRoot = treeRoot;
        this.plugin = plugin;
    }

    /**
     * Create a new file inside a tag folder
     * 
     * @param folderTagPath - The tag path where the file should be created (e.g., "subject/math")
     * @param fileName - Optional file name (defaults to "Untitled")
     * @returns Object with success status, file if created, and error if failed
     */
    async createFileInTagFolder(
        folderTagPath: string,
        fileName: string = "Untitled",
        owner: boolean = true

    ): Promise<{ success: boolean; file?: TFile; error?: any }> {
        try {
            let createdFile: TFile | null = null;

            // ---(Physical File Edits)---
                // Create new file in physical root folder
                const createResult = await fileEditor.createNewFile(this.app, "", fileName);
                if (!createResult.success || !createResult.file) {
                    return { success: false, error: "Failed to create file" };
                }
                createdFile = createResult.file;

                // Ensure frontmatter exists
                const frontmatterResult = await fileEditor.createTagsFrontMatter(this.app, createdFile);
                if (!frontmatterResult.success) {
                    return { success: false, error: "Failed to create frontmatter" };
                }

                // Add tag to file metadata
                const tagToAdd = folderTagPath;
                const addTagSuccess = await fileEditor.addTagToFileYaml(this.app, createdFile, tagToAdd);
                if (!addTagSuccess) {
                    return { success: false, error: "Failed to add tag to file" };
                }
            // ---(Physical File Edits End)---

            // ---(Virtual Edits)---
                // Create corresponding FileLeaf object
                const fileLeaf = new FileLeaf(
                    createdFile.name,
                    createdFile.path,
                    this.app
                );

                // Add FileLeaf to the fileLeafMap
                const filePathMap = this.treeRoot.getFilePathMap();
                filePathMap.set(createdFile.path, fileLeaf);

                // Add the FileLeaf to the TreeRoot object
                // Get the target TagNode by tag path
                const targetNode = this.treeRoot.getNode(folderTagPath);
                if (!targetNode) {
                    return { success: false, error: `Tag node not found for path: ${folderTagPath}` };
                }

                // Add file to the TagNode's files list
                const addFileSuccess = targetNode.createNewFile(createdFile.name, createdFile.path);
                if (!addFileSuccess) {
                    return { success: false, error: "Failed to add file to tag node" };
                }

                // Invalidate cache
                this.treeRoot.invalidateCache();
            // ---(Virtual Edits End)---

            // ---(Frontend Refresh)---
                this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true, file: createdFile };
        } catch (error) {
            console.error("Error in createFileInTagFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Create a new folder (tag node) inside a parent folder
     * 
     * @param folderTagPath - The parent tag path where the folder should be created (e.g., "subject/math")
     * @param folderName - The name of the new folder to create
     * @returns Object with success status, created node path, and error if failed
     */
    async createFolderInFolder(
        folderTagPath: string,
        folderName: string = "Untitled",
        owner: boolean = true
    ): Promise<{ success: boolean; nodePath?: string; error?: any }> {
        try {
            // ---(Physical File Edits)---
                // No physical file edits needed for virtual folder creation
            // ---(Physical File Edits End)---

            // ---(Virtual Edits)---
                // Get the parent TagNode
                const parentNode = this.treeRoot.getNode(folderTagPath);
                if (!parentNode) {
                    return { success: false, error: `Parent tag node not found for path: ${folderTagPath}` };
                }

                // Check if tagfolder with same name exists and find unique name
                let finalFolderName = folderName;
                let counter = 1;
                const children = parentNode.getChildren();
                
                while (children[finalFolderName]) {
                    finalFolderName = `${folderName} ${counter}`;
                    counter++;
                }

                // Create new TagNode object
                // The addChildNode method will:
                // - Set the folder name as name
                // - Calculate and set the full path (folderTagPath/finalFolderName)
                // - Set the parent reference to parentNode
                // - Add itself to parent's children
                const addSuccess = parentNode.addChildNode(finalFolderName);
                if (!addSuccess) {
                    return { success: false, error: "Failed to add child node" };
                }

                // Calculate the new node's full path
                const newNodePath = folderTagPath 
                    ? `${folderTagPath}/${finalFolderName}` 
                    : finalFolderName;

                // Invalidate cache
                this.treeRoot.invalidateCache();
            // ---(Virtual Edits End)---

            // ---(Frontend Refresh)---
                this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true, nodePath: newNodePath };
        } catch (error) {
            console.error("Error in createFolderInFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Rename a specific file
     * 
     * @param folderTagPath - The tag path where the file exists (not used currently but kept for future use)
     * @param oldFileName - The old file name (not used currently but kept for reference)
     * @param newFileName - The new file name (without extension)
     * @param filePath - The current file path used to retrieve the FileLeaf
     * @returns Object with success status, new file path, and error if failed
     */
    async renameFile(
        folderTagPath: string,
        oldFileName: string,
        newFileName: string,
        filePath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; newPath?: string; error?: any }> {
        try {
            // ---(Physical File Edits)---
                // Retrieve the FileLeaf object using the fileLeafMap and filePath
                const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
                if (!fileLeaf) {
                    return { success: false, error: `FileLeaf not found for path: ${filePath}` };
                }

                // Use the FileLeaf to extract the TFile
                // const tFile = this.app.vault.getAbstractFileByPath(filePath);
                const tFile = fileLeaf.getTFile()

                if (!(tFile instanceof TFile)) {
                    return { success: false, error: `TFile not found at path: ${filePath}` };
                }

                // Rename the physical file
                const renameResult = await fileEditor.renameFile(this.app, tFile, newFileName);
                if (!renameResult.success) {
                    return { success: false, error: "Failed to rename physical file" };
                }

                // Get the new path after rename (file object is updated in place)
                const newPath = tFile.path;
                const newName = tFile.name;
            // ---(Physical File Edits End)---

            // ---(Virtual Edits)---
                // Update FileLeaf object name and path
                fileLeaf.editFileName(newName);
                fileLeaf.editPath(newPath);

                // Update fileLeafMap - remove old key and add new key
                const filePathMap = this.treeRoot.getFilePathMap();
                filePathMap.delete(filePath);
                filePathMap.set(newPath, fileLeaf);

                // Invalidate cache
                this.treeRoot.invalidateCache();
            // ---(Virtual Edits End)---

            // ---(Frontend Refresh)---
                this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true, newPath };
        } catch (error) {
            console.error("Error in renameFile:", error);
            return { success: false, error };
        }
    }

    /**
     * Rename a specific folder (tag node)
     * 
     * @param folderTagPath - The tag path of the folder to rename (e.g., "subject/math")
     * @param newTagName - The new name for the tag/folder
     * @returns Object with success status, new path, and error if failed
     */
    async renameFolder(
        folderTagPath: string,
        newTagName: string,
        owner: boolean = true
    ): Promise<{ success: boolean; newPath?: string; error?: any }> {
        try {
            // Retrieve tagnode for that folder
            const targetNode = this.treeRoot.getNode(folderTagPath);
            if (!targetNode) {
                return { success: false, error: `Tag node not found for path: ${folderTagPath}` };
            }

            // Retrieve parent tagnode
            const parentNode = targetNode.getParent();
            if (!parentNode) {
                return { success: false, error: "Cannot rename root node" };
            }

            // Check if parent tagnode has a child with the name as newtagname
            const parentChildren = parentNode.getChildren();
            if (parentChildren[newTagName]) {
                return { success: false, error: `A folder with name "${newTagName}" already exists in parent` };
            }

            // Calculate the new path
            const parentPath = parentNode.getPath();
            const newFolderTagPath = parentPath ? `${parentPath}/${newTagName}` : newTagName;

            // ---(Physical File Edits)---
                // BFS traversal - Level 0: Process all files at current level
                const nodesToProcess: ITagNode[] = [targetNode];
                let currentLevelNodes: ITagNode[] = [targetNode];
                
                // Process files at each level
                while (currentLevelNodes.length > 0) {
                    const nextLevelNodes: ITagNode[] = [];
                    
                    for (const node of currentLevelNodes) {
                        const files = node.getFiles();
                        const oldTagPath = node.getPath();
                        
                        // Calculate new tag path for this level
                        const pathDiff = oldTagPath.substring(folderTagPath.length);
                        const newTagPath = newFolderTagPath + pathDiff;
                        
                        // Update each file at this level
                        for (const fileLeaf of files) {
                            const tFile = fileLeaf.getTFile();
                            
                            // Remove old tag and add new tag
                            const removeSuccess = await fileEditor.removeTagFromFileYaml(
                                this.app,
                                tFile,
                                oldTagPath
                            );
                            if (!removeSuccess) {
                                return { success: false, error: `Failed to remove old tag from file: ${fileLeaf.getPath()}` };
                            }
                            
                            const addSuccess = await fileEditor.addTagToFileYaml(
                                this.app,
                                tFile,
                                newTagPath
                            );
                            if (!addSuccess) {
                                return { success: false, error: `Failed to add new tag to file: ${fileLeaf.getPath()}` };
                            }
                        }
                        
                        // Collect children for next level
                        const children = Object.values(node.getChildren());
                        nextLevelNodes.push(...children);
                    }
                    
                    currentLevelNodes = nextLevelNodes;
                }

                // BFS traversal - Update metadata files for all tagnodes
                currentLevelNodes = [targetNode];
                while (currentLevelNodes.length > 0) {
                    const nextLevelNodes: ITagNode[] = [];
                    
                    for (const node of currentLevelNodes) {
                        const oldTagPath = node.getPath();
                        const pathDiff = oldTagPath.substring(folderTagPath.length);
                        const newTagPath = newFolderTagPath + pathDiff;
                        
                        // Rename physical metadata file
                        const renameSuccess = fileEditor.metadataRenameFile(
                            this.app,
                            oldTagPath,
                            newTagPath
                        );
                        if (!renameSuccess) {
                            return { success: false, error: `Failed to rename metadata file for: ${oldTagPath}` };
                        }
                        
                        // Update metadata file properties (name and path)
                        const pathSegments = newTagPath.split('/');
                        const newName = pathSegments[pathSegments.length - 1];
                        
                        const updateSuccess = fileEditor.metadataReplaceExistingProperty(
                            this.app,
                            newTagPath,
                            {
                                name: newName,
                                path: newTagPath
                            }
                        );
                        if (!updateSuccess) {
                            return { success: false, error: `Failed to update metadata properties for: ${newTagPath}` };
                        }
                        
                        // Collect children for next level
                        const children = Object.values(node.getChildren());
                        nextLevelNodes.push(...children);
                    }
                    
                    currentLevelNodes = nextLevelNodes;
                }
            // ---(Physical File Edits End)---

            // ---(Virtual Edits)---
                // BFS traversal - Update tagnode objects
                currentLevelNodes = [targetNode];
                while (currentLevelNodes.length > 0) {
                    const nextLevelNodes: ITagNode[] = [];
                    
                    for (const node of currentLevelNodes) {
                        const oldTagPath = node.getPath();
                        const pathDiff = oldTagPath.substring(folderTagPath.length);
                        const newTagPath = newFolderTagPath + pathDiff;
                        
                        // Update tagnode path (which also updates name)
                        const editSuccess = node.editPath(newTagPath);
                        if (!editSuccess) {
                            return { success: false, error: `Failed to update virtual path for: ${oldTagPath}` };
                        }
                        
                        // Collect children for next level
                        const children = Object.values(node.getChildren());
                        nextLevelNodes.push(...children);
                    }
                    
                    currentLevelNodes = nextLevelNodes;
                }

                // Update parent's children dictionary - remove old key and add new key
                delete parentChildren[targetNode.getName()];
                parentChildren[newTagName] = targetNode;

                // Invalidate cache
                this.treeRoot.invalidateCache();
            // ---(Virtual Edits End)---

            // ---(Frontend Refresh)---
                this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true, newPath: newFolderTagPath };
        } catch (error) {
            console.error("Error in renameFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Remove a file from a folder (remove a tag from a file)
     * 
     * @param folderTagPath - The tag path of the folder (e.g., "subject/math")
     * @param fileName - The file name (not used currently but kept for reference)
     * @param filePath - The file path used to retrieve the FileLeaf
     * @returns Object with success status and error if failed
     */
    async removeFileFromFolder(
        folderTagPath: string,
        fileName: string,
        filePath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf object from fileleaf map using filepath
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract tagnode object from tree using foldertagpath
            const tagNode = this.treeRoot.getNode(folderTagPath);
            if (!tagNode) {
                return { success: false, error: `Tag node not found for path: ${folderTagPath}` };
            }

            // ---(Physical File Edits)---
                // Extract tfile from fileleaf object
                const tFile = fileLeaf.getTFile();
                if (!(tFile instanceof TFile)) {
                    return { success: false, error: `TFile not found at path: ${filePath}` };
                }

                // Remove tag from that file (physical)
                const removeSuccess = await fileEditor.removeTagFromFileYaml(
                    this.app,
                    tFile,
                    folderTagPath
                );
                if (!removeSuccess) {
                    return { success: false, error: `Failed to remove tag from file: ${filePath}` };
                }
            // ---(Physical File Edits End)---

            // ---(Virtual Edits)---
                // Delete fileleaf object from tagnode
                // Remove file from tag node of foldertagpath's files list
                const deleteSuccess = tagNode.removeFile(filePath);
                if (!deleteSuccess) {
                    return { success: false, error: `Failed to remove file from tag node: ${folderTagPath}` };
                }

                // Invalidate cache
                this.treeRoot.invalidateCache();
            // ---(Virtual Edits End)---

            // ---(Frontend Refresh)---
                this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true };
        } catch (error) {
            console.error("Error in removeFileFromFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Remove a folder from its parent folder (delete a tag branch)
     * 
     * @param childFolderPath - The tag path of the child folder to remove (e.g., "subject/math")
     * @returns Object with success status and error if failed
     */
    async removeFolderFromFolder(
        childFolderPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Calculate parentfoldertagpath from childfolderpath
            const pathSegments = childFolderPath.split('/').filter(s => s.length > 0);
            if (pathSegments.length === 0) {
                return { success: false, error: "Cannot remove root node" };
            }
            
            const parentFolderTagPath = pathSegments.length === 1 
                ? '' 
                : pathSegments.slice(0, -1).join('/');

            // Extract childtagnode object using childfolderpath
            const childTagNode = this.treeRoot.getNode(childFolderPath);
            if (!childTagNode) {
                return { success: false, error: `Child tag node not found for path: ${childFolderPath}` };
            }

            // Extract parenttagnode using parentfoldertagpath
            const parentTagNode = this.treeRoot.getNode(parentFolderTagPath);
            if (!parentTagNode) {
                return { success: false, error: `Parent tag node not found for path: ${parentFolderTagPath}` };
            }


            // ---(Physical File Edits)---
                // BFS traversal - Remove tags from all files at each level
                let currentLevelNodes: ITagNode[] = [childTagNode];
                
                while (currentLevelNodes.length > 0) {
                    const nextLevelNodes: ITagNode[] = [];
                    
                    for (const node of currentLevelNodes) {
                        const files = node.getFiles();
                        const tagPath = node.getPath();
                        
                        // Remove tag from each file at this level
                        for (const fileLeaf of files) {
                            const tFile = fileLeaf.getTFile();
                            
                            const removeSuccess = await fileEditor.removeTagFromFileYaml(
                                this.app,
                                tFile,
                                tagPath
                            );
                            // Continue even if removal fails (tag might not exist)
                            if (!removeSuccess) {
                                console.warn(`Failed to remove tag ${tagPath} from file: ${fileLeaf.getPath()}`);
                            }
                        }
                        
                        // Collect children for next level
                        const children = Object.values(node.getChildren());
                        nextLevelNodes.push(...children);
                    }
                    
                    currentLevelNodes = nextLevelNodes;
                }

                // BFS traversal - Delete metadata files for all tagnodes
                currentLevelNodes = [childTagNode];
                
                while (currentLevelNodes.length > 0) {
                    const nextLevelNodes: ITagNode[] = [];
                    
                    for (const node of currentLevelNodes) {
                        // Delete metadata file for this node
                        const deleteSuccess = node.deleteMeta();
                        // Continue even if deletion fails (metadata might not exist)
                        if (!deleteSuccess) {
                            console.warn(`Failed to delete metadata for: ${node.getPath()}`);
                        }
                        
                        // Collect children for next level
                        const children = Object.values(node.getChildren());
                        nextLevelNodes.push(...children);
                    }
                    
                    currentLevelNodes = nextLevelNodes;
                }
            // ---(Physical File Edits End)---

            // ---(Virtual Edits)---


                // Delete childtagnode reference from parenttagnode's children property
                const parentChildren = parentTagNode.getChildren();
                const childName = childTagNode.getName();
                delete parentChildren[childName];

                // Note: We don't need to explicitly delete the parent reference from child
                // as the child node will be garbage collected once all references are removed

                // Invalidate cache
                this.treeRoot.invalidateCache();
            // ---(Virtual Edits End)---

            // ---(Frontend Refresh)---
                this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true };
        } catch (error) {
            console.error("Error in removeFolderFromFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Hard delete a file from existence (move to trash)
     * 
     * @param folderTagPath - The tag path where the file exists (not used but kept for reference)
     * @param fileName - The file name (not used but kept for reference)
     * @param filePath - The file path used to retrieve the FileLeaf
     * @returns Object with success status and error if failed
     */
    async hardDeleteFile(
        folderTagPath: string,
        fileName: string,
        filePath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Get this fileleaf object from fileleaf map using filepath
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract all tagnode paths where the fileleaf exists
            const tagNodePaths = this.treeRoot.getAllInstancesOfFile(
                fileLeaf.getName(),
                filePath
            );

            // ---(Physical File Edits)---
                // Extract tfile using fileleaf
                const tFile = fileLeaf.getTFile();
                if (!(tFile instanceof TFile)) {
                    return { success: false, error: `TFile not found at path: ${filePath}` };
                }

                // Move physical file to trash
                await this.app.vault.trash(tFile, true);
            // ---(Physical File Edits End)---

            // ---(Virtual Edits)---
                // Remove the fileleaf object key value pair from the file leaf map
                const filePathMap = this.treeRoot.getFilePathMap();
                filePathMap.delete(filePath);

                // For each tagnode path where fileleaf exists
                for (const tagNodePath of tagNodePaths) {
                    // Extract tagnode object
                    const tagNode = this.treeRoot.getNode(tagNodePath);
                    if (tagNode) {
                        // Remove fileleaf object from tagnode's files property
                        tagNode.removeFile(filePath);
                    }
                }

                // Invalidate cache
                this.treeRoot.invalidateCache();
            // ---(Virtual Edits End)---

            // ---(Frontend Refresh)---
                this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true };
        } catch (error) {
            console.error("Error in hardDeleteFile:", error);
            return { success: false, error };
        }
    }

    /**
     * Move folder from one folder to another folder
     * 
     * @param sourceFolderTagPath - The tag path of the source (current parent)
     * @param destinationFolderTagPath - The tag path of the destination (new parent)
     * @param mainFolderTagPath - The tag path of the folder to move
     * @returns Object with success status, new path, and error if failed
     */
    async moveFolderToFolder(
        sourceFolderTagPath: string,
        destinationFolderTagPath: string,
        mainFolderTagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; newPath?: string; error?: any }> {
        try {
            // Extract main-tagnode object using mainfoldertagpath
            const mainTagNode = this.treeRoot.getNode(mainFolderTagPath);
            if (!mainTagNode) {
                return { success: false, error: `Main tag node not found for path: ${mainFolderTagPath}` };
            }

            // Extract destination-tagnode object using destinationfoldertagpath
            const destinationTagNode = this.treeRoot.getNode(destinationFolderTagPath);
            if (!destinationTagNode) {
                return { success: false, error: `Destination tag node not found for path: ${destinationFolderTagPath}` };
            }

            // Extract source-tagnode object using sourcefoldertagpath
            const sourceTagNode = this.treeRoot.getNode(sourceFolderTagPath);
            if (!sourceTagNode) {
                return { success: false, error: `Source tag node not found for path: ${sourceFolderTagPath}` };
            }

            // Validate that mainfoldertagpath is not an ancestor of destinationfoldertagpath
            // Check if destination path starts with main path
            if (destinationFolderTagPath.startsWith(mainFolderTagPath + '/') || 
                destinationFolderTagPath === mainFolderTagPath) {
                return { success: false, error: "Cannot move folder into itself or its descendants" };
            }

            // Verify if destination already has a child with same name as main
            const mainName = mainTagNode.getName();
            const destinationChildren = destinationTagNode.getChildren();
            let finalMainName = mainName;
            let counter = 1;
            
            while (destinationChildren[finalMainName]) {
                finalMainName = `${mainName} ${counter}`;
                counter++;
            }

            // If name conflict, rename main node first
            if (finalMainName !== mainName) {
                const renameResult = await this.renameFolder(mainFolderTagPath, finalMainName, false);
                if (!renameResult.success) {
                    return { success: false, error: `Failed to rename folder to avoid conflict: ${renameResult.error}` };
                }
                // Update mainFolderTagPath after rename
                const parentPath = sourceTagNode.getPath();
                mainFolderTagPath = parentPath ? `${parentPath}/${finalMainName}` : finalMainName;
                
                // Re-fetch main node after rename
                const renamedMainNode = this.treeRoot.getNode(mainFolderTagPath);
                if (!renamedMainNode) {
                    return { success: false, error: "Failed to retrieve renamed main node" };
                }
            }

            // Calculate the new path for main folder
            const newMainFolderTagPath = destinationFolderTagPath 
                ? `${destinationFolderTagPath}/${finalMainName}` 
                : finalMainName;

            // ---(Physical File Edits)---
                // BFS traversal - Update all files
                let currentLevelNodes: ITagNode[] = [mainTagNode];
                
                while (currentLevelNodes.length > 0) {
                    const nextLevelNodes: ITagNode[] = [];
                    
                    for (const node of currentLevelNodes) {
                        const files = node.getFiles();
                        const oldTagPath = node.getPath();
                        
                        // Calculate new tag path for this level
                        const pathDiff = oldTagPath.substring(mainFolderTagPath.length);
                        const newTagPath = newMainFolderTagPath + pathDiff;
                        
                        // Update each file at this level
                        for (const fileLeaf of files) {
                            const tFile = fileLeaf.getTFile();
                            
                            // Remove old tag
                            const removeSuccess = await fileEditor.removeTagFromFileYaml(
                                this.app,
                                tFile,
                                oldTagPath
                            );
                            if (!removeSuccess) {
                                console.warn(`Failed to remove old tag from file: ${fileLeaf.getPath()}`);
                            }
                            
                            // Add new tag
                            const addSuccess = await fileEditor.addTagToFileYaml(
                                this.app,
                                tFile,
                                newTagPath
                            );
                            if (!addSuccess) {
                                return { success: false, error: `Failed to add new tag to file: ${fileLeaf.getPath()}` };
                            }
                        }
                        
                        // Collect children for next level
                        const children = Object.values(node.getChildren());
                        nextLevelNodes.push(...children);
                    }
                    
                    currentLevelNodes = nextLevelNodes;
                }

                // BFS traversal - Update metadata files
                currentLevelNodes = [mainTagNode];
                
                while (currentLevelNodes.length > 0) {
                    const nextLevelNodes: ITagNode[] = [];
                    
                    for (const node of currentLevelNodes) {
                        const oldTagPath = node.getPath();
                        const pathDiff = oldTagPath.substring(mainFolderTagPath.length);
                        const newTagPath = newMainFolderTagPath + pathDiff;
                        
                        // Rename physical metadata file
                        const renameSuccess = fileEditor.metadataRenameFile(
                            this.app,
                            oldTagPath,
                            newTagPath
                        );
                        if (!renameSuccess) {
                            return { success: false, error: `Failed to rename metadata file for: ${oldTagPath}` };
                        }
                        
                        // Update metadata file path property
                        const updateSuccess = fileEditor.metadataReplaceExistingProperty(
                            this.app,
                            newTagPath,
                            { path: newTagPath }
                        );
                        if (!updateSuccess) {
                            return { success: false, error: `Failed to update metadata properties for: ${newTagPath}` };
                        }
                        
                        // Collect children for next level
                        const children = Object.values(node.getChildren());
                        nextLevelNodes.push(...children);
                    }
                    
                    currentLevelNodes = nextLevelNodes;
                }
            // ---(Physical File Edits End)---

            // ---(Virtual Edits)---
                // BFS traversal - Update tagnode paths
                currentLevelNodes = [mainTagNode];
                
                while (currentLevelNodes.length > 0) {
                    const nextLevelNodes: ITagNode[] = [];
                    
                    for (const node of currentLevelNodes) {
                        const oldTagPath = node.getPath();
                        const pathDiff = oldTagPath.substring(mainFolderTagPath.length);
                        const newTagPath = newMainFolderTagPath + pathDiff;
                        
                        // Update tagnode path
                        const editSuccess = node.editPath(newTagPath);
                        if (!editSuccess) {
                            return { success: false, error: `Failed to update virtual path for: ${oldTagPath}` };
                        }
                        
                        // Collect children for next level
                        const children = Object.values(node.getChildren());
                        nextLevelNodes.push(...children);
                    }
                    
                    currentLevelNodes = nextLevelNodes;
                }

                // Update parent-child relationships
                // In main-tagnode: replace parent property with destination-tagnode
                (mainTagNode as any).parent = destinationTagNode;
                
                // In source-tagnode: remove main-tagnode from children property
                const sourceChildren = sourceTagNode.getChildren();
                delete sourceChildren[finalMainName];
                
                // In destination-tagnode: add main-tagnode to children property
                destinationChildren[finalMainName] = mainTagNode;

                // Invalidate cache
                this.treeRoot.invalidateCache();
            // ---(Virtual Edits End)---

            // ---(Frontend Refresh)---
                this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true, newPath: newMainFolderTagPath };
        } catch (error) {
            console.error("Error in moveFolderToFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Move file from one folder to another folder
     * 
     * @param sourceFolderTagPath - The tag path of the source folder
     * @param destinationFolderTagPath - The tag path of the destination folder
     * @param fileName - The file name (used for reference)
     * @param filePath - The file path used to retrieve the FileLeaf
     * @returns Object with success status and error if failed
     */
    async moveFileToFolder(
        sourceFolderTagPath: string,
        destinationFolderTagPath: string,
        fileName: string,
        filePath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf object from the file leaf map using filepath
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract sourcetagnode object from the tree using sourcefoldertagpath
            const sourceTagNode = this.treeRoot.getNode(sourceFolderTagPath);
            if (!sourceTagNode) {
                return { success: false, error: `Source tag node not found for path: ${sourceFolderTagPath}` };
            }

            // Extract destinationtagnode object from the tree using destinationfoldertagpath
            const destinationTagNode = this.treeRoot.getNode(destinationFolderTagPath);
            if (!destinationTagNode) {
                return { success: false, error: `Destination tag node not found for path: ${destinationFolderTagPath}` };
            }



            // ---(Physical File Edits)---
                const tFile = fileLeaf.getTFile();
                if (!(tFile instanceof TFile)) {
                    return { success: false, error: `TFile not found at path: ${filePath}` };
                }

                // Remove source tag from physical file (only exact match, not nested paths)
                const removeSuccess = await fileEditor.removeTagFromFileYaml(
                    this.app,
                    tFile,
                    sourceFolderTagPath
                );
                if (!removeSuccess) {
                    console.warn(`Failed to remove source tag from file: ${filePath}`);
                }

                // Add destination tag to physical file
                const addSuccess = await fileEditor.addTagToFileYaml(
                    this.app,
                    tFile,
                    destinationFolderTagPath
                );
                if (!addSuccess) {
                    return { success: false, error: `Failed to add destination tag to file: ${filePath}` };
                }
            // ---(Physical File Edits End)---

            // ---(Virtual Edits)---
                // Delete fileleaf reference from sourcetagnode
                const removeFromSourceSuccess = sourceTagNode.removeFile(filePath);
                if (!removeFromSourceSuccess) {
                    console.warn(`Failed to remove file from source tag node: ${sourceFolderTagPath}`);
                }

                // Append fileleaf reference to destinationtagnode
                const addToDestSuccess = destinationTagNode.addFileLeaftoFiles(fileLeaf);
                if (!addToDestSuccess) {
                    return { success: false, error: `Failed to add file to destination tag node: ${destinationFolderTagPath}` };
                }

                // Invalidate cache
                this.treeRoot.invalidateCache();
            // ---(Virtual Edits End)---

            // ---(Frontend Refresh)---
                this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true };
        } catch (error) {
            console.error("Error in moveFileToFolder:", error);
            return { success: false, error };
        }
    }


    /**
     * Copy file from one folder to another folder
     * 
     * @param sourceFolderTagPath - The tag path of the source folder
     * @param destinationFolderTagPath - The tag path of the destination folder
     * @param fileName - The file name (used for reference)
     * @param filePath - The file path used to retrieve the FileLeaf
     * @returns Object with success status and error if failed
     */
    async copyFileToFolder(
        sourceFolderTagPath: string,
        destinationFolderTagPath: string,
        fileName: string,
        filePath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf object from the file leaf map using filepath
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract sourcetagnode object from the tree using sourcefoldertagpath
            const sourceTagNode = this.treeRoot.getNode(sourceFolderTagPath);
            if (!sourceTagNode) {
                return { success: false, error: `Source tag node not found for path: ${sourceFolderTagPath}` };
            }

            // Extract destinationtagnode object from the tree using destinationfoldertagpath
            const destinationTagNode = this.treeRoot.getNode(destinationFolderTagPath);
            if (!destinationTagNode) {
                return { success: false, error: `Destination tag node not found for path: ${destinationFolderTagPath}` };
            }



            // ---(Physical File Edits)---
                const tFile = fileLeaf.getTFile();
                if (!(tFile instanceof TFile)) {
                    return { success: false, error: `TFile not found at path: ${filePath}` };
                }

                // Add destination tag to physical file
                const addSuccess = await fileEditor.addTagToFileYaml(
                    this.app,
                    tFile,
                    destinationFolderTagPath
                );
                if (!addSuccess) {
                    return { success: false, error: `Failed to add destination tag to file: ${filePath}` };
                }
            // ---(Physical File Edits End)---

            // ---(Virtual Edits)---
                // Append fileleaf reference to destinationtagnode
                const addToDestSuccess = destinationTagNode.addFileLeaftoFiles(fileLeaf);
                if (!addToDestSuccess) {
                    return { success: false, error: `Failed to add file to destination tag node: ${destinationFolderTagPath}` };
                }

                // Invalidate cache
                this.treeRoot.invalidateCache();
            // ---(Virtual Edits End)---

            // ---(Frontend Refresh)---
                this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true };
        } catch (error) {
            console.error("Error in copyFileToFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Edit/update folder description
     * 
     * @param folderTagPath - The tag path of the folder (e.g., "subject/math")
     * @param jsonObject - JSON object containing the description property
     * @returns Object with success status and error if failed
     */
    async updateFolderDescription(
        folderTagPath: string,
        jsonObject: Record<string, any>,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Retrieve tagfoldernode
            const tagFolderNode = this.treeRoot.getNode(folderTagPath);
            if (!tagFolderNode) {
                return { success: false, error: `Tag folder node not found for path: ${folderTagPath}` };
            }

            // Validate that only one key is in the json object and it is called description
            const keys = Object.keys(jsonObject);
            if (keys.length !== 1 || keys[0] !== 'description') {
                return { success: false, error: "JSON object must contain only one key called 'description'" };
            }

            // Call updateMeta function with jsonobject and replace
            const updateSuccess = tagFolderNode.updateMeta(jsonObject, 'replace');
            if (!updateSuccess) {
                return { success: false, error: "Failed to update folder metadata" };
            }

            // Note: No cache invalidation needed as metadata changes don't affect tree structure

            // Refresh ui using broadcastTreeUpdate
            this.plugin.broadcastTreeUpdate();

            return { success: true };
        } catch (error) {
            console.error("Error in updateFolderDescription:", error);
            return { success: false, error };
        }
    }

    /**
     * Edit/update folder legend
     * 
     * @param folderTagPath - The tag path of the folder (e.g., "subject/math")
     * @param jsonObject - JSON object containing the legend property
     * @returns Object with success status and error if failed
     */
    async updateFolderLegend(
        folderTagPath: string,
        jsonObject: Record<string, any>,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Retrieve tagfoldernode
            const tagFolderNode = this.treeRoot.getNode(folderTagPath);
            if (!tagFolderNode) {
                return { success: false, error: `Tag folder node not found for path: ${folderTagPath}` };
            }

            // Validate that only one key is in the json object and it is called legend
            const keys = Object.keys(jsonObject);
            if (keys.length !== 1 || keys[0] !== 'legend') {
                return { success: false, error: "JSON object must contain only one key called 'legend'" };
            }

            // Call updateMeta function with jsonobject and replace
            const updateSuccess = tagFolderNode.updateMeta(jsonObject, 'replace');
            if (!updateSuccess) {
                return { success: false, error: "Failed to update folder metadata" };
            }

            // Note: No cache invalidation needed as metadata changes don't affect tree structure

            // Refresh ui using broadcastTreeUpdate
            this.plugin.broadcastTreeUpdate();

            return { success: true };
        } catch (error) {
            console.error("Error in updateFolderLegend:", error);
            return { success: false, error };
        }
    }

    /**
     * Edit/update file description (metadata)
     * 
     * @param folderTagPath - The tag path of the folder (not used but kept for reference)
     * @param filePath - The file path used to retrieve the FileLeaf
     * @param jsonObject - JSON object containing metadata properties to update
     * @returns Object with success status and error if failed
     */
    async updateFileDescription(
        folderTagPath: string,
        filePath: string,
        jsonObject: Record<string, any>,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract file leaf using filepath
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Get TFile from FileLeaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // write code to verify that jsonObject has only one key named "description"
            const keys = Object.keys(jsonObject);
            if (keys.length !== 1 || keys[0] !== 'description') {
                return { success: false, error: "JSON object must contain only one key called 'description'" };
            }

            // Call replaceMetadataSection function and pass jsonobject and file to it
            const updateSuccess = await fileEditor.replaceMetadataSection(
                this.app,
                tFile,
                jsonObject
            );
            if (!updateSuccess) {
                return { success: false, error: "Failed to update file metadata" };
            }

            // Refresh ui using broadcastTreeUpdate
            this.plugin.broadcastTreeUpdate();

            return { success: true };
        } catch (error) {
            console.error("Error in updateFileDescription:", error);
            return { success: false, error };
        }
    }

    /**
     * Duplicate a folder (tag node) in the same parent folder
     * 
     * @param folderTagPath - The tag path of the folder to duplicate
     * @returns Promise with success status, new path, and error if failed
     */
    async duplicateFolder(
        folderTagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; newPath?: string; error?: any }> {
        try {
            // Extract the parentfoldertagpath from foldertagpath
            const pathSegments = folderTagPath.split('/').filter(s => s.length > 0);
            if (pathSegments.length === 0) {
                return { success: false, error: "Cannot duplicate root node" };
            }
            
            const parentFolderTagPath = pathSegments.length === 1 
                ? '' 
                : pathSegments.slice(0, -1).join('/');

            // Extract parent-tagnode from tree using parentfoldertagpath
            const parentTagNode = this.treeRoot.getNode(parentFolderTagPath);
            if (!parentTagNode) {
                return { success: false, error: `Parent tag node not found for path: ${parentFolderTagPath}` };
            }

            // Extract main-tagnode from tree using foldertagpath
            const mainTagNode = this.treeRoot.getNode(folderTagPath);
            if (!mainTagNode) {
                return { success: false, error: `Main tag node not found for path: ${folderTagPath}` };
            }

            // Verify if parent already has a child with the duplicate name and find unique name
            const mainName = mainTagNode.getName();
            const parentChildren = parentTagNode.getChildren();
            let newTagNodeName = `${mainName} 1`;
            let counter = 2;
            
            while (parentChildren[newTagNodeName]) {
                newTagNodeName = `${mainName} ${counter}`;
                counter++;
            }

            // Calculate the new path for duplicate folder
            const newFolderTagPath = parentFolderTagPath 
                ? `${parentFolderTagPath}/${newTagNodeName}` 
                : newTagNodeName;

            // ---(Physical File Edits - First Phase)---
            // BFS traversal - Add new tags to all files
            let currentLevelNodes: ITagNode[] = [mainTagNode];
            
            while (currentLevelNodes.length > 0) {
                const nextLevelNodes: ITagNode[] = [];
                
                for (const node of currentLevelNodes) {
                    const files = node.getFiles();
                    const oldTagPath = node.getPath();
                    
                    // Calculate new tag path for this level
                    const pathDiff = oldTagPath.substring(folderTagPath.length);
                    const newTagPath = newFolderTagPath + pathDiff;
                    
                    // Add new tag to each file at this level
                    for (const fileLeaf of files) {
                        const tFile = fileLeaf.getTFile();
                        
                        const addSuccess = await fileEditor.addTagToFileYaml(
                            this.app,
                            tFile,
                            newTagPath
                        );
                        if (!addSuccess) {
                            console.warn(`Failed to add new tag to file: ${fileLeaf.getPath()}`);
                        }
                    }
                    
                    // Collect children for next level
                    const children = Object.values(node.getChildren());
                    nextLevelNodes.push(...children);
                }
                
                currentLevelNodes = nextLevelNodes;
            }
            // ---(Physical File Edits End - First Phase)---

            // Construct the duplicate-tagnode using newtagnodename
            // Add it as a child of parent-tagnode
            const createSuccess = parentTagNode.addChildNode(newTagNodeName);
            if (!createSuccess) {
                return { success: false, error: "Failed to create duplicate tag node" };
            }

            const duplicateRootNode = parentTagNode.getChild(newTagNodeName);
            if (!duplicateRootNode) {
                return { success: false, error: "Failed to retrieve created duplicate node" };
            }

            // ---(Virtual Edits - First Phase)---
            // BFS traversal - Create all child tag nodes in the hierarchy
            currentLevelNodes = [mainTagNode];
            
            while (currentLevelNodes.length > 0) {
                const nextLevelNodes: ITagNode[] = [];
                
                for (const node of currentLevelNodes) {
                    if (node === mainTagNode) {
                        // Skip the root level as it's already created
                        const children = Object.values(node.getChildren());
                        nextLevelNodes.push(...children);
                        continue;
                    }
                    
                    const oldTagPath = node.getPath();
                    const pathDiff = oldTagPath.substring(folderTagPath.length);
                    const newTagPath = newFolderTagPath + pathDiff;
                    
                    // Get the parent path of the new node
                    const newPathSegments = newTagPath.split('/');
                    const parentNewPath = newPathSegments.slice(0, -1).join('/');
                    const newNodeName = newPathSegments[newPathSegments.length - 1];
                    
                    // Get the parent node in the new hierarchy
                    const parentNewNode = this.treeRoot.getNode(parentNewPath);
                    if (parentNewNode) {
                        parentNewNode.addChildNode(newNodeName);
                    }
                    
                    // Collect children for next level
                    const children = Object.values(node.getChildren());
                    nextLevelNodes.push(...children);
                }
                
                currentLevelNodes = nextLevelNodes;
            }
            // ---(Virtual Edits End - First Phase)---

            // ---(Virtual Edits - Second Phase)---
            // BFS traversal - Copy file references to new tag nodes
            currentLevelNodes = [mainTagNode];
            
            while (currentLevelNodes.length > 0) {
                const nextLevelNodes: ITagNode[] = [];
                
                for (const node of currentLevelNodes) {
                    const oldTagPath = node.getPath();
                    const pathDiff = oldTagPath.substring(folderTagPath.length);
                    const newTagPath = newFolderTagPath + pathDiff;
                    
                    // Get the corresponding new node
                    const newNode = this.treeRoot.getNode(newTagPath);
                    if (newNode) {
                        // Read files from original node and add to new node
                        const files = node.getFiles();
                        for (const fileLeaf of files) {
                            newNode.addFileLeaftoFiles(fileLeaf);
                        }
                    }
                    
                    // Collect children for next level
                    const children = Object.values(node.getChildren());
                    nextLevelNodes.push(...children);
                }
                
                currentLevelNodes = nextLevelNodes;
            }
            // ---(Virtual Edits End - Second Phase)---

            // ---(Physical File Edits - Second Phase)---
            // BFS traversal - Copy metadata files
            currentLevelNodes = [mainTagNode];
            
            while (currentLevelNodes.length > 0) {
                const nextLevelNodes: ITagNode[] = [];
                
                for (const node of currentLevelNodes) {
                    const oldTagPath = node.getPath();
                    const pathDiff = oldTagPath.substring(folderTagPath.length);
                    const newTagPath = newFolderTagPath + pathDiff;
                    
                    // Read folder metadata file properties
                    const metadata = fileEditor.metadataReadAllFrontmatter(this.app, oldTagPath);
                    
                    if (metadata) {
                        // Extract description and legend
                        const { description, legend } = metadata;
                        const propertiesToCopy: Record<string, any> = {};
                        
                        if (description !== undefined) {
                            propertiesToCopy.description = description;
                        }
                        if (legend !== undefined) {
                            propertiesToCopy.legend = legend;
                        }
                        
                        // Copy properties to new metadata file
                        if (Object.keys(propertiesToCopy).length > 0) {
                            fileEditor.metadataReplaceExistingProperty(
                                this.app,
                                newTagPath,
                                propertiesToCopy
                            );
                        }
                    }
                    
                    // Collect children for next level
                    const children = Object.values(node.getChildren());
                    nextLevelNodes.push(...children);
                }
                
                currentLevelNodes = nextLevelNodes;
            }
            // ---(Physical File Edits End - Second Phase)---

            // Invalidate cache
            this.treeRoot.invalidateCache();

            // ---(Frontend Refresh)---
            this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true, newPath: newFolderTagPath };
        } catch (error) {
            console.error("Error in duplicateFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Recreate a folder from one location to another folder
     * 
     * @param mainFolderTagPath - The tag path of the folder to recreate
     * @param destinationFolderTagPath - The tag path of the destination folder
     * @returns Promise with success status, new path, and error if failed
     */
    async recreateFolder(
        mainFolderTagPath: string,
        destinationFolderTagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; newPath?: string; error?: any }> {
        try {
            // Extract the parentfoldertagpath from mainfoldertagpath
            const pathSegments = mainFolderTagPath.split('/').filter(s => s.length > 0);
            if (pathSegments.length === 0) {
                return { success: false, error: "Cannot recreate root node" };
            }
            
            const parentFolderTagPath = pathSegments.length === 1 
                ? '' 
                : pathSegments.slice(0, -1).join('/');

            // Extract parent-tagnode from tree using parentfoldertagpath
            const parentTagNode = this.treeRoot.getNode(parentFolderTagPath);
            if (!parentTagNode) {
                return { success: false, error: `Parent tag node not found for path: ${parentFolderTagPath}` };
            }

            // Extract main-tagnode from tree using mainfoldertagpath
            const mainTagNode = this.treeRoot.getNode(mainFolderTagPath);
            if (!mainTagNode) {
                return { success: false, error: `Main tag node not found for path: ${mainFolderTagPath}` };
            }

            // Extract destination-tagnode from tree using destinationfoldertagpath
            const destinationTagNode = this.treeRoot.getNode(destinationFolderTagPath);
            if (!destinationTagNode) {
                return { success: false, error: `Destination tag node not found for path: ${destinationFolderTagPath}` };
            }

            // Validate that mainfoldertagpath is not an ancestor of destinationfoldertagpath
            if (destinationFolderTagPath.startsWith(mainFolderTagPath + '/') || 
                destinationFolderTagPath === mainFolderTagPath) {
                return { success: false, error: "Cannot recreate folder into itself or its descendants" };
            }

            // Verify if destination already has a child with the same name and find unique name
            const mainName = mainTagNode.getName();
            const destinationChildren = destinationTagNode.getChildren();
            let newTagNodeName = mainName;
            let counter = 1;
            
            while (destinationChildren[newTagNodeName]) {
                newTagNodeName = `${mainName} ${counter}`;
                counter++;
            }

            // Calculate the new path for recreated folder
            const newFolderTagPath = destinationFolderTagPath 
                ? `${destinationFolderTagPath}/${newTagNodeName}` 
                : newTagNodeName;

            // ---(Physical File Edits - First Phase)---
            // BFS traversal - Add new tags to all files
            let currentLevelNodes: ITagNode[] = [mainTagNode];
            
            while (currentLevelNodes.length > 0) {
                const nextLevelNodes: ITagNode[] = [];
                
                for (const node of currentLevelNodes) {
                    const files = node.getFiles();
                    const oldTagPath = node.getPath();
                    
                    // Calculate new tag path for this level
                    const pathDiff = oldTagPath.substring(mainFolderTagPath.length);
                    const newTagPath = newFolderTagPath + pathDiff;
                    
                    // Add new tag to each file at this level
                    for (const fileLeaf of files) {
                        const tFile = fileLeaf.getTFile();
                        
                        const addSuccess = await fileEditor.addTagToFileYaml(
                            this.app,
                            tFile,
                            newTagPath
                        );
                        if (!addSuccess) {
                            console.warn(`Failed to add new tag to file: ${fileLeaf.getPath()}`);
                        }
                    }
                    
                    // Collect children for next level
                    const children = Object.values(node.getChildren());
                    nextLevelNodes.push(...children);
                }
                
                currentLevelNodes = nextLevelNodes;
            }
            // ---(Physical File Edits End - First Phase)---

            // Construct the recreated-tagnode using newtagnodename
            // Add it as a child of destination-tagnode
            const createSuccess = destinationTagNode.addChildNode(newTagNodeName);
            if (!createSuccess) {
                return { success: false, error: "Failed to create recreated tag node" };
            }

            const recreatedRootNode = destinationTagNode.getChild(newTagNodeName);
            if (!recreatedRootNode) {
                return { success: false, error: "Failed to retrieve created recreated node" };
            }

            // ---(Virtual Edits - First Phase)---
            // BFS traversal - Create all child tag nodes in the hierarchy
            currentLevelNodes = [mainTagNode];
            
            while (currentLevelNodes.length > 0) {
                const nextLevelNodes: ITagNode[] = [];
                
                for (const node of currentLevelNodes) {
                    if (node === mainTagNode) {
                        // Skip the root level as it's already created
                        const children = Object.values(node.getChildren());
                        nextLevelNodes.push(...children);
                        continue;
                    }
                    
                    const oldTagPath = node.getPath();
                    const pathDiff = oldTagPath.substring(mainFolderTagPath.length);
                    const newTagPath = newFolderTagPath + pathDiff;
                    
                    // Get the parent path of the new node
                    const newPathSegments = newTagPath.split('/');
                    const parentNewPath = newPathSegments.slice(0, -1).join('/');
                    const newNodeName = newPathSegments[newPathSegments.length - 1];
                    
                    // Get the parent node in the new hierarchy
                    const parentNewNode = this.treeRoot.getNode(parentNewPath);
                    if (parentNewNode) {
                        parentNewNode.addChildNode(newNodeName);
                    }
                    
                    // Collect children for next level
                    const children = Object.values(node.getChildren());
                    nextLevelNodes.push(...children);
                }
                
                currentLevelNodes = nextLevelNodes;
            }
            // ---(Virtual Edits End - First Phase)---

            // ---(Virtual Edits - Second Phase)---
            // BFS traversal - Copy file references to new tag nodes
            currentLevelNodes = [mainTagNode];
            
            while (currentLevelNodes.length > 0) {
                const nextLevelNodes: ITagNode[] = [];
                
                for (const node of currentLevelNodes) {
                    const oldTagPath = node.getPath();
                    const pathDiff = oldTagPath.substring(mainFolderTagPath.length);
                    const newTagPath = newFolderTagPath + pathDiff;
                    
                    // Get the corresponding new node
                    const newNode = this.treeRoot.getNode(newTagPath);
                    if (newNode) {
                        // Read files from original node and add to new node
                        const files = node.getFiles();
                        for (const fileLeaf of files) {
                            newNode.addFileLeaftoFiles(fileLeaf);
                        }
                    }
                    
                    // Collect children for next level
                    const children = Object.values(node.getChildren());
                    nextLevelNodes.push(...children);
                }
                
                currentLevelNodes = nextLevelNodes;
            }
            // ---(Virtual Edits End - Second Phase)---

            // ---(Physical File Edits - Second Phase)---
            // BFS traversal - Copy metadata files
            currentLevelNodes = [mainTagNode];
            
            while (currentLevelNodes.length > 0) {
                const nextLevelNodes: ITagNode[] = [];
                
                for (const node of currentLevelNodes) {
                    const oldTagPath = node.getPath();
                    const pathDiff = oldTagPath.substring(mainFolderTagPath.length);
                    const newTagPath = newFolderTagPath + pathDiff;
                    
                    // Read folder metadata file properties
                    const metadata = fileEditor.metadataReadAllFrontmatter(this.app, oldTagPath);
                    
                    if (metadata) {
                        // Extract description and legend
                        const { description, legend } = metadata;
                        const propertiesToCopy: Record<string, any> = {};
                        
                        if (description !== undefined) {
                            propertiesToCopy.description = description;
                        }
                        if (legend !== undefined) {
                            propertiesToCopy.legend = legend;
                        }
                        
                        // Copy properties to new metadata file
                        if (Object.keys(propertiesToCopy).length > 0) {
                            fileEditor.metadataReplaceExistingProperty(
                                this.app,
                                newTagPath,
                                propertiesToCopy
                            );
                        }
                    }
                    
                    // Collect children for next level
                    const children = Object.values(node.getChildren());
                    nextLevelNodes.push(...children);
                }
                
                currentLevelNodes = nextLevelNodes;
            }
            // ---(Physical File Edits End - Second Phase)---

            // Invalidate cache
            this.treeRoot.invalidateCache();

            // ---(Frontend Refresh)---
            this.plugin.broadcastTreeUpdate();
            // ---(Frontend Refresh End)---

            return { success: true, newPath: newFolderTagPath };
        } catch (error) {
            console.error("Error in recreateFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Copy files and folders to clipboard with multiple MIME types
     * 
     * @param listOfFilePaths - Array of file paths to copy
     * @param listOfTagPaths - Array of folder tag paths to copy
     * @param parentTagPath - The parent tag path context for the copy operation
     * @returns Promise with success status and error if failed
     */
    async copyFilesAndFolders(
        listOfFilePaths: string[],
        listOfTagPaths: string[],
        parentTagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Construct payload object
            const payload = {
                files: listOfFilePaths,
                folders: listOfTagPaths,
                parent: parentTagPath,
                mode: "copy"
            };

            // Convert to JSON
            const payloadJson = JSON.stringify(payload);

            // Construct rawfilesandfolders string
            const rawFilesAndFolders = [...listOfFilePaths, ...listOfTagPaths].join('\n');

            // Write to clipboard with multiple MIME types
            const clipboardItems = [
                new ClipboardItem({
                    'application/x-obsidian-tag-folder-explorer': new Blob([payloadJson], { 
                        type: 'application/x-obsidian-tag-folder-explorer' 
                    }),
                    'application/json': new Blob([payloadJson], { 
                        type: 'application/json' 
                    }),
                    'text/plain': new Blob([rawFilesAndFolders], { 
                        type: 'text/plain' 
                    })
                })
            ];

            await navigator.clipboard.write(clipboardItems);

            return { success: true };
        } catch (error) {
            console.error("Error in copyFilesAndFolders:", error);
            return { success: false, error };
        }
    }

    /**
     * Cut files and folders to clipboard with multiple MIME types
     * 
     * @param listOfFilePaths - Array of file paths to cut
     * @param listOfTagPaths - Array of folder tag paths to cut
     * @param parentTagPath - The parent tag path context for the cut operation
     * @returns Promise with success status and error if failed
     */
    async cutFilesAndFolders(
        listOfFilePaths: string[],
        listOfTagPaths: string[],
        parentTagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Construct payload object
            const payload = {
                files: listOfFilePaths,
                folders: listOfTagPaths,
                parent: parentTagPath,
                mode: "cut"
            };

            // Convert to JSON
            const payloadJson = JSON.stringify(payload);

            // Construct rawfilesandfolders string
            const rawFilesAndFolders = [...listOfFilePaths, ...listOfTagPaths].join('\n');

            // Write to clipboard with multiple MIME types
            const clipboardItems = [
                new ClipboardItem({
                    'application/x-obsidian-tag-folder-explorer': new Blob([payloadJson], { 
                        type: 'application/x-obsidian-tag-folder-explorer' 
                    }),
                    'application/json': new Blob([payloadJson], { 
                        type: 'application/json' 
                    }),
                    'text/plain': new Blob([rawFilesAndFolders], { 
                        type: 'text/plain' 
                    })
                })
            ];

            await navigator.clipboard.write(clipboardItems);

            return { success: true };
        } catch (error) {
            console.error("Error in cutFilesAndFolders:", error);
            return { success: false, error };
        }
    }

    /**
     * Paste files and folders from clipboard to destination
     * 
     * @param destinationTagPath - The tag path where items should be pasted
     * @param blind - If false, return validation errors; if true, skip invalid items and proceed
     * @returns Promise with success status, invalid items if any, and error if failed
     */
    async pasteFilesAndFolders(
        destinationTagPath: string,
        blind: boolean = false, 
        owner:boolean = true
    ): Promise<{ 
        success: boolean; 
        invalidFiles?: string[]; 
        invalidFolders?: string[]; 
        error?: any 
    }> {
        try {
            // Read the clipboard
            const clipboardItems = await navigator.clipboard.read();
            
            let toPaste: any = null;

            // Find item with matching MIME type
            for (const item of clipboardItems) {
                if (item.types.includes('application/x-obsidian-tag-folder-explorer')) {
                    const blob = await item.getType('application/x-obsidian-tag-folder-explorer');
                    const text = await blob.text();
                    toPaste = JSON.parse(text);
                    break;
                }
            }

            if (!toPaste) {
                return { success: false, error: "No valid clipboard data found" };
            }

            // Extract from toPaste
            let { files, folders, parent, mode } = toPaste;

            // Validate files
            const invalidFiles: string[] = [];
            for (const filePath of files) {
                // Check if file still exists
                const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
                if (!fileLeaf) {
                    invalidFiles.push(filePath);
                }
            }

            // Validate folders
            const invalidFolders: string[] = [];
            for (const tagPath of folders) {
                // Verify that parent is not an ancestor of destination
                if (destinationTagPath.startsWith(tagPath + '/') || 
                    destinationTagPath === tagPath) {
                    invalidFolders.push(tagPath);
                    continue;
                }

                // Verify that tagPath still exists
                const tagNode = this.treeRoot.getNode(tagPath);
                if (!tagNode) {
                    invalidFolders.push(tagPath);
                }
            }

            // Handle invalid items
            if (invalidFiles.length > 0 || invalidFolders.length > 0) {
                if (!blind) {
                    // Return invalid items for frontend modal
                    return { 
                        success: false, 
                        invalidFiles, 
                        invalidFolders 
                    };
                } else {
                    // Filter out invalid items
                    files = files.filter((f: string) => !invalidFiles.includes(f));
                    folders = folders.filter((f: string) => !invalidFolders.includes(f));
                }
            }

            const sourceTagNode = this.treeRoot.getNode(parent)

            // Execute operations based on mode
            if (mode === "cut") {

                
                // Move files
                for (const filePath of files) {
                    const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
                    if (!fileLeaf) continue;

                    const fileName = fileLeaf.getName();


                    await this.moveFileToFolder(
                        parent,
                        destinationTagPath,
                        fileName,
                        filePath,
                        false
                    );
                }

                // Move folders
                for (const tagPath of folders) {
                    // Verify again that parent is not an ancestor of destination
                    if (destinationTagPath.startsWith(tagPath + '/') || 
                        destinationTagPath === tagPath) {
                        continue;
                    }

                    await this.moveFolderToFolder(
                        parent,
                        destinationTagPath,
                        tagPath,
                        false
                    );
                }

            } else if (mode === "copy") {
                // Copy files
                for (const filePath of files) {
                    const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
                    if (!fileLeaf) continue;

                    const fileName = fileLeaf.getName();
                    
                    await this.copyFileToFolder(
                        parent,
                        destinationTagPath,
                        fileName,
                        filePath,
                        false
                    );
                }

                // Copy folders (recreate)
                for (const tagPath of folders) {
                    // Verify again that parent is not an ancestor of destination
                    if (destinationTagPath.startsWith(tagPath + '/') || 
                        destinationTagPath === tagPath) {
                        continue;
                    }

                    await this.recreateFolder(
                        tagPath,
                        destinationTagPath,
                        false
                    );
                }
            }

            // Refresh UI
            this.treeRoot.invalidateCache();
            this.plugin.broadcastTreeUpdate();

            return { success: true };
        } catch (error) {
            console.error("Error in pasteFilesAndFolders:", error);
            return { success: false, error };
        }
    }

    /**
     * Add to legend for file and folder
     * 
     * @param legendColor - The legend color identifier
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addToLegend(
        legendColor: string,
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Construct key as "🏷-Legend-" + legendcolor
            const key = `🏷-Legend-${legendColor}`;

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }

            // Construct prefixed and locked tag paths
            const prefixedTagPath = `🏠/${tagPath}`;
            const lockedTagPath = `🔒/ ${tagPath}`;

            // Check if status list has prefixedtagpath or lockedtagpath
            if (fileStatusList.includes(prefixedTagPath) ) {
                return { success: false, error: `File already has prefixed tag path: ${prefixedTagPath}` };
            }
            
            if (fileStatusList.includes(lockedTagPath) ) {
                return { success: false, error: `File already has locked tag path: ${lockedTagPath}` };
            }

            // Add prefixedtagpath to status lists
            fileStatusList.push(prefixedTagPath);


            // Write new status list to file
            const fileUpdateContent: Record<string, any> = {};
            fileUpdateContent[key] = fileStatusList;
            
            const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                this.app,
                tFile,
                fileUpdateContent
            );

            if (!fileWriteSuccess) {
                return { success: false, error: "Failed to write to file metadata" };
            }



            return { success: true };
        } catch (error) {
            console.error("Error in addToLegend:", error);
            return { success: false, error };
        }
    }

    /**
     * Remove from legend for file in folder
     * 
     * @param legendColor - The legend color identifier
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeFromLegend(
        legendColor: string,
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Construct key as "🏷-Legend-" + legendcolor
            const key = `🏷-Legend-${legendColor}`;

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }



            // Construct prefixed and locked tag paths
            const prefixedTagPath = `🏠/${tagPath}`;
            const lockedTagPath = `🔒/ ${tagPath}`;

            // Check if status lists have lockedtagpath
            if (fileStatusList.includes(lockedTagPath) ) {
                return { success: false, error: `File has locked tag path: ${lockedTagPath}` };
            }

            // Check if status lists have prefixedtagpath
            const fileHasPrefix = fileStatusList.includes(prefixedTagPath);

            if (!fileHasPrefix) {
                return { success: false, error: `File doesn't have prefixed tag path: ${prefixedTagPath}` };
            }

            // Remove prefixedtagpath from status lists
            if (fileHasPrefix) {
                fileStatusList = fileStatusList.filter(item => item !== prefixedTagPath);
            }
            

            // Write new status list to file
            const fileUpdateContent: Record<string, any> = {};
            fileUpdateContent[key] = fileStatusList;
            
            const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                this.app,
                tFile,
                fileUpdateContent
            );

            if (!fileWriteSuccess) {
                return { success: false, error: "Failed to write to file metadata" };
            }


            return { success: true };
        } catch (error) {
            console.error("Error in removeFromLegend:", error);
            return { success: false, error };
        }
    }

    /**
     * Cycle legend for file in folder through color states
     * 
     * @param currLegendColor - The current legend color identifier
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async cycleLegend(
        currLegendColor: string,
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Maintain list of colors
            const colorList = ["Red", "Orange", "Yellow", "Green", "Blue", "Purple", ""];
            
            // Extract index of colorlist matching currlegendcolor
            const currentIndex = colorList.indexOf(currLegendColor);
            if (currentIndex === -1) {
                return { success: false, error: `Invalid legend color: ${currLegendColor}` };
            }

            // Extract next index color from color list
            const nextIndex = (currentIndex + 1) % colorList.length;
            const nextColor = colorList[nextIndex];

            // If legend color is ""
            if (currLegendColor === "") {
                // Call add to legend with next index color
                return await this.addToLegend(nextColor, filePath, tagPath, false);
            } else {
                // Construct key as "🏷-Legend-" + currlegendcolor
                const key = `🏷-Legend-${currLegendColor}`;

                // Read status of the key for file metadata
                const fileMetadata = fileLeaf.fileMetadata();
                let fileStatusList: string[] = [];
                
                if (fileMetadata && fileMetadata[key]) {
                    if (Array.isArray(fileMetadata[key])) {
                        fileStatusList = fileMetadata[key];
                    } else if (typeof fileMetadata[key] === 'string') {
                        fileStatusList = [fileMetadata[key]];
                    }
                }


                // Construct prefixed and locked tag paths
                const prefixedTagPath = `🏠/${tagPath}`;
                const lockedTagPath = `🔒/ ${tagPath}`;

                // Check if status lists have lockedtagpath
                if (fileStatusList.includes(lockedTagPath) ) {
                    return { success: false, error: `File has locked tag path: ${lockedTagPath}` };
                }

                // Check if status lists have prefixedtagpath
                const hasPrefix = fileStatusList.includes(prefixedTagPath);

                if (hasPrefix) {
                    // If next index color is ""
                    if (nextColor === "") {
                        // Call remove from legend
                        return await this.removeFromLegend(currLegendColor, filePath, tagPath, false);
                    } else {
                        // Call remove from legend then add to legend
                        const removeResult = await this.removeFromLegend(currLegendColor, filePath, tagPath, false);
                        if (!removeResult.success) {
                            return removeResult;
                        }
                        
                        return await this.addToLegend(nextColor, filePath, tagPath, false);
                    }
                } else {
                    // Doesn't have prefixedtagpath and lockedtagpath
                    return { 
                        success: false, 
                        error: "Color was provided but no folder was found. If new append was expected, no color should be passed as a parameter" 
                    };
                }
            }
        } catch (error) {
            console.error("Error in cycleLegend:", error);
            return { success: false, error };
        }
    }

    /**
     * Add to legend lock for file in folder
     * 
     * @param legendColor - The legend color identifier
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addToLegendLock(
        legendColor: string,
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Construct key as "🏷-Legend-" + legendcolor
            const key = `🏷-Legend-${legendColor}`;

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }


            // Construct prefixed and locked tag paths
            const prefixedTagPath = `🏠/${tagPath}`;
            const lockedTagPath = `🔒/ ${tagPath}`;

            // Check if status lists have lockedtagpath
            if (fileStatusList.includes(lockedTagPath) ) {
                return { success: false, error: `File already has locked tag path: ${lockedTagPath}` };
            }

            // Check if status lists have prefixedtagpath
            const fileHasPrefix = fileStatusList.includes(prefixedTagPath);

            if (fileHasPrefix) {
                // Remove prefixedtagpath and add lockedtagpath
                if (fileHasPrefix) {
                    fileStatusList = fileStatusList.filter(item => item !== prefixedTagPath);
                }

            }

            // Add lockedtagpath to status lists
            fileStatusList.push(lockedTagPath);


            // Write new status list to file
            const fileUpdateContent: Record<string, any> = {};
            fileUpdateContent[key] = fileStatusList;
            
            const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                this.app,
                tFile,
                fileUpdateContent
            );

            if (!fileWriteSuccess) {
                return { success: false, error: "Failed to write to file metadata" };
            }



            return { success: true };
        } catch (error) {
            console.error("Error in addToLegendLock:", error);
            return { success: false, error };
        }
    }

    /**
     * Remove from legend lock for file in folder (unlock)
     * 
     * @param legendColor - The legend color identifier
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeFromLegendLock(
        legendColor: string,
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Construct key as "🏷-Legend-" + legendcolor
            const key = `🏷-Legend-${legendColor}`;

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }



            // Construct prefixed and locked tag paths
            const prefixedTagPath = `🏠/${tagPath}`;
            const lockedTagPath = `🔒/ ${tagPath}`;

            // Check if status lists have lockedtagpath
            const fileHasLocked = fileStatusList.includes(lockedTagPath);

            if (fileHasLocked ) {
                // Unlock it: remove locked, add prefixed
                if (fileHasLocked) {
                    fileStatusList = fileStatusList.filter(item => item !== lockedTagPath);
                    fileStatusList.push(prefixedTagPath);
                }


                // Write new status list to file
                const fileUpdateContent: Record<string, any> = {};
                fileUpdateContent[key] = fileStatusList;
                
                const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                    this.app,
                    tFile,
                    fileUpdateContent
                );

                if (!fileWriteSuccess) {
                    return { success: false, error: "Failed to write to file metadata" };
                }



                return { success: true };
            }

            // Check if has prefixed tag path
            if (fileStatusList.includes(prefixedTagPath)) {
                return { success: false, error: "Legend is already unlocked" };
            }

            // Doesn't have prefixed or locked
            return { success: false, error: "Legend doesn't exist" };
        } catch (error) {
            console.error("Error in removeFromLegendLock:", error);
            return { success: false, error };
        }
    }

    /**
     * Read legend status for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @returns Object with color and lock status, or empty string if not found
     */
    readLegendStatus(
        filePath: string,
        tagPath: string
    ): { color: string; status: string } | { color: "" } {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { color: "" };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { color: "" };
            }

            // Construct prefixed and locked tag paths
            const prefixedTagPath = `🏠/${tagPath}`;
            const lockedTagPath = `🔒/ ${tagPath}`;

            // Read file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            if (!fileMetadata) {
                return { color: "" };
            }

            // Key list for all legend colors
            const legendKeys = [
                { key: "🏷-Legend-Red", color: "Red" },
                { key: "🏷-Legend-Orange", color: "Orange" },
                { key: "🏷-Legend-Yellow", color: "Yellow" },
                { key: "🏷-Legend-Green", color: "Green" },
                { key: "🏷-Legend-Blue", color: "Blue" },
                { key: "🏷-Legend-Purple", color: "Purple" }
            ];

            // Extract all 6 fields and check for matches
            for (const { key, color } of legendKeys) {
                const value = fileMetadata[key];
                if (!value) continue;

                // Convert to array if needed
                let statusArray: string[] = [];
                if (Array.isArray(value)) {
                    statusArray = value;
                } else if (typeof value === 'string') {
                    statusArray = [value];
                }

                // Check each element in array
                for (const element of statusArray) {
                    if (element === prefixedTagPath) {
                        return { color, status: "notlocked" };
                    }
                    if (element === lockedTagPath) {
                        return { color, status: "locked" };
                    }
                }
            }

            // No folder found
            return { color: "" };
        } catch (error) {
            console.error("Error in readLegendStatus:", error);
            return { color: "" };
        }
    }

    /**
     * Add to pinned for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addToPinned(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Key is "🏷-Pinned"
            const key = "🏷-Pinned";

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }


            // Construct prefixed and locked tag paths
            const prefixedTagPath = `🏠/${tagPath}`;
            const lockedTagPath = `🔒/ ${tagPath}`;

            // Check if status lists have prefixedtagpath
            if (fileStatusList.includes(prefixedTagPath) ) {
                return { success: false, error: `File already has prefixed tag path: ${prefixedTagPath}` };
            }
            
            // Check if status lists have lockedtagpath
            if (fileStatusList.includes(lockedTagPath) ) {
                return { success: false, error: `File has locked tag path: ${lockedTagPath}` };
            }

            // Add prefixedtagpath to status lists
            fileStatusList.push(prefixedTagPath);


            // Write new status list to file
            const fileUpdateContent: Record<string, any> = {};
            fileUpdateContent[key] = fileStatusList;
            
            const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                this.app,
                tFile,
                fileUpdateContent
            );

            if (!fileWriteSuccess) {
                return { success: false, error: "Failed to write to file metadata" };
            }


            return { success: true };
        } catch (error) {
            console.error("Error in addToPinned:", error);
            return { success: false, error };
        }
    }

    /**
     * Remove from pinned for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeFromPinned(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Key is "🏷-Pinned"
            const key = "🏷-Pinned";

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }


            // Construct prefixed and locked tag paths
            const prefixedTagPath = `🏠/${tagPath}`;
            const lockedTagPath = `🔒/ ${tagPath}`;

            // Check if status lists have lockedtagpath
            if (fileStatusList.includes(lockedTagPath) ) {
                return { success: false, error: `File has locked tag path: ${lockedTagPath}` };
            }

            // Check if status lists have prefixedtagpath
            const fileHasPrefix = fileStatusList.includes(prefixedTagPath);

            if (!fileHasPrefix ) {
                return { success: false, error: `File doesn't have prefixed tag path: ${prefixedTagPath}` };
            }

            // Remove prefixedtagpath from status lists
            if (fileHasPrefix) {
                fileStatusList = fileStatusList.filter(item => item !== prefixedTagPath);
            }
            

            // Write new status list to file
            const fileUpdateContent: Record<string, any> = {};
            fileUpdateContent[key] = fileStatusList;
            
            const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                this.app,
                tFile,
                fileUpdateContent
            );

            if (!fileWriteSuccess) {
                return { success: false, error: "Failed to write to file metadata" };
            }



            return { success: true };
        } catch (error) {
            console.error("Error in removeFromPinned:", error);
            return { success: false, error };
        }
    }

    /**
     * Cycle pinned for file in folder (toggle pin state)
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async cyclePinned(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Key is "🏷-Pinned"
            const key = "🏷-Pinned";

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }



            // Construct prefixed and locked tag paths
            const prefixedTagPath = `🏠/${tagPath}`;
            const lockedTagPath = `🔒/ ${tagPath}`;

            // Check if status lists have lockedtagpath
            if (fileStatusList.includes(lockedTagPath)) {
                return { success: false, error: `File is locked, cannot toggle: ${lockedTagPath}` };
            }

            // Check if status lists have prefixedtagpath
            const fileHasPrefix = fileStatusList.includes(prefixedTagPath);

            if (fileHasPrefix) {
                // Remove prefixedtagpath from status lists
                fileStatusList = fileStatusList.filter(item => item !== prefixedTagPath);
                

            } else {
                // Add prefixedtagpath to status lists
                fileStatusList.push(prefixedTagPath);

            }

            // Write new status list to file
            const fileUpdateContent: Record<string, any> = {};
            fileUpdateContent[key] = fileStatusList;
            
            const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                this.app,
                tFile,
                fileUpdateContent
            );

            if (!fileWriteSuccess) {
                return { success: false, error: "Failed to write to file metadata" };
            }



            return { success: true };
        } catch (error) {
            console.error("Error in cyclePinned:", error);
            return { success: false, error };
        }
    }

    /**
     * Add to pinned lock for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addToPinnedLock(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Key is "🏷-Pinned"
            const key = "🏷-Pinned";

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }


            // Construct prefixed and locked tag paths
            const prefixedTagPath = `🏠/${tagPath}`;
            const lockedTagPath = `🔒/ ${tagPath}`;

            // Check if status lists have lockedtagpath
            if (fileStatusList.includes(lockedTagPath) ) {
                return { success: false, error: `File already has locked tag path: ${lockedTagPath}` };
            }

            // Check if status lists have prefixedtagpath
            const fileHasPrefix = fileStatusList.includes(prefixedTagPath);

            if (fileHasPrefix ) {
                // Remove prefixedtagpath and add lockedtagpath
                fileStatusList = fileStatusList.filter(item => item !== prefixedTagPath);

            }

            // Add lockedtagpath to status lists
            fileStatusList.push(lockedTagPath);

            // Write new status list to file
            const fileUpdateContent: Record<string, any> = {};
            fileUpdateContent[key] = fileStatusList;
            
            const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                this.app,
                tFile,
                fileUpdateContent
            );

            if (!fileWriteSuccess) {
                return { success: false, error: "Failed to write to file metadata" };
            }


            return { success: true };
        } catch (error) {
            console.error("Error in addToPinnedLock:", error);
            return { success: false, error };
        }
    }

    /**
     * Remove from pinned lock for file in folder (unlock)
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeFromPinnedLock(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Key is "🏷-Pinned"
            const key = "🏷-Pinned";

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }



            // Construct prefixed and locked tag paths
            const prefixedTagPath = `🏠/${tagPath}`;
            const lockedTagPath = `🔒/ ${tagPath}`;

            // Check if status lists have lockedtagpath
            const fileHasLocked = fileStatusList.includes(lockedTagPath);

            if (fileHasLocked ) {
                // Unlock it: remove locked, add prefixed
                fileStatusList = fileStatusList.filter(item => item !== lockedTagPath);
                fileStatusList.push(prefixedTagPath);


                // Write new status list to file
                const fileUpdateContent: Record<string, any> = {};
                fileUpdateContent[key] = fileStatusList;
                
                const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                    this.app,
                    tFile,
                    fileUpdateContent
                );

                if (!fileWriteSuccess) {
                    return { success: false, error: "Failed to write to file metadata" };
                }

                return { success: true };
            }

            // Check if has prefixed tag path
            if (fileStatusList.includes(prefixedTagPath)) {
                return { success: false, error: "Pinned is already unlocked" };
            }

            // Doesn't have prefixed or locked
            return { success: false, error: "Pinned doesn't exist" };
        } catch (error) {
            console.error("Error in removeFromPinnedLock:", error);
            return { success: false, error };
        }
    }

    /**
     * Read pinned status for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @returns Object with pinned status, or pinned: false if not found
     */
    readPinnedStatus(
        filePath: string,
        tagPath: string
    ): { pinned: boolean; status?: string } {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { pinned: false };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { pinned: false };
            }

            // Construct prefixed and locked tag paths
            const prefixedTagPath = `🏠/${tagPath}`;
            const lockedTagPath = `🔒/ ${tagPath}`;

            // Read file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            if (!fileMetadata) {
                return { pinned: false };
            }

            // Key is "🏷-Pinned"
            const key = "🏷-Pinned";
            const value = fileMetadata[key];
            
            if (!value) {
                return { pinned: false };
            }

            // Convert to array if needed
            let statusArray: string[] = [];
            if (Array.isArray(value)) {
                statusArray = value;
            } else if (typeof value === 'string') {
                statusArray = [value];
            }

            // Check each element in array
            for (const element of statusArray) {
                if (element === prefixedTagPath) {
                    return { pinned: true, status: "notlocked" };
                }
                if (element === lockedTagPath) {
                    return { pinned: true, status: "locked" };
                }
            }

            // No folder found
            return { pinned: false };
        } catch (error) {
            console.error("Error in readPinnedStatus:", error);
            return { pinned: false };
        }
    }

    /**
     * Add to pinned for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addToPinnedForFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract tagnode using tagpath from tree
            const tagNode = this.treeRoot.getNode(tagPath);
            if (!tagNode) {
                return { success: false, error: `TagNode not found for path: ${tagPath}` };
            }

            // Read metadata of tagnode
            const metadata = fileEditor.metadataReadAllFrontmatter(this.app, tagPath);
            
            // Key is "Pinned"
            const key = "Pinned";
            const pinnedValue = metadata?.[key];

            // If Pinned is not present
            if (!pinnedValue) {
                const updateContent: Record<string, any> = {};
                updateContent[key] = {
                    pinned: true,
                    locked: false
                };
                
                fileEditor.metadataAddNewProperty(
                    this.app,
                    tagPath,
                    updateContent
                );

                return { success: true };
            }

            // Else if Pinned.pinned is true
            if (pinnedValue.pinned === true) {
                // If Pinned.locked is not present, add it
                if (pinnedValue.locked === undefined) {
                    const updateContent: Record<string, any> = {};
                    updateContent[key] = {
                        ...pinnedValue,
                        locked: false
                    };
                    
                    fileEditor.metadataReplaceExistingProperty(
                        this.app,
                        tagPath,
                        updateContent
                    );

                }

                return { success: false, error: "Folder is already pinned" };
            }

            // Else if Pinned.pinned not present or if false
            if (pinnedValue.pinned === undefined || pinnedValue.pinned === false) {
                // If Pinned.locked is true
                if (pinnedValue.locked === true) {
                    return { success: false, error: "Pinned is locked" };
                } else {
                    // Add Pinned.pinned and Pinned.locked
                    const updateContent: Record<string, any> = {};
                    updateContent[key] = {
                        ...pinnedValue,
                        pinned: true,
                        locked: false
                    };
                    
                    fileEditor.metadataReplaceExistingProperty(
                        this.app,
                        tagPath,
                        updateContent
                    );

                    return { success: true };
                }
            }

            return { success: false, error: "Unexpected state" };
        } catch (error) {
            console.error("Error in addToPinnedForFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Remove from pinned for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeFromPinnedForFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract tagnode using tagpath from tree
            const tagNode = this.treeRoot.getNode(tagPath);
            if (!tagNode) {
                return { success: false, error: `TagNode not found for path: ${tagPath}` };
            }

            // Read metadata of tagnode
            const metadata = fileEditor.metadataReadAllFrontmatter(this.app, tagPath);
            
            // Key is "Pinned"
            const key = "Pinned";
            const pinnedValue = metadata?.[key];

            // If Pinned is not present
            if (!pinnedValue) {
                const updateContent: Record<string, any> = {};
                updateContent[key] = {
                    pinned: false,
                    locked: false
                };
                
                fileEditor.metadataAddNewProperty(
                    this.app,
                    tagPath,
                    updateContent
                );


                return { success: true };
            }

            // Else if Pinned.pinned is true
            if (pinnedValue.pinned === true) {
                // If Pinned.locked is true
                if (pinnedValue.locked === true) {
                    return { success: false, error: "Folder pin is locked" };
                } else {
                    // Make Pinned.pinned false
                    const updateContent: Record<string, any> = {};
                    updateContent[key] = {
                        ...pinnedValue,
                        pinned: false
                    };
                    
                    fileEditor.metadataReplaceExistingProperty(
                        this.app,
                        tagPath,
                        updateContent
                    );


                    return { success: true };
                }
            }

            // Else if Pinned.pinned not present or if false
            if (pinnedValue.pinned === undefined || pinnedValue.pinned === false) {
                // If Pinned.locked is true
                if (pinnedValue.locked === true) {
                    return { success: false, error: "Pinned is locked" };
                } else {
                    // Add Pinned.pinned and Pinned.locked
                    const updateContent: Record<string, any> = {};
                    updateContent[key] = {
                        ...pinnedValue,
                        pinned: false,
                        locked: false
                    };
                    
                    fileEditor.metadataReplaceExistingProperty(
                        this.app,
                        tagPath,
                        updateContent
                    );


                    return { success: true };
                }
            }

            return { success: false, error: "Unexpected state" };
        } catch (error) {
            console.error("Error in removeFromPinnedForFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Cycle pinned for folder (toggle pin state)
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async cyclePinnedForFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract tagnode using tagpath from tree
            const tagNode = this.treeRoot.getNode(tagPath);
            if (!tagNode) {
                return { success: false, error: `TagNode not found for path: ${tagPath}` };
            }

            // Read metadata of tagnode
            const metadata = fileEditor.metadataReadAllFrontmatter(this.app, tagPath);
            
            // Key is "Pinned"
            const key = "Pinned";
            const pinnedValue = metadata?.[key];

            // If Pinned is not present
            if (!pinnedValue) {
                const updateContent: Record<string, any> = {};
                updateContent[key] = {
                    pinned: true,
                    locked: false
                };
                
                fileEditor.metadataAddNewProperty(
                    this.app,
                    tagPath,
                    updateContent
                );


                return { success: true };
            }

            // Else if Pinned.locked is true
            if (pinnedValue.locked === true) {
                return { success: false, error: "Cannot toggle, folder is locked" };
            }

            // Else if Pinned.locked is false or is not present
            if (pinnedValue.locked === false || pinnedValue.locked === undefined) {
                // If Pinned.pinned is true
                if (pinnedValue.pinned === true) {
                    const updateContent: Record<string, any> = {};
                    updateContent[key] = {
                        ...pinnedValue,
                        pinned: false,
                        locked: false
                    };
                    
                    fileEditor.metadataReplaceExistingProperty(
                        this.app,
                        tagPath,
                        updateContent
                    );

                    return { success: true };
                }
                // Else if Pinned.pinned not present or if false
                else if (pinnedValue.pinned === undefined || pinnedValue.pinned === false) {
                    const updateContent: Record<string, any> = {};
                    updateContent[key] = {
                        ...pinnedValue,
                        pinned: true,
                        locked: false
                    };
                    
                    fileEditor.metadataReplaceExistingProperty(
                        this.app,
                        tagPath,
                        updateContent
                    );


                    return { success: true };
                }
            }

            return { success: false, error: "Unexpected state" };
        } catch (error) {
            console.error("Error in cyclePinnedForFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Add to pinned lock for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addToPinnedLockForFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract tagnode using tagpath from tree
            const tagNode = this.treeRoot.getNode(tagPath);
            if (!tagNode) {
                return { success: false, error: `TagNode not found for path: ${tagPath}` };
            }

            // Read metadata of tagnode
            const metadata = fileEditor.metadataReadAllFrontmatter(this.app, tagPath);
            
            // Key is "Pinned"
            const key = "Pinned";
            const pinnedValue = metadata?.[key];


            // If Pinned is not present 
            if (!pinnedValue) {
                const updateContent: Record<string, any> = {};
                updateContent[key] = {
                    ...pinnedValue,
                    pinned: true,
                    locked: true
                };
                
                fileEditor.metadataAddNewProperty(
                    this.app,
                    tagPath,
                    updateContent
                );


                return { success: true };
            }


            // If Pinned.locked is true
            if (pinnedValue?.locked === true) {
                // Make Pinned.pinned true, keep locked true
                const updateContent: Record<string, any> = {};
                updateContent[key] = {
                    ...pinnedValue,
                    pinned: true,
                    locked: true
                };
                
                fileEditor.metadataReplaceExistingProperty(
                    this.app,
                    tagPath,
                    updateContent
                );


                return { success: false, error: "Folder is already locked" };
            }

            // If Pinned.locked is false or is not present
            if (!pinnedValue || pinnedValue.locked === false || pinnedValue.locked === undefined) {
                const updateContent: Record<string, any> = {};
                updateContent[key] = {
                    ...pinnedValue,
                    pinned: true,
                    locked: true
                };
                
                fileEditor.metadataReplaceExistingProperty(
                    this.app,
                    tagPath,
                    updateContent
                );


                return { success: true };
            }



            return { success: false, error: "Unexpected state" };
        } catch (error) {
            console.error("Error in addToPinnedLockForFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Remove from pinned lock for folder (unlock)
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeFromPinnedLockForFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract tagnode using tagpath from tree
            const tagNode = this.treeRoot.getNode(tagPath);
            if (!tagNode) {
                return { success: false, error: `TagNode not found for path: ${tagPath}` };
            }

            // Read metadata of tagnode
            const metadata = fileEditor.metadataReadAllFrontmatter(this.app, tagPath);
            
            // Key is "Pinned"
            const key = "Pinned";
            const pinnedValue = metadata?.[key];

            // If Pinned is not present
            if (!pinnedValue) {
                const updateContent: Record<string, any> = {};
                updateContent[key] = {
                    pinned: true,
                    locked: false
                };
                
                fileEditor.metadataAddNewProperty(
                    this.app,
                    tagPath,
                    updateContent
                );


                return { success: true };
            }

            // If Pinned.locked is true
            if (pinnedValue?.locked === true) {
                const updateContent: Record<string, any> = {};
                updateContent[key] = {
                    ...pinnedValue,
                    pinned: true,
                    locked: false
                };
                
                fileEditor.metadataReplaceExistingProperty(
                    this.app,
                    tagPath,
                    updateContent
                );



                return { success: true };
            }

            // If Pinned.locked is false
            if (pinnedValue?.locked === false) {
                return { success: false, error: "Folder is already unlocked" };
            }



            return { success: false, error: "Unexpected state" };
        } catch (error) {
            console.error("Error in removeFromPinnedLockForFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Read pinned status for folder
     * 
     * @param tagPath - The tag path
     * @returns Object with pinned and locked status
     */
    readPinnedStatusForFolder(
        tagPath: string
    ): { pinned: boolean; locked: boolean } {
        try {
            // Extract tagnode using tagpath from tree
            const tagNode = this.treeRoot.getNode(tagPath);
            if (!tagNode) {
                return { pinned: false, locked: false };
            }

            // Read tagnode metadata
            const metadata = fileEditor.metadataReadAllFrontmatter(this.app, tagPath);
            
            // Extract Pinned property
            const pinnedProperty = metadata?.["Pinned"];
            
            if (!pinnedProperty) {
                return { pinned: false, locked: false };
            }

            // Extract pinned and locked values
            const pinned = pinnedProperty.pinned === true;
            const locked = pinnedProperty.locked === true;

            return { pinned, locked };
        } catch (error) {
            console.error("Error in readPinnedStatusForFolder:", error);
            return { pinned: false, locked: false };
        }
    }

    /**
     * Add to bookmarked for file of a specific path
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addToBookmarked(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Key is "🏷-Bookmarked"
            const key = "🏷-Bookmarked";

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }


            // Construct prefixed tag path
            const prefixedTagPath = `🏠/${tagPath}`;

            // Check if status lists have prefixedtagpath
            if (fileStatusList.includes(prefixedTagPath) ) {
                return { success: false, error: `File already has prefixed tag path: ${prefixedTagPath}` };
            }

            // Add prefixedtagpath to status lists
            fileStatusList.push(prefixedTagPath);

            // Write new status list to file
            const fileUpdateContent: Record<string, any> = {};
            fileUpdateContent[key] = fileStatusList;
            
            const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                this.app,
                tFile,
                fileUpdateContent
            );

            if (!fileWriteSuccess) {
                return { success: false, error: "Failed to write to file metadata" };
            }


            return { success: true };
        } catch (error) {
            console.error("Error in addToBookmarked:", error);
            return { success: false, error };
        }
    }

    /**
     * Remove from bookmarked for file
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeFromBookmarked(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Key is "🏷-Bookmarked"
            const key = "🏷-Bookmarked";

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }



            // Construct prefixed tag path
            const prefixedTagPath = `🏠/${tagPath}`;

            // Check if status lists have prefixedtagpath
            const fileHasPrefix = fileStatusList.includes(prefixedTagPath);

            if (!fileHasPrefix ) {
                return { success: false, error: `File doesn't have prefixed tag path: ${prefixedTagPath}` };
            }

            // Remove prefixedtagpath from status lists
            if (fileHasPrefix) {
                fileStatusList = fileStatusList.filter(item => item !== prefixedTagPath);
            }


            // Write new status list to file
            const fileUpdateContent: Record<string, any> = {};
            fileUpdateContent[key] = fileStatusList;
            
            const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                this.app,
                tFile,
                fileUpdateContent
            );

            if (!fileWriteSuccess) {
                return { success: false, error: "Failed to write to file metadata" };
            }



            return { success: true };
        } catch (error) {
            console.error("Error in removeFromBookmarked:", error);
            return { success: false, error };
        }
    }

    /**
     * Cycle bookmarked for file (toggle bookmark state)
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async cycleBookmarked(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { success: false, error: `FileLeaf not found for path: ${filePath}` };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { success: false, error: `TFile not found at path: ${filePath}` };
            }

            // Key is "🏷-Bookmarked"
            const key = "🏷-Bookmarked";

            // Read status of the key for file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            let fileStatusList: string[] = [];
            
            if (fileMetadata && fileMetadata[key]) {
                if (Array.isArray(fileMetadata[key])) {
                    fileStatusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    fileStatusList = [fileMetadata[key]];
                }
            }


            // Construct prefixed tag path
            const prefixedTagPath = `🏠/${tagPath}`;

            // Check if status lists have prefixedtagpath
            const fileHasPrefix = fileStatusList.includes(prefixedTagPath);

            if (fileHasPrefix ) {
                // Remove prefixedtagpath from status lists
                fileStatusList = fileStatusList.filter(item => item !== prefixedTagPath);


            } else {
                // Add prefixedtagpath to status lists
                fileStatusList.push(prefixedTagPath);
            }

            // Write new status list to file
            const fileUpdateContent: Record<string, any> = {};
            fileUpdateContent[key] = fileStatusList;
            
            const fileWriteSuccess = await fileEditor.replaceMetadataSection(
                this.app,
                tFile,
                fileUpdateContent
            );

            if (!fileWriteSuccess) {
                return { success: false, error: "Failed to write to file metadata" };
            }


            return { success: true };
        } catch (error) {
            console.error("Error in cycleBookmarked:", error);
            return { success: false, error };
        }
    }

    /**
     * Read bookmarked status for file
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default false for read operations)
     * @returns Object with bookmarked status (true if bookmarked, false otherwise)
     */
    async readBookmarkedStatus(
        filePath: string,
        tagPath: string,
        owner: boolean = false
    ): Promise<{ bookmarked: boolean }> {
        try {
            // Extract fileleaf using filepath from fileleaf map
            const fileLeaf = this.treeRoot.fileLeafRetriever(filePath);
            if (!fileLeaf) {
                return { bookmarked: false };
            }

            // Extract file from fileleaf
            const tFile = fileLeaf.getTFile();
            if (!(tFile instanceof TFile)) {
                return { bookmarked: false };
            }

            // Construct prefixed tag path
            const prefixedTagPath = `🏠/${tagPath}`;

            // Read file metadata
            const fileMetadata = fileLeaf.fileMetadata();
            const key = "🏷-Bookmarked";
            
            if (fileMetadata && fileMetadata[key]) {
                let statusList: string[] = [];
                
                if (Array.isArray(fileMetadata[key])) {
                    statusList = fileMetadata[key];
                } else if (typeof fileMetadata[key] === 'string') {
                    statusList = [fileMetadata[key]];
                }

                // Check if prefixed tag path exists in the array
                for (const element of statusList) {
                    if (element === prefixedTagPath) {
                        return { bookmarked: true };
                    }
                }
            }

            // If no match found, return false
            return { bookmarked: false };
        } catch (error) {
            console.error("Error in readBookmarkedStatus:", error);
            return { bookmarked: false };
        }
    }

    /**
     * Add to bookmarked for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addToBookmarkedForFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract tagnode using tagpath from tree
            const tagNode = this.treeRoot.getNode(tagPath);
            if (!tagNode) {
                return { success: false, error: `TagNode not found for path: ${tagPath}` };
            }

            // Read metadata of tagnode
            const metadata = fileEditor.metadataReadAllFrontmatter(this.app, tagPath);
            
            // Key is "Bookmarked"
            const key = "Bookmarked";
            const currentValue = metadata ? metadata[key] : undefined;

            // If Bookmarked is not present or if Bookmarked is false
            if (currentValue == false) {
                // Add Bookmarked as true
                const updateContent: Record<string, any> = {};
                updateContent[key] = true;
                
                // Update file of metadata for tagnode
                fileEditor.metadataReplaceExistingProperty(
                    this.app,
                    tagPath,
                    updateContent
                );

                return { success: true };
            } else if (currentValue == undefined) {
                // Add Bookmarked as true
                const updateContent: Record<string, any> = {};
                updateContent[key] = true;
                
                // Update file of metadata for tagnode
                fileEditor.metadataAddNewProperty(
                    this.app,
                    tagPath,
                    updateContent
                );

                return { success: true };
            } else {
                // Bookmarked is already true
                return { success: false, error: "Bookmarked is already true" };
            }
        } catch (error) {
            console.error("Error in addToBookmarkedForFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Remove from bookmarked for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeFromBookmarkedForFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract tagnode using tagpath from tree
            const tagNode = this.treeRoot.getNode(tagPath);
            if (!tagNode) {
                return { success: false, error: `TagNode not found for path: ${tagPath}` };
            }

            // Read metadata of tagnode
            const metadata = fileEditor.metadataReadAllFrontmatter(this.app, tagPath);
            
            // Key is "Bookmarked"
            const key = "Bookmarked";
            const currentValue = metadata ? metadata[key] : undefined;

            // Prepare update content
            const updateContent: Record<string, any> = {};
            updateContent[key] = false;

            // If Bookmarked is not present or if Bookmarked is false
            if (currentValue == false) {
                // Add Bookmarked as false
                fileEditor.metadataReplaceExistingProperty(
                    this.app,
                    tagPath,
                    updateContent
                );

                // Return false as Bookmarked is already false
                return { success: false, error: "Bookmarked is already false" };
            } else if (currentValue == undefined) {
                // Add Bookmarked as false
                fileEditor.metadataAddNewProperty(
                    this.app,
                    tagPath,
                    updateContent
                );

                // Return false as Bookmarked is already false
                return { success: false, error: "Bookmarked is already false" };
            } else {
                // Bookmarked is true, set it to false
                fileEditor.metadataReplaceExistingProperty(
                    this.app,
                    tagPath,
                    updateContent
                );

                return { success: true };
            }
        } catch (error) {
            console.error("Error in removeFromBookmarkedForFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Cycle bookmarked for folder (toggle bookmark state)
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async cycleBookmarkedForFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        try {
            // Extract tagnode using tagpath from tree
            const tagNode = this.treeRoot.getNode(tagPath);
            if (!tagNode) {
                return { success: false, error: `TagNode not found for path: ${tagPath}` };
            }

            // Read metadata of tagnode
            const metadata = fileEditor.metadataReadAllFrontmatter(this.app, tagPath);
            
            // Key is "Bookmarked"
            const key = "Bookmarked";
            const currentValue = metadata ? metadata[key] : undefined;

            // Prepare update content
            const updateContent: Record<string, any> = {};

            // If Bookmarked is not present or if Bookmarked is false
            if (currentValue == false) {
                // Add Bookmarked as true
                updateContent[key] = true;

                // Update file of metadata for tagnode
                fileEditor.metadataReplaceExistingProperty(
                    this.app,
                    tagPath,
                    updateContent
                );


            } else if (currentValue == undefined) {
                // Add Bookmarked as true
                updateContent[key] = true;

                // Update file of metadata for tagnode
                fileEditor.metadataAddNewProperty(
                    this.app,
                    tagPath,
                    updateContent
                );

            }      
            else {
                // Bookmarked is true, set it to false
                updateContent[key] = false;

                // Update file of metadata for tagnode
                fileEditor.metadataReplaceExistingProperty(
                    this.app,
                    tagPath,
                    updateContent
                );

            }


            return { success: true };
        } catch (error) {
            console.error("Error in cycleBookmarkedForFolder:", error);
            return { success: false, error };
        }
    }

    /**
     * Read bookmarked status for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default false for read operations)
     * @returns Object with bookmarked status (true if bookmarked, false otherwise)
     */
    async readBookmarkedStatusForFolder(
        tagPath: string,
        owner: boolean = false
    ): Promise<{ bookmarked: boolean }> {
        try {
            // Extract tagnode using tagpath from tree
            const tagNode = this.treeRoot.getNode(tagPath);
            if (!tagNode) {
                return { bookmarked: false };
            }

            // Read tagnode metadata
            const metadata = fileEditor.metadataReadAllFrontmatter(this.app, tagPath);
            
            // Extract Bookmarked property
            const bookmarkedValue = metadata ? metadata["Bookmarked"] : undefined;

            // If Bookmarked property value is true, return true
            if (bookmarkedValue === true) {
                return { bookmarked: true };
            } else {
                // Else if Bookmarked property is false or not present return false
                return { bookmarked: false };
            }
        } catch (error) {
            console.error("Error in readBookmarkedStatusForFolder:", error);
            return { bookmarked: false };
        }
    }




}
