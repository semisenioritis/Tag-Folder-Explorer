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
    private broadcastCallback: () => void;
    private plugin: TagFolderPlugin;

    constructor(app: App, treeRoot: TreeRoot, broadcastCallback: () => void, plugin: TagFolderPlugin) {
        this.app = app;
        this.treeRoot = treeRoot;
        this.broadcastCallback = broadcastCallback;
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
        fileName: string = "Untitled"
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
        folderName: string = "Untitled"
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
        filePath: string
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
        newTagName: string
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
        filePath: string
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
        childFolderPath: string
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
        filePath: string
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
        mainFolderTagPath: string
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
                const renameResult = await this.renameFolder(mainFolderTagPath, finalMainName);
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
        filePath: string
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

            // Verify if destination already has a file with the same name
            const currentFileName = fileLeaf.getName();
            let finalFileName = currentFileName;
            let counter = 1;
            
            // Check for name conflicts in destination
            const destinationFiles = destinationTagNode.getFiles();
            const fileNameWithoutExt = currentFileName.substring(0, currentFileName.lastIndexOf('.')) || currentFileName;
            const fileExt = currentFileName.substring(currentFileName.lastIndexOf('.'));
            
            while (true) {
                let nameExists = false;
                for (const file of destinationFiles) {
                    if (file.getName() === finalFileName) {
                        nameExists = true;
                        break;
                    }
                }
                
                if (!nameExists) break;
                
                finalFileName = `${fileNameWithoutExt} ${counter}${fileExt}`;
                counter++;
            }

            // If name conflict, rename file first
            if (finalFileName !== currentFileName) {
                const newFileNameWithoutExt = finalFileName.substring(0, finalFileName.lastIndexOf('.')) || finalFileName;
                const renameResult = await this.renameFile(
                    sourceFolderTagPath,
                    currentFileName,
                    newFileNameWithoutExt,
                    filePath
                );
                if (!renameResult.success) {
                    return { success: false, error: `Failed to rename file to avoid conflict: ${renameResult.error}` };
                }
                
                // Update filePath after rename
                if (renameResult.newPath) {
                    filePath = renameResult.newPath;
                }
                
                // Re-fetch file leaf after rename
                const renamedFileLeaf = this.treeRoot.fileLeafRetriever(filePath);
                if (!renamedFileLeaf) {
                    return { success: false, error: "Failed to retrieve renamed file leaf" };
                }
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
     * Edit/update folder description
     * 
     * @param folderTagPath - The tag path of the folder (e.g., "subject/math")
     * @param jsonObject - JSON object containing the description property
     * @returns Object with success status and error if failed
     */
    async updateFolderDescription(
        folderTagPath: string,
        jsonObject: Record<string, any>
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
        jsonObject: Record<string, any>
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
        jsonObject: Record<string, any>
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




}

