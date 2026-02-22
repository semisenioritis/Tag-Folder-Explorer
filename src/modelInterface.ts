import type { TreeRoot } from './TreeRoot';
import { App, TFile } from "obsidian";
import type { ISerializedTagNode, ITagNode } from './interfaces'

import {metadataReadAllFrontmatter} from "./fileEditor";

let treeObj: TreeRoot | null = null;

let app: App | null = null;

/**
 * Initialize the model interface with a TreeRoot instance
 */
export function initModelInterface(treer: TreeRoot, app:App) {
    treeObj = treer;
    app = app

}

/**
 * Get the serialized tree structure for the left sidebar
 * Returns the complete tag tree with root tags and untagged files along with version
 */
export function getleftSidebarTree() {
    if (!treeObj) {
        return { 
            tree: { rootTags: [], untaggedFiles: [] },
            version: 0
        };
    }
    return {
        tree: treeObj.getSortedTree(),
        version: treeObj.getTreeVersion()
    };
}

/**
 * Get only the current tree version without the full tree data
 * Used for checking if a view needs to update
 */
export function getTreeVersion(): number {
    return treeObj?.getTreeVersion() ?? 0;
}








/**
 * Get data for the right sidebar (placeholder)
 */
export function getrightSidebarData(parentfolder: string, type: string, path: string) {


    
    // console.log("from inside modelInterface")
    // console.log(type)
    // console.log(path)

 

    if (type == 'folder'){
        const node = treeObj?.getNode(path);
        let foldermetadata = node?.readMeta()
        return foldermetadata
    }
    if (type =='file'){
        // console.log("from inside file")
        let filename = path.split("/").pop()?.replace(/\.[^/.]+$/, "") ?? "";
        const file = treeObj?.getFile(filename, path, parentfolder)
        let filenamestring = file?.getName()
        let filepathstring = file?.getPath()
        let filemetadata = file?.fileMetadata()
        let fileinitial = file?.readInitial()
        let fileobsdata = file?.fileObsCreateModDate()



        // console.log(filemetadata)
        // console.log(fileinitial)
        // console.log(fileobsdata)
        // console.log("++++++++")
        return {filemetadata, fileinitial, fileobsdata, filenamestring, filepathstring}


    }
    


    return treeObj;
}

/**
 * Get data for the main view (placeholder)
 */
export function getmainViewData(currpath: string): ISerializedTagNode | null {
 
    const node = treeObj?.getNode(currpath);
    return node ? node.serializeTagNode() : null;
    

}

export function getVaultName():string{
    if (!treeObj) {
        return '';
    }
    return treeObj.getApp().vault.getName();
}


    /**
     * Read legend status for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @returns Object with color and lock status, or empty string if not found
     */
