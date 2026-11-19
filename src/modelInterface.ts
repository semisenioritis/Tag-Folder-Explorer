import type { TreeRoot } from './TreeRoot';
import { App } from "obsidian";
import type { ISerializedTagNode } from './interfaces'



export class ModelInterface {

    private treeObj: TreeRoot ;
    private app: App ;


    constructor(param_treeobj: TreeRoot, param_app: App ){
        this.treeObj = param_treeobj
        this.app = param_app
    }


    /**
     * Get the serialized tree structure for the left sidebar
     * Returns the complete tag tree with root tags and untagged files along with version
     */
    getleftSidebarTree(sortFlag: boolean = true) {
        if (!this.treeObj) {
            return { 
                tree: { rootTags: [], untaggedFiles: [] },
                version: 0
            };
        }
        return {
            tree: this.treeObj.getSortedTree(sortFlag),
            version: this.treeObj.getTreeVersion()
        };
    }



    /**
     * Get data for the right sidebar (placeholder)
     */
    async getrightSidebarData(parentfolder: string, type: string, path: string) {


        

    

        if (type == 'folder'){
            const node = this.treeObj?.getNode(path);
            let foldermetadata = node?.readMeta()
            return foldermetadata
        }
        if (type =='file'){
            let filename = path.split("/").pop()?.replace(/\.[^/.]+$/, "") ?? "";
            const file = this.treeObj?.getFile(filename, path, parentfolder)
            let filenamestring = file?.getName()
            let filepathstring = file?.getPath()
            let filemetadata = await file?.fileMetadata()
            let fileinitial = await file?.readInitial()
            let fileobsdata = file?.fileObsCreateModDate()



            return {filemetadata, fileinitial, fileobsdata, filenamestring, filepathstring}
        }
        return this.treeObj;
    }


    /**
     * Get data for the main view (placeholder)
     */
    getmainViewData(currpath: string, sortFlag: boolean): ISerializedTagNode | null {
    
        const node = this.treeObj?.getNode(currpath);
        return node ? node.serializeTagNode(sortFlag) : null;
        

    }

    getVaultName():string{
        if (!this.treeObj) {
            return '';
        }
        return this.treeObj.getApp().vault.getName();
    }


    /**
     * Check whether a tag path exists in the current tree.
     * Uses TreeRoot.getNode() directly for a lightweight existence lookup.
     *
     * @param tagPath - The tag path to check (e.g., "subject/math")
     * @returns boolean - true if node exists, false otherwise
     */
    doesTagPathExist(tagPath: string): boolean {
        if (!this.treeObj) {
            return false;
        }

        const normalizedPath = (tagPath ?? '').trim().replace(/^\/+|\/+$/g, '');
        const node = this.treeObj.getNode(normalizedPath);
        return node !== null;
    }


    async getDetailedViewData(parentfolder: string, type: string, path: string){

        if (type == 'folder'){
            const node = this.treeObj?.getNode(path);
            let foldermetadata = node?.readMeta()
            return foldermetadata
        }
        if (type =='file'){
            let filename = path.split("/").pop()?.replace(/\.[^/.]+$/, "") ?? "";
            const file = this.treeObj?.getFile(filename, path, parentfolder)
            let filepathstring = file?.getPath()
            let filemetadata = await file?.fileMetadata()
            let fileinitial = await file?.readInitial()
            let fileobsdata = file?.fileObsCreateModDate()

            return {filemetadata, fileinitial, fileobsdata, filepathstring}
        }
    }
}

