import { Plugin, ItemView, WorkspaceLeaf } from 'obsidian'


import { TreeRoot } from './TreeRoot';


/*



**/



// Import the Counter Svelte component and the `mount` and `unmount` methods.

// step 1

import testsidebar from './svelte-components/dummy/test_sidebar.svelte';
import TagExplorer from './svelte-components/TagExplorer.svelte';

import { mount, unmount } from 'svelte';

 
import {initModelInterface} from './modelInterface'


import {DEFAULT_SETTINGS, TagFolderSettingTab} from "./settings";
import type {TagFolderPluginSettings} from "./settings";




const VIEW_TYPE_EXPLORER = 'explorer-view'
const VIEW_TYPE_TAG_EXPLORER = 'tag-explorer-view'




class ExplorerView extends ItemView {

  // step 2

  sidebar: ReturnType<typeof testsidebar> | undefined;


  constructor(leaf: WorkspaceLeaf) { super(leaf) }

  getViewType() { return VIEW_TYPE_EXPLORER }

  getDisplayText() { return 'Explorer view' }

 
  async onOpen() {
    this.renderView()
  }
  
  
  
  private renderView(){
    const c = this.contentEl
    c.empty()
    // c.createEl('h4', { text: 'Explorer view' })
	  // Attach the Svelte component to the ItemViews content element and provide the needed props.
    
    // step 3
    // this.counter = mount(Counter, {
    //   target: this.contentEl,
    //   props: {
    //     startCount: 5,
    //   }
    // });




    this.sidebar = mount(testsidebar, {
      target: this.contentEl
    });    
    console.log("sidebar mounted")
  }


  
  async onClose() {
    if (this.sidebar) {
      // Remove the Counter from the ItemView.
      unmount(this.sidebar);
    }


  }
}




class TagExplorerView extends ItemView {
  component: ReturnType<typeof TagExplorer> | undefined;
  plugin: TagFolderPlugin;
  private currentTreeVersion: number = 0;
  // in the future we can maintain a currentPath variable inside the tagexplorerview itself instead of storing it inside the state. 
  // that way when we want to upgrade the lazy update to happen only on those who need it, this can come handy
  // private currentPath: string = "";

  constructor(leaf: WorkspaceLeaf, plugin: TagFolderPlugin) { 
    super(leaf)
    this.plugin = plugin;
  }

  getViewType() { 
    return VIEW_TYPE_TAG_EXPLORER 
  }

  getDisplayText() { 
    return 'Tag Explorer' 
  }

  async onOpen() {
    // Register this view with the plugin
    this.plugin.addViewInstance(this);
    
    // Listen for when this view becomes active
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf) => {
        if (leaf === this.leaf) {
          this.onViewBecameActive();
        }
      })
    );
    
    this.renderView()
  }
  
  /**
   * Called when this view becomes the active view
   * Checks if tree version has changed and updates if necessary
   */
  private onViewBecameActive(): void {
    const currentBackendVersion = this.plugin.getTreeVersion();
    
    // Only fetch new tree if version has changed
    if (this.currentTreeVersion !== currentBackendVersion) {
      this.refreshTree();
    }
  }
  
  /**
   * Refresh the tree from the backend
   */
  private refreshTree(): void {
    if (!this.component) return;
    
    const treeData = this.plugin.treeRoot?.getSortedTree();
    const version = this.plugin.getTreeVersion();
    
    if (treeData) {
      this.updateTree(treeData, version);
    }
  }
  
  /**
   * Update the tree with new data and version
   * Called by the plugin when broadcasting updates
   * Also refreshes the current node in the main view
   * 
   * @param treeData - The serialized tree data
   * @param version - The tree version number
   */
  updateTree(treeData: unknown, version: number): void {
    this.currentTreeVersion = version;
    
    if (this.component) {
      // Update the Svelte component with new tree data and trigger node refresh
      this.component.updateTreeData?.(treeData, version);
      this.component.refreshCurrentNode?.();
    }
  }
  

  private renderView() {
    const c = this.contentEl
    c.empty()
    
    // Get initial tree data with version
    const treeData = this.plugin.treeRoot?.getSortedTree();
    const version = this.plugin.getTreeVersion();
    this.currentTreeVersion = version;
    
    this.component = mount(TagExplorer, {
      target: this.contentEl,
      props: {
        settings: this.plugin.settings,
        initialTreeData: treeData,
        initialVersion: version
      }
    });
    
    console.log("Tag Explorer mounted with version:", version)
  }
  
  async onClose() {
    // Unregister this view from the plugin
    this.plugin.removeViewInstance(this);
    
    if (this.component) {
      unmount(this.component);
    }
  }
}