export function readLegendStatusOfFile(
        filePath: string,
        tagPath: string
    ): { color: string; status: string }  {
        try {
            if (treeObj){
                // Extract fileleaf using filepath from fileleaf map
                const fileLeaf = treeObj.fileLeafRetriever(filePath);
                if (!fileLeaf) {
                    return { color: "" , status: "notlocked" };
                }

                // Extract file from fileleaf
                const tFile = fileLeaf.getTFile();
                if (!(tFile instanceof TFile)) {
                    return { color: "", status: "notlocked"  };
                }

                // Construct prefixed and locked tag paths
                const prefixedTagPath = `🏠/${tagPath}`;
                const lockedTagPath = `🔒/ ${tagPath}`;

                // Read file metadata
                const fileMetadata = fileLeaf.fileMetadata();
                if (!fileMetadata) {
                    return { color: "", status: "notlocked"  };
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
                return { color: "" , status: "notlocked" };
            }else{
                return { color: "" , status: "notlocked" };
            }
        } catch (error) {
            console.error("Error in readLegendStatus:", error);
            return { color: "" , status: "notlocked" };
        }
    }

    /**
     * Read legend status for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default false for read operations)
     * @returns Object with legend color and locked status
     */
export function readLegendStatusOfFolder(
        tagPath: string
    ): { legend: string; locked: boolean } {
        try {

            if (treeObj && app){
                // Extract tagnode using tagpath from tree
                const tagNode = treeObj.getNode(tagPath);
                if (!tagNode) {
                    return { legend: "", locked: false };
                }

                // Read tagnode metadata
                const metadata = metadataReadAllFrontmatter(app, tagPath);
                
                // Extract SelfLegend property
                const selfLegendValue = metadata ? metadata["SelfLegend"] : undefined;

                if (selfLegendValue) {
                    // legend = SelfLegend.legend
                    const legend = selfLegendValue.legend || "";
                    // locked = SelfLegend.locked
                    const locked = selfLegendValue.locked || false;

                    return { legend, locked };
                } else {
                    return { legend: "", locked: false };
                }
            }else{
                return { legend: "", locked: false }
            }
        } catch (error) {
            console.error("Error in readLegendStatusForFolder:", error);
            return { legend: "", locked: false };
        }
    }


    /**
     * Read pinned status for file in folder
     * 
     * @param filePath - The file path
     * @param tagPath - The tag path
     * @returns Object with pinned status, or pinned: false if not found
     */
export function readPinnedStatusOfFile(
        filePath: string,
        tagPath: string
    ): { pinned: boolean; status?: string } {
        try {
            if (treeObj){
                // Extract fileleaf using filepath from fileleaf map
                const fileLeaf = treeObj.fileLeafRetriever(filePath);
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
            } else {
                return { pinned: false };
            }
        } catch (error) {
            console.error("Error in readPinnedStatus:", error);
            return { pinned: false };
        }
    }

    /**
     * Read pinned status for folder
     * 
     * @param tagPath - The tag path
     * @returns Object with pinned and locked status
     */
export function readPinnedStatusOfFolder(
        tagPath: string
    ): { pinned: boolean; locked: boolean } {
        try {
            if (treeObj && app){
                // Extract tagnode using tagpath from tree
                const tagNode = treeObj.getNode(tagPath);
                if (!tagNode) {
                    return { pinned: false, locked: false };
                }

                // Read tagnode metadata
                const metadata = metadataReadAllFrontmatter(app, tagPath);
                
                // Extract Pinned property
                const pinnedProperty = metadata?.["Pinned"];
                
                if (!pinnedProperty) {
                    return { pinned: false, locked: false };
                }

                // Extract pinned and locked values
                const pinned = pinnedProperty.pinned === true;
                const locked = pinnedProperty.locked === true;

                return { pinned, locked };
            } else {
                return { pinned: false, locked: false };
            }
        } catch (error) {
            console.error("Error in readPinnedStatusForFolder:", error);
            return { pinned: false, locked: false };
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
export function readBookmarkStatusOfFile(
        filePath: string,
        tagPath: string,
        owner: boolean = false
    ): { bookmarked: boolean } {
        try {

            if (treeObj && app){
                // Extract fileleaf using filepath from fileleaf map
                const fileLeaf = treeObj.fileLeafRetriever(filePath);
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
            } else{
                return { bookmarked: false };
            }

        } catch (error) {
            console.error("Error in readBookmarkedStatus:", error);
            return { bookmarked: false };
        }
    }

    /**
     * Read bookmarked status for folder
     * 
     * @param tagPath - The tag path
     * @param owner - Whether this is an owner operation (default false for read operations)
     * @returns Object with bookmarked status (true if bookmarked, false otherwise)
     */
export function readBookmarkStatusOfFolder(
        tagPath: string,
        owner: boolean = false
    ): { bookmarked: boolean } {
        try {

            if (treeObj && app){
                // Extract tagnode using tagpath from tree
                const tagNode = treeObj.getNode(tagPath);
                if (!tagNode) {
                    return { bookmarked: false };
                }

                // Read tagnode metadata
                const metadata = metadataReadAllFrontmatter(app, tagPath);
                
                // Extract Bookmarked property
                const bookmarkedValue = metadata ? metadata["Bookmarked"] : undefined;

                // If Bookmarked property value is true, return true
                if (bookmarkedValue === true) {
                    return { bookmarked: true };
                } else {
                    // Else if Bookmarked property is false or not present return false
                    return { bookmarked: false };
                }
            }else{
                return { bookmarked: false }; 
            }

        } catch (error) {
            console.error("Error in readBookmarkedStatusForFolder:", error);
            return { bookmarked: false };
        }
    }

