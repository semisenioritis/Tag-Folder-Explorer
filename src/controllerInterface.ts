import { TFile } from "obsidian";
import { Orchestrator } from "./orchestrator";

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
        folderTagPath: string,
        oldFileName: string,
        newFileName: string,
        filePath: string
    ): Promise<{ success: boolean; newPath?: string; error?: any }> {
        return await this.orchestrator.renameFile(folderTagPath, oldFileName, newFileName, filePath);
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
        fileName: string,
        filePath: string
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.removeFileFromFolder(folderTagPath, fileName, filePath);
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
    ): Promise<{ success: boolean; error?: any }> {
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
        fileName: string,
        filePath: string
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.moveFileToFolder(
            sourceFolderTagPath,
            destinationFolderTagPath,
            fileName,
            filePath
        );
    }

    /**
     * Copy file from one folder to another folder
     * 
     * @param sourceFolderTagPath - The tag path of the source folder
     * @param destinationFolderTagPath - The tag path of the destination folder
     * @param fileName - The file name
     * @param filePath - The file path
     * @returns Promise with success status and error if failed
     */
    async copyFileToFolder(
        sourceFolderTagPath: string,
        destinationFolderTagPath: string,
        fileName: string,
        filePath: string
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.copyFileToFolder(
            sourceFolderTagPath,
            destinationFolderTagPath,
            fileName,
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.updateFolderDescription(folderTagPath, jsonObject);
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
        currLegendColor: string,
        filePath: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.cycleLegendOfFile(currLegendColor, filePath, tagPath, owner);
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.removeLegendLockFromFile(legendColor, filePath, tagPath, owner);
    }

    /**
     * Read legend status for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @returns Object with color and lock status, or empty string if not found
     */
    readLegendStatusOfFile(
        filePath: string,
        tagPath: string
    ): { color: string; status: string } | { color: "" } {
        return this.orchestrator.readLegendStatusOfFile(filePath, tagPath);
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.removePinnedLockFromFile(filePath, tagPath, owner);
    }

    /**
     * Read pinned status for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @returns Object with pinned status, or pinned: false if not found
     */
    readPinnedStatusOfFile(
        filePath: string,
        tagPath: string
    ): { pinned: boolean; status?: string } {
        return this.orchestrator.readPinnedStatusOfFile(filePath, tagPath);
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.removePinnedLockFromFolder(tagPath, owner);
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.cycleBookmarkOfFile(filePath, tagPath, owner);
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
     * Add to bookmarked for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default true)
     * @returns Promise with success status and error if failed
     */
    async addBookmarkToFolder(
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.cycleBookmarkOfFolder(tagPath, owner);
    }

    /**
     * Read bookmarked status for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default false for read operations)
     * @returns Object with bookmarked status (true if bookmarked, false otherwise)
     */
    async readBookmarkStatusOfFolder(
        tagPath: string,
        owner: boolean = false
    ): Promise<{ bookmarked: boolean }> {
        return await this.orchestrator.readBookmarkStatusOfFolder(tagPath, owner);
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
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
        currLegendColor: string,
        tagPath: string,
        owner: boolean = true
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.cycleLegendForFolder(currLegendColor, tagPath, owner);
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
    ): Promise<{ success: boolean; error?: any }> {
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
    ): Promise<{ success: boolean; error?: any }> {
        return await this.orchestrator.removeLegendLockFromFolder(legendColor, tagPath, owner);
    }

    /**
     * Read legend status for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default false for read operations)
     * @returns Object with legend color and locked status
     */
    async readLegendStatusOfFolder(
        tagPath: string
    ): Promise<{ legend: string; locked: boolean }> {
        return await this.orchestrator.readLegendStatusOfFolder(tagPath);
    }

}
