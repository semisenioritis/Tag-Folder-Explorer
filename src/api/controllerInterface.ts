import { TFile } from "obsidian";
import { Orchestrator } from "../orchestration/orchestrator";
import type { OperationResult } from "../types/common";

/**
 * ControllerInterface - Safe wrapper around Orchestrator functions for frontend access
 * 
 * This interface provides a controlled layer between the Svelte frontend and the Orchestrator.
 * It exposes only the necessary functions and adds additional validation/error handling if needed.
 * 
 * Control Flow:
 * Svelte Frontend → controllerInterface.ts → orchestrator.ts → fileEditor.ts/TreeRoot.ts
 */

export class ControllerInterface {
    private orchestrator: Orchestrator;

    constructor(orchestrator: Orchestrator) {
        this.orchestrator = orchestrator;
    }

    // ==================== FILE OPERATIONS ====================

    /**
     * Create a new file inside a tag folder
     * 
     * @param folderTagPath - The tag path where the file should be created
     * @param fileName - Optional file name (defaults to "Untitled")
     * @returns Promise with success status, file if created, and error if failed
     */
    async createFileInTagFolder(
        folderTagPath: string,
        fileName: string = "Untitled"
    ): Promise<{ success: boolean; file?: TFile; error?: any }> {
        return await this.orchestrator.createFileInTagFolder(folderTagPath, fileName);
    }

    /**
     * Rename a specific file
     * 
     * @param folderTagPath - The tag path where the file exists
     * @param oldFileName - The old file name
     * @param newFileName - The new file name (without extension)
     * @param filePath - The current file path
     * @returns Promise with success status, new path, and error if failed
     */
    async renameFile(
        newFileName: string,
        filePath: string
    ): Promise<{ success: boolean; newPath?: string; error?: any }> {
        return await this.orchestrator.renameFile(newFileName, filePath);
    }

    /**
     * Remove a file from a folder (remove tag from file)
     * 
     * @param folderTagPath - The tag path of the folder
     * @param fileName - The file name
     * @param filePath - The file path
     * @returns Promise with success status and error if failed
     */
    async removeFileFromFolder(
        folderTagPath: string,
        filePath: string
    ): Promise<OperationResult> {
        return await this.orchestrator.removeFileFromFolder(folderTagPath, filePath);
    }

    /**
     * Hard delete a file from existence (move to trash)
     * 
     * @param folderTagPath - The tag path where the file exists
     * @param fileName - The file name
     * @param filePath - The file path
     * @returns Promise with success status and error if failed
     */
    async hardDeleteFile(
        folderTagPath: string,
        fileName: string,
        filePath: string
    ): Promise<OperationResult> {
        return await this.orchestrator.hardDeleteFile(folderTagPath, fileName, filePath);
    }

    /**
     * Move file from one folder to another folder
     * 
     * @param sourceFolderTagPath - The tag path of the source folder
     * @param destinationFolderTagPath - The tag path of the destination folder
     * @param fileName - The file name
     * @param filePath - The file path
     * @returns Promise with success status and error if failed
     */
    async moveFileToFolder(
        sourceFolderTagPath: string,
        destinationFolderTagPath: string,
        filePath: string
    ): Promise<OperationResult> {
        return await this.orchestrator.moveFileToFolder(
            sourceFolderTagPath,
            destinationFolderTagPath,
            filePath
        );
    }

    /**
     * Copy file from one folder to another folder
     * 
     * @param sourceFolderTagPath - The tag path of the source folder
     * @param destinationFolderTagPath - The tag path of the destination folder
     * @param filePath - The file path
     * @returns Promise with success status and error if failed
     */
    async copyFileToFolder(
        sourceFolderTagPath: string,
        destinationFolderTagPath: string,
        filePath: string
    ): Promise<OperationResult> {
        return await this.orchestrator.copyFileToFolder(
            sourceFolderTagPath,
            destinationFolderTagPath,
            filePath
        );
    }

    // ==================== FOLDER OPERATIONS ====================

    /**
     * Create a new folder (tag node) inside a parent folder
     * 
     * @param folderTagPath - The parent tag path where the folder should be created
     * @param folderName - The name of the new folder to create
     * @returns Promise with success status, created node path, and error if failed
     */
    async createFolderInFolder(
        folderTagPath: string,
        folderName: string = "Untitled"
    ): Promise<{ success: boolean; nodePath?: string; error?: any }> {
        return await this.orchestrator.createFolderInFolder(folderTagPath, folderName);
    }