export default class TagFolderPlugin extends Plugin {

	settings: TagFolderPluginSettings = DEFAULT_SETTINGS;


	treeRoot: TreeRoot | null = null;
	
	/**
	 * Track all active TagExplorerView instances for broadcasting updates.
	 * Views are added in onOpen() and removed in onClose().
	 */
	private activeViews: Set<TagExplorerView> = new Set();

 


  async onload() {

    await this.loadSettings();

		console.log('Tag Folder Plugin loaded');

    this.registerView(VIEW_TYPE_EXPLORER, leaf => new ExplorerView(leaf))
    this.registerView(VIEW_TYPE_TAG_EXPLORER, leaf => new TagExplorerView(leaf, this))

		// Wait for the metadata cache to be fully resolved before computing the tree
		// The metadata cache is populated asynchronously after vault load,
		// so we need to wait for it to be ready before building the tag tree
		this.app.workspace.onLayoutReady(() => {
			// Check if metadata cache is already resolved
			if (this.app.metadataCache.resolvedLinks) {
				this.initializeTree();
			} else {
				// Wait for the metadata cache to finish resolving
				const resolveRef = this.app.metadataCache.on('resolved', () => {
					this.initializeTree();
					this.app.metadataCache.offref(resolveRef);
				});
				this.registerEvent(resolveRef);
			}
		});


    this.addRibbonIcon('dice', 'Open Explorer', () => this.activateView())
    this.addRibbonIcon('folder-tree', 'Open Tag Explorer', () => this.activateTagExplorerView())

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TagFolderSettingTab(this.app, this));

