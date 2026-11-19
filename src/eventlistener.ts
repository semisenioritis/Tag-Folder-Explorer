

import { App, Plugin, TAbstractFile, TFile, TFolder } from "obsidian";
import { Orchestrator } from "./orchestrator";
import { logger } from './utils/logger';

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

            logger.debug(`Detected file creation: ${file.path}`);
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

            logger.debug(`Detected file rename from ${oldPath} to ${file.path}`);
            
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
    
            logger.debug(`Detected file modification : ${file.path}`);
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

            logger.debug(`Detected file deletion: ${file.path}`);
            
            await this.orchestrator.syncExternalFileDelete(file);
        }
    }
}