    /**
     * Rename a specific folder (tag node)
     * 
     * @param folderTagPath - The tag path of the folder to rename
     * @param newTagName - The new name for the tag/folder
     * @returns Promise with success status, new path, and error if failed
     */
    async renameFolder(
        folderTagPath: string,
        newTagName: string
    ): Promise<{ success: boolean; newPath?: string; error?: any }> {
        return await this.orchestrator.renameFolder(folderTagPath, newTagName);
    }

    /**
     * Remove a folder from its parent folder (delete tag branch)
     * 
     * @param childFolderPath - The tag path of the child folder to remove
     * @returns Promise with success status and error if failed
     */
    async removeFolderFromFolder(
        childFolderPath: string
    ): Promise<OperationResult> {
        return await this.orchestrator.removeFolderFromFolder(childFolderPath);
    }

    /**
     * Move folder from one folder to another folder
     * 
     * @param sourceFolderTagPath - The tag path of the source (current parent)
     * @param destinationFolderTagPath - The tag path of the destination (new parent)
     * @param mainFolderTagPath - The tag path of the folder to move
     * @returns Promise with success status, new path, and error if failed
     */
    async moveFolderToFolder(
        sourceFolderTagPath: string,
        destinationFolderTagPath: string,
        mainFolderTagPath: string
    ): Promise<{ success: boolean; newPath?: string; error?: any }> {
        return await this.orchestrator.moveFolderToFolder(
            sourceFolderTagPath,
            destinationFolderTagPath,
            mainFolderTagPath
        );
    }



    // ==================== METADATA OPERATIONS ====================
    /**
     * Edit/update folder description
     * 
     * @param folderTagPath - The tag path of the folder
     * @param jsonObject - JSON object containing the description property
     * @returns Promise with success status and error if failed
     */
    async updateFolderDescription(
        folderTagPath: string,
        jsonObject: Record<string, any>
    ): Promise<OperationResult> {
        return await this.orchestrator.updateFolderDescription(folderTagPath, jsonObject);
    }

    /**
     * Edit/update folder raindrop.io url 
     * 
     * @param folderTagPath - The tag path of the folder
     * @param jsonObject - JSON object containing the new raindropio url property
     * @returns Promise with success status and error if failed
     */
    async updateFolderRaindropioLink(
        folderTagPath: string,
        jsonObject: Record<string, any>
    ): Promise<OperationResult> {
        return await this.orchestrator.updateFolderRaindropioLink(folderTagPath, jsonObject);
    }

    /**
     * Edit/update folder legend
     * 
     * @param folderTagPath - The tag path of the folder
     * @param jsonObject - JSON object containing the legend property
     * @returns Promise with success status and error if failed
     */
    async updateFolderLegend(
        folderTagPath: string,
        jsonObject: Record<string, any>
    ): Promise<OperationResult> {
        return await this.orchestrator.updateFolderLegend(folderTagPath, jsonObject);
    }


    /**
     * Edit/update file description (metadata)
     * 
     * @param folderTagPath - The tag path of the folder
     * @param filePath - The file path
     * @param jsonObject - JSON object containing metadata properties to update
     * @returns Promise with success status and error if failed
     */
    async updateFileDescription(
        folderTagPath: string,
        filePath: string,
        jsonObject: Record<string, any>
    ): Promise<OperationResult> {
        return await this.orchestrator.updateFileDescription(folderTagPath, filePath, jsonObject);
    }