		// Register commands for testing controller interface functions
		this.registerTestCommands();


  }

	/**
	 * Initializes the tag tree after the metadata cache is ready.
	 * This is called after both the layout and metadata cache are resolved.
	 */
	private initializeTree(): void {
		// Construct the tag tree structure
		this.treeRoot = new TreeRoot(this.app, this.settings);
		
		console.log('Tag tree constructed successfully (metadata cache resolved)');
    console.log(this.treeRoot)
		initModelInterface(this.treeRoot);

		const temp = this.treeRoot.getSortedTree();
		console.log(temp);

    
		
		// Note: Initial tree construction doesn't broadcast since no views exist yet
		// When tree is modified later (e.g., by orchestrator), call this.broadcastTreeUpdate()
	}

  async activateView() {
    const w = this.app.workspace
    
    let leaf = w.getLeaf(true)
    await leaf.setViewState({ type: VIEW_TYPE_EXPLORER, active: true })
    
    w.revealLeaf(leaf)
  }



  async activateTagExplorerView() {
    const w = this.app.workspace
    let leaf = w.getLeaf(true)
    await leaf.setViewState({ type: VIEW_TYPE_TAG_EXPLORER, active: true })
    w.revealLeaf(leaf)
  }
  
  /**
   * Register a TagExplorerView instance with the plugin for tracking
   * 
   * @param view - The TagExplorerView instance to register
   */
  addViewInstance(view: TagExplorerView): void {
    this.activeViews.add(view);
  }
  
  /**
   * Unregister a TagExplorerView instance from the plugin
   * 
   * @param view - The TagExplorerView instance to unregister
   */
  removeViewInstance(view: TagExplorerView): void {
    this.activeViews.delete(view);
  }
  
  /**
   * Get the current tree version from the TreeRoot
   * 
   * @returns number - The current tree version counter
   */
  getTreeVersion(): number {

 
    // let counter_temp = 0 
    // this.activeViews.forEach(view => {
    //   // Check if the view is a TagExplorerView and its container element is visible in the UI
    //   if (view instanceof TagExplorerView && view.containerEl.isShown()) {
    //     counter_temp += 1
    //   }
    // });

    // console.log("number of active views with my plugin leaf:", counter_temp)



    return this.treeRoot?.getTreeVersion() ?? 0;

  }
  
  /**
   * Broadcast tree updates to all currently active (visible) views
   * 
   * Only views that are visible in the UI will receive the update.
   * This implements lazy updating for better performance.
   */
  broadcastTreeUpdate(): void {
    if (!this.treeRoot) return;
    
    const serializedTree = this.treeRoot.getSortedTree();
    const version = this.treeRoot.getTreeVersion();
    
    // Broadcast to all active views that are currently visible
    this.activeViews.forEach(view => {
      // Check if the view is a TagExplorerView and its container element is visible in the UI
      if (view instanceof TagExplorerView && view.containerEl.isShown()) {
        view.updateTree(serializedTree, version);
        // console.log("Broadcasted tree update to view with version:", version);
      }
    });
  }

  	/**
	 * Register test commands for all controller interface functions
	 */
	private registerTestCommands(): void {
		const controller = this.treeRoot?.getControllerInterface(this);
		if (!controller) return;

		// Note to run commands: Open command palette (Ctrl+P or Cmd+P) and search for "Test:"

		this.addCommand({
			id: 'test-create-file',
			name: 'Test: Create file in tag folder',
			callback: async () => {
				const result = await controller.createFileInTagFolder('test/folder', 'TestFile');
				console.log('Create file result:', result);
			}
		});

		this.addCommand({
			id: 'test-rename-file',
			name: 'Test: Rename file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.renameFile('test/folder', activeFile.basename, 'NewName', activeFile.path);
					console.log('Rename file result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-remove-file-from-folder',
			name: 'Test: Remove file from folder',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.removeFileFromFolder('test/folder', activeFile.basename, activeFile.path);
					console.log('Remove file result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-hard-delete-file',
			name: 'Test: Hard delete file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.hardDeleteFile('test/folder', activeFile.basename, activeFile.path);
					console.log('Hard delete result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-move-file',
			name: 'Test: Move file to folder',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.moveFileToFolder('source/folder', 'dest/folder', activeFile.basename, activeFile.path);
					console.log('Move file result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-copy-file',
			name: 'Test: Copy file to folder',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.copyFileToFolder('source/folder', 'dest/folder', activeFile.basename, activeFile.path);
					console.log('Copy file result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-create-folder',
			name: 'Test: Create folder in folder',
			callback: async () => {
				const result = await controller.createFolderInFolder('parent/folder', 'NewFolder');
				console.log('Create folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-rename-folder',
			name: 'Test: Rename folder',
			callback: async () => {
				const result = await controller.renameFolder('test/folder', 'RenamedFolder');
				console.log('Rename folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-remove-folder',
			name: 'Test: Remove folder from folder',
			callback: async () => {
				const result = await controller.removeFolderFromFolder('child/folder');
				console.log('Remove folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-move-folder',
			name: 'Test: Move folder to folder',
			callback: async () => {
				const result = await controller.moveFolderToFolder('source/parent', 'dest/parent', 'source/parent/child');
				console.log('Move folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-duplicate-folder',
			name: 'Test: Duplicate folder',
			callback: async () => {
				const result = await controller.duplicateFolder('test/folder');
				console.log('Duplicate folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-recreate-folder',
			name: 'Test: Recreate folder',
			callback: async () => {
				const result = await controller.recreateFolder('source/folder', 'dest/parent');
				console.log('Recreate folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-update-folder-description',
			name: 'Test: Update folder description',
			callback: async () => {
				const result = await controller.updateFolderDescription('test/folder', { description: 'Test description' });
				console.log('Update folder description result:', result);
			}
		});

		this.addCommand({
			id: 'test-update-folder-legend',
			name: 'Test: Update folder legend',
			callback: async () => {
				const result = await controller.updateFolderLegend('test/folder', { legend: 'red' });
				console.log('Update folder legend result:', result);
			}
		});

		this.addCommand({
			id: 'test-update-file-description',
			name: 'Test: Update file description',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.updateFileDescription('test/folder', activeFile.path, { description: 'File description' });
					console.log('Update file description result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-copy-files-folders',
			name: 'Test: Copy files and folders',
			callback: async () => {
				const result = await controller.copyFilesAndFolders(['file1.md'], ['folder1'], 'parent');
				console.log('Copy files and folders result:', result);
			}
		});

		this.addCommand({
			id: 'test-cut-files-folders',
			name: 'Test: Cut files and folders',
			callback: async () => {
				const result = await controller.cutFilesAndFolders(['file1.md'], ['folder1'], 'parent');
				console.log('Cut files and folders result:', result);
			}
		});

		this.addCommand({
			id: 'test-paste-files-folders',
			name: 'Test: Paste files and folders',
			callback: async () => {
				const result = await controller.pasteFilesAndFolders('dest/folder', false);
				console.log('Paste files and folders result:', result);
			}
		});

		this.addCommand({
			id: 'test-add-legend-to-file',
			name: 'Test: Add legend to file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.addLegendToFile('red', activeFile.path, 'test/folder');
					console.log('Add legend to file result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-remove-legend-from-file',
			name: 'Test: Remove legend from file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.removeLegendFromFile('red', activeFile.path, 'test/folder');
					console.log('Remove legend from file result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-cycle-legend-file',
			name: 'Test: Cycle legend of file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.cycleLegendOfFile('red', activeFile.path, 'test/folder');
					console.log('Cycle legend result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-add-lock-legend-file',
			name: 'Test: Add lock legend to file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.addLockLegendToFile('red', activeFile.path, 'test/folder');
					console.log('Add lock legend result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-remove-legend-lock-file',
			name: 'Test: Remove legend lock from file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.removeLegendLockFromFile('red', activeFile.path, 'test/folder');
					console.log('Remove legend lock result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-read-legend-status-file',
			name: 'Test: Read legend status of file',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = controller.readLegendStatusOfFile(activeFile.path, 'test/folder');
					console.log('Legend status:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-add-pinned-to-file',
			name: 'Test: Add pinned to file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.addPinnedToFile(activeFile.path, 'test/folder');
					console.log('Add pinned result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-remove-pinned-from-file',
			name: 'Test: Remove pinned from file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.removePinnedFromFile(activeFile.path, 'test/folder');
					console.log('Remove pinned result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-cycle-pinned-file',
			name: 'Test: Cycle pinned of file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.cyclePinnedOfFile(activeFile.path, 'test/folder');
					console.log('Cycle pinned result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-add-pinned-lock-file',
			name: 'Test: Add pinned lock to file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.addPinnedLockToFile(activeFile.path, 'test/folder');
					console.log('Add pinned lock result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-remove-pinned-lock-file',
			name: 'Test: Remove pinned lock from file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.removePinnedLockFromFile(activeFile.path, 'test/folder');
					console.log('Remove pinned lock result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-read-pinned-status-file',
			name: 'Test: Read pinned status of file',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = controller.readPinnedStatusOfFile(activeFile.path, 'test/folder');
					console.log('Pinned status:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-add-pinned-to-folder',
			name: 'Test: Add pinned to folder',
			callback: async () => {
				const result = await controller.addPinnedToFolder('test/folder');
				console.log('Add pinned to folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-remove-pinned-from-folder',
			name: 'Test: Remove pinned from folder',
			callback: async () => {
				const result = await controller.removePinnedFromFolder('test/folder');
				console.log('Remove pinned from folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-cycle-pinned-folder',
			name: 'Test: Cycle pinned of folder',
			callback: async () => {
				const result = await controller.cyclePinnedOfFolder('test/folder');
				console.log('Cycle pinned folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-add-pinned-lock-folder',
			name: 'Test: Add pinned lock to folder',
			callback: async () => {
				const result = await controller.addPinnedLockToFolder('test/folder');
				console.log('Add pinned lock to folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-remove-pinned-lock-folder',
			name: 'Test: Remove pinned lock from folder',
			callback: async () => {
				const result = await controller.removePinnedLockFromFolder('test/folder');
				console.log('Remove pinned lock from folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-read-pinned-status-folder',
			name: 'Test: Read pinned status of folder',
			callback: () => {
				const result = controller.readPinnedStatusOfFolder('test/folder');
				console.log('Folder pinned status:', result);
			}
		});

		this.addCommand({
			id: 'test-add-bookmark-to-file',
			name: 'Test: Add bookmark to file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.addBookmarkToFile(activeFile.path, 'test/folder');
					console.log('Add bookmark to file result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-remove-bookmark-from-file',
			name: 'Test: Remove bookmark from file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.removeBookmarkFromFile(activeFile.path, 'test/folder');
					console.log('Remove bookmark from file result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-cycle-bookmark-file',
			name: 'Test: Cycle bookmark of file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.cycleBookmarkOfFile(activeFile.path, 'test/folder');
					console.log('Cycle bookmark result:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-read-bookmark-status-file',
			name: 'Test: Read bookmark status of file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const result = await controller.readBookmarkStatusOfFile(activeFile.path, 'test/folder');
					console.log('File bookmark status:', result);
				}
			}
		});

		this.addCommand({
			id: 'test-add-bookmark-to-folder',
			name: 'Test: Add bookmark to folder',
			callback: async () => {
				const result = await controller.addBookmarkToFolder('test/folder');
				console.log('Add bookmark to folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-remove-bookmark-from-folder',
			name: 'Test: Remove bookmark from folder',
			callback: async () => {
				const result = await controller.removeBookmarkFromFolder('test/folder');
				console.log('Remove bookmark from folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-cycle-bookmark-folder',
			name: 'Test: Cycle bookmark of folder',
			callback: async () => {
				const result = await controller.cycleBookmarkOfFolder('test/folder');
				console.log('Cycle bookmark folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-read-bookmark-status-folder',
			name: 'Test: Read bookmark status of folder',
			callback: async () => {
				const result = await controller.readBookmarkStatusOfFolder('test/folder');
				console.log('Folder bookmark status:', result);
			}
		});

		this.addCommand({
			id: 'test-add-legend-to-folder',
			name: 'Test: Add legend to folder',
			callback: async () => {
				const result = await controller.addLegendToFolder('red', 'test/folder');
				console.log('Add legend to folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-remove-legend-from-folder',
			name: 'Test: Remove legend from folder',
			callback: async () => {
				const result = await controller.removeLegendFromFolder('test/folder');
				console.log('Remove legend from folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-cycle-legend-folder',
			name: 'Test: Cycle legend for folder',
			callback: async () => {
				const result = await controller.cycleLegendForFolder('red', 'test/folder');
				console.log('Cycle legend folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-add-locked-legend-folder',
			name: 'Test: Add locked legend to folder',
			callback: async () => {
				const result = await controller.addLockedLegendToFolder('red', 'test/folder');
				console.log('Add locked legend to folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-remove-locked-legend-folder',
			name: 'Test: Remove locked legend from folder',
			callback: async () => {
				const result = await controller.removeLockedLegendFromFolder('red', 'test/folder');
				console.log('Remove locked legend from folder result:', result);
			}
		});

		this.addCommand({
			id: 'test-read-legend-status-folder',
			name: 'Test: Read legend status for folder',
			callback: async () => {
				const result = await controller.readLegendStatusOfFolder('test/folder');
				console.log('Folder legend status:', result);
			}
		});
	}
	onunload() {
		console.log('Tag Folder Plugin unloaded');
		
		// Clean up the tree reference
		this.treeRoot = null;
    

    
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<TagFolderPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}  

}
