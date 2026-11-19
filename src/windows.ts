import { App, TFile, WorkspaceLeaf } from "obsidian";




// The plugin hands over `app` in onload and clears it in onunload, so these helpers
// do not reach for a global.
let app: App | null = null;

export function initWindows(appInstance: App): void {
	app = appInstance;
}

export function disposeWindows(): void {
	app = null;
}

function requireApp(): App {
	if (!app) throw new Error("Tag Folder Explorer: windows helpers used before the plugin loaded.");
	return app;
}



export async function openFileInNewTab(pathToFile: string) {
    const app = requireApp();
 
     

    // Get the file from the vault using the path
    const file = app.vault.getAbstractFileByPath(pathToFile);
    
    // Check if the file exists and is a TFile (not a folder)
    if (file instanceof TFile) {
        // Open the file in a new tab without focusing it (background)
        await app.workspace.getLeaf('tab').openFile(file, { active: false });
        // await app.workspace.getLeaf('tab').openFile(file, { active: true });







        
    }
}

const VIEW_TYPE_TAG_EXPLORER = 'tag-explorer-view';

export async function openTagExplorerInNewTab(tagPath: string) {
    const app = requireApp();
    const normalizedPath = (tagPath ?? '').trim().replace(/^#/, '').replace(/^\/+|\/+$/g, '');

    const leaf = app.workspace.getLeaf('tab');
    await leaf.setViewState({
        type: VIEW_TYPE_TAG_EXPLORER,
        active: false,
        state: {
            currentPath: normalizedPath,
            backPaths: [],
            forwardPaths: []
        }
    });
}

export async function openRaindropInSidebar(raindropUrl: string) {
    const app = requireApp();
    
    const rightSplit = app.workspace.rightSplit;
    if (rightSplit && rightSplit.collapsed) {
        await rightSplit.expand();
    }

    const leaves = app.workspace.getLeavesOfType("webviewer");

    let targetLeaf: WorkspaceLeaf | null = null;

    for (const leaf of leaves) {
        const state = leaf.getViewState();

        const currentUrl = state?.state?.url;

        if (
            leaf.getRoot() === app.workspace.rightSplit && 
            typeof currentUrl === "string" &&
            currentUrl.includes("raindrop.io")
        ) {
            targetLeaf = leaf;
            break;
        }
    }

    if (targetLeaf) {
        await targetLeaf.setViewState({
            type: "webviewer",
            state: { url: raindropUrl }
        });

        app.workspace.setActiveLeaf(targetLeaf, { focus: true });
        return;
    }else{
        const newLeaf = app.workspace.getRightLeaf(false);
    
        if (newLeaf) {
            await newLeaf.setViewState({
                type: "webviewer",
                state: { url: raindropUrl }
            });
    
            app.workspace.setActiveLeaf(newLeaf, { focus: true });
        }
    }

    }