    /**
     * Duplicate a folder (tag node) in the same parent folder
     * 
     * @param folderTagPath - The tag path of the folder to duplicate
     * @returns Promise with success status, new path, and error if failed
     */
    async duplicateFolder(
        folderTagPath: string
    ): Promise<{ success: boolean; newPath?: string; error?: any }> {
        return await this.orchestrator.duplicateFolder(folderTagPath);
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
        destinationFolderTagPath: string
    ): Promise<{ success: boolean; newPath?: string; error?: any }> {
        return await this.orchestrator.recreateFolder(mainFolderTagPath, destinationFolderTagPath);
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
        parentTagPath: string
    ): Promise<OperationResult> {
        return await this.orchestrator.copyFilesAndFolders(listOfFilePaths, listOfTagPaths, parentTagPath);
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
        parentTagPath: string
    ): Promise<OperationResult> {
        return await this.orchestrator.cutFilesAndFolders(listOfFilePaths, listOfTagPaths, parentTagPath);
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
        blind: boolean = false
    ): Promise<{ 
        success: boolean; 
        invalidFiles?: string[]; 
        invalidFolders?: string[]; 
        error?: any 
    }> {
        return await this.orchestrator.pasteFilesAndFolders(destinationTagPath, blind);
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
    async addLegendToFile(
        legendColor: string,
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.addLegendToFile(legendColor, filePath, tagPath, owner);
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
    async removeLegendFromFile(
        legendColor: string,
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.removeLegendFromFile(legendColor, filePath, tagPath, owner);
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
    async cycleLegendOfFile(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.cycleLegendOfFile(filePath, tagPath, owner);
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
    async addLegendLockToFile(
        legendColor: string,
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.addLegendLockToFile(legendColor, filePath, tagPath, owner);
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
    async removeLegendLockFromFile(
        legendColor: string,
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.removeLegendLockFromFile(legendColor, filePath, tagPath, owner);
    }

    /**
     * Add to pinned for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addPinnedToFile(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.addPinnedToFile(filePath, tagPath, owner);
    }

    /**
     * Remove from pinned for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removePinnedFromFile(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.removePinnedFromFile(filePath, tagPath, owner);
    }

    /**
     * Cycle pinned for file in folder (toggle pin state)
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async cyclePinnedOfFile(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.cyclePinnedOfFile(filePath, tagPath, owner);
    }

    /**
     * Add to pinned lock for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addPinnedLockToFile(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.addPinnedLockToFile(filePath, tagPath, owner);
    }

    /**
     * Remove from pinned lock for file in folder (unlock)
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removePinnedLockFromFile(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.removePinnedLockFromFile(filePath, tagPath, owner);
    }

    /**
     * Add to pinned for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addPinnedToFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.addPinnedToFolder(tagPath, owner);
    }

    /**
     * Remove from pinned for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removePinnedFromFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.removePinnedFromFolder(tagPath, owner);
    }

    /**
     * Cycle pinned for folder (toggle pin state)
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async cyclePinnedOfFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.cyclePinnedOfFolder(tagPath, owner);
    }

    /**
     * Add to pinned lock for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addPinnedLockToFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.addPinnedLockToFolder(tagPath, owner);
    }

    /**
     * Remove from pinned lock for folder (unlock)
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removePinnedLockFromFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.removePinnedLockFromFolder(tagPath, owner);
    }

    /**
     * Add to bookmarked for file of a specific path
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addBookmarkToFile(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.addBookmarkToFile(filePath, tagPath, owner);
    }

    /**
     * Remove from bookmarked for file
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeBookmarkFromFile(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.removeBookmarkFromFile(filePath, tagPath, owner);
    }

    /**
     * Cycle bookmarked for file (toggle bookmark state)
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async cycleBookmarkOfFile(
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.cycleBookmarkOfFile(filePath, tagPath, owner);
    }


    /**
     * Add to bookmarked for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addBookmarkToFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.addBookmarkToFolder(tagPath, owner);
    }

    /**
     * Remove from bookmarked for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeBookmarkFromFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.removeBookmarkFromFolder(tagPath, owner);
    }

    /**
     * Cycle bookmarked for folder (toggle bookmark state)
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async cycleBookmarkOfFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.cycleBookmarkOfFolder(tagPath, owner);
    }


    /**
     * Add legend to folder
     * 
     * @param legendColor - The legend color to add
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addLegendToFolder(
        legendColor: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.addLegendToFolder(legendColor, tagPath, owner);
    }

    /**
     * Remove legend from folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeLegendFromFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.removeLegendFromFolder(tagPath, owner);
    }

    /**
     * Cycle legend for folder
     * 
     * @param currLegendColor - The current legend color
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async cycleLegendForFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.cycleLegendForFolder(tagPath, owner);
    }

    /**
     * Add locked legend to folder
     * 
     * @param legendColor - The legend color to add
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addLockedLegendToFolder(
        legendColor: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.addLegendLockToFolder(legendColor, tagPath, owner);
    }

    /**
     * Remove locked legend from folder
     * 
     * @param legendColor - The legend color to set
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async removeLockedLegendFromFolder(
        legendColor: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.removeLegendLockFromFolder(legendColor, tagPath, owner);
    }





    /**
     * Read legend status for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @returns Object with color and lock status, or empty string if not found
     */
    async readLegendStatusOfFile(
        filePath: string,
        tagPath: string
    ): Promise<{ color: string; status: string } | { color: "" }> {
        return await this.orchestrator.readLegendStatusOfFile(filePath, tagPath);
    }

    /**
     * Read pinned status for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @returns Object with pinned status, or pinned: false if not found
     */
    async readPinnedStatusOfFile(
        filePath: string,
        tagPath: string
    ): Promise<{ pinned: boolean; status?: string }> {
        return await this.orchestrator.readPinnedStatusOfFile(filePath, tagPath);
    }

    /**
     * Read bookmarked status for file
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default false for read operations)
     * @returns Object with bookmarked status (true if bookmarked, false otherwise)
     */
    async readBookmarkStatusOfFile(
        filePath: string,
        tagPath: string,
        owner: boolean = false
    ): Promise<{ bookmarked: boolean }> {
        return await this.orchestrator.readBookmarkStatusOfFile(filePath, tagPath, owner);
    }
    
    /**
     * Read legend status for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default false for read operations)
     * @returns Object with legend color and locked status
     */
    readLegendStatusOfFolder(
        tagPath: string
    ): { legend: string; locked: boolean } {
        return this.orchestrator.readLegendStatusOfFolder(tagPath);
    }

    /**
     * Read pinned status for folder
     * 
     * @param tagPath - The tag path
     * @returns Object with pinned and locked status
     */
    readPinnedStatusOfFolder(
        tagPath: string
    ): { pinned: boolean; locked: boolean } {
        return this.orchestrator.readPinnedStatusOfFolder(tagPath);
    }

    /**
     * Read bookmarked status for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default false for read operations)
     * @returns Object with bookmarked status (true if bookmarked, false otherwise)
     */
    readBookmarkStatusOfFolder(
        tagPath: string,
        owner: boolean = false
    ): { bookmarked: boolean } {
        return this.orchestrator.readBookmarkStatusOfFolder(tagPath, owner);
    }

    /**
     * Add a file directly to a folder given the tagpath
     * 
     * @param tagPath - The tag path of the destination folder
     * @param filePath - The file path used to retrieve the FileLeaf
     * @returns Object with success status and error if failed
     */
    async addFileToTagpath(
        tagPath: string,
        filePath: string
    ): Promise<OperationResult> {
        return await this.orchestrator.addFileToTagpath(
            tagPath,
            filePath
        );
    }

    /**
     * Rename a file/folder given the tagpath, by triggering the Rename modal.
     * 
     * @param tagPath - The tag path of the destination folder
     * @param filePath - The file path used to retrieve the FileLeaf
     * @returns Object with success status and error if failed
     */
    async triggerRenameModal(
        type: 'folder' | 'file', 
        path: string, 
        parentpath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.triggerRenameModal(
            type,
            path,
            parentpath
        );
    }

    /**
     * Create a file/Folder given the tagpath, by triggering the New File modal.
     * 
     * @param type - The type of what is to be created
     * @param parentpath - The tag path of the parent folder
     * @returns Object with success status and error if failed
     */
    async triggerNewFileOrFolderModal(
        type: 'folder' | 'file', 
        parentpath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.triggerNewFileOrFolderModal(
            type,
            parentpath
        );
    }

    /**
     * Rename a file/folder given the tagpath, by triggering the Rename modal.
     * 
     * @param tagPath - The tag path of the destination folder
     * @param filePath - The file path used to retrieve the FileLeaf
     * @returns Object with success status and error if failed
     */
    async triggerDeleteModal(
        type: 'folder' | 'file', 
        path: string, 
        parentpath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.triggerDeleteModal(
            type,
            path,
            parentpath
        );
    }

    
    /**
     * Move a file/folder to a folder given source tagpath, by triggering the Move modal.
     * 
     * @param type - The type of the item passed in
     * @param path - The file path or tagpath of the item
     * @param parentPath - The tag path of parent folder
     * @returns Object with success status and error if failed
     */
    async triggerMoveModal(
        type: 'folder' | 'file', 
        path: string, 
        parentpath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.triggerMoveModal(
            type,
            path,
            parentpath
        );
    }
    
    /**
     * Copy a file/folder to a folder given source tagpath, by triggering the Move modal.
     * 
     * @param type - The type of the item passed in
     * @param path - The file path or tagpath of the item
     * @param parentPath - The tag path of parent folder
     * @returns Object with success status and error if failed
     */
    async triggerCopyModal(
        type: 'folder' | 'file', 
        path: string, 
        parentpath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.triggerCopyModal(
            type,
            path,
            parentpath
        );
    }

    /**
     * Add legend to a file/folder given source tagpath, by triggering the Legend modal.
     * 
     * @param type - The type of the item passed in
     * @param path - The file path or tagpath of the item
     * @param parentPath - The tag path of parent folder
     * @returns Object with success status and error if failed
     */
    async triggerLegendModal(
        type: 'folder' | 'file', 
        path: string, 
        parentpath: string,
        owner: boolean = true
    ): Promise<OperationResult> {
        return await this.orchestrator.triggerLegendModal(
            type,
            path,
            parentpath
        );
    }

    async revealFileInNavigation(filePath: string){
        await this.orchestrator.revealFileInNavigation(filePath)
    }


}
