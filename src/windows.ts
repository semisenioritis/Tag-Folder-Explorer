import { App, TFile, WorkspaceLeaf } from "obsidian";




const app = (window as any).app as App;


// above is okish, but just to be type safe:
// here is a better solution with a custom interface

// interface ObsidianWindow extends Window {
//     app: App;
// }
//
// const app = (window as ObsidianWindow).app;



export async function openFileInNewTab(pathToFile: string) {
 
     

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
