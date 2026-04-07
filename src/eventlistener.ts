

import { App, Plugin, TAbstractFile, TFile, TFolder } from "obsidian";
import { Orchestrator } from "./orchestrator";

export class EventListener {
    private app: App;
    private plugin: Plugin;
    private orchestrator: Orchestrator;

    constructor(plugin: Plugin, orchestrator: Orchestrator) {
        this.plugin = plugin;
        this.app = plugin.app;
        this.orchestrator = orchestrator;
    }


    registerListeners(): void {
        this.plugin.registerEvent(
            this.app.vault.on("create", this.handleCreate.bind(this))
        );

        this.plugin.registerEvent(
            this.app.vault.on("rename", this.handleRename.bind(this))
        );

        this.plugin.registerEvent(
            this.app.vault.on("modify", this.handleModify.bind(this))
        );

        this.plugin.registerEvent(
            this.app.vault.on("delete", this.handleDelete.bind(this))
        );
    }


    private async handleCreate(file: TAbstractFile): Promise<void> {
        if (file instanceof TFolder) {
            return;
        }

        if (file instanceof TFile) {
            if (file.extension !== "md") {
                return;
            }

            console.log(`[Tag Folder Explorer] Detected file creation: ${file.path}`);
            await this.orchestrator.syncExternalFileCreation(file);
            
        }
    }


    private async handleRename(file: TAbstractFile, oldPath: string): Promise<void> {
        if (file instanceof TFolder) {
            return;
        }

        if (file instanceof TFile) {
            if (file.extension !== "md") {
                return;
            }

            console.log(`[Tag Folder Explorer] Detected file rename from ${oldPath} to ${file.path}`);
            
            // Route the file and old path to Orchestrator
            await this.orchestrator.syncExternalFileRename(file, oldPath);
        }
    }


    private async handleModify(file: TAbstractFile): Promise<void> {
        if (file instanceof TFolder) {
            return;
        }

        if (file instanceof TFile) {
            if (file.extension !== "md") {
                return;
            }
    
            console.log(`[Tag Folder Explorer] Detected file modification : ${file.path}`);
            await this.orchestrator.syncExternalFileModify(file);
            

        }
    }


    private async handleDelete(file: TAbstractFile): Promise<void> {
        if (file instanceof TFolder) {
            return;
        }

        if (file instanceof TFile) {
            if (file.extension !== "md") {
                return;
            }

            console.log(`[Tag Folder Explorer] Detected file deletion: ${file.path}`);
            
            await this.orchestrator.syncExternalFileDelete(file);
        }
    }









































    private async handleCreateTest(file: TAbstractFile): Promise<void> {
        if (file instanceof TFolder) {
            console.log("1.1 folder got created")
            return;
        }

        if (file instanceof TFile) {
            console.log("1.2 file got created")
            console.log(file.name)
            return;
        }
    }

    private async handleRenameTest(file: TAbstractFile): Promise<void> {
        if (file instanceof TFolder) {
            console.log("2.1 folder got renamed")
            return;
        }

        if (file instanceof TFile) {
            console.log("2.2 file got renamed")
            return;
        }
    }


    private async handleModifyTest(file: TAbstractFile): Promise<void> {
        if (file instanceof TFolder) {
            console.log("3.1 folder got modified")
            return;
        }

        if (file instanceof TFile) {
            console.log("3.2 file got modified")
            console.log(file.name)

            return;
        }
    }


    private async handleDeleteTest(file: TAbstractFile): Promise<void> {
        if (file instanceof TFolder) {
            console.log("4.1 folder got delted")
            return;
        }

        if (file instanceof TFile) {
            console.log("4.2 file got deleted")
            return;
        }
    }


}


