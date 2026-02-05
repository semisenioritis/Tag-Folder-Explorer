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

import { 
	createNewFile, 
	createTagsFrontMatter, 
	hasFrontMatter,
	renameFile,
	readAllFileYaml,
	readSpecificYamlSection,
	extractAllTagsFromYaml, 
	extractAllTagsFromFileBody,
	readAllTagsFromFile,
	hasTag,
	hasTagAnywhere,
	removeTagFromFileYaml,
	removeTagFromFileBody,
	removeTagFromFile,
	addTagToFileYaml,
	replaceTagInFileYaml,
	replaceTagInFileBody,
	replaceTagInFile,
	shiftTagsFromBodyToMetadata,
	convertBodyTagsToYaml,
	deleteAllYaml,
	deleteSpecificYaml,
	addNewMetadataSection,
	replaceMetadataSection,
	appendMetadataSection,
	normalizeFrontmatter,
	checkIfTagIsValid
} from './fileEditor';




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



		// Test command for createNewFile
		this.addCommand({
			id: 'test-create-file',
			name: 'Test: Create new file',
			callback: async () => {
				try {
					const { success, file } = await createNewFile(this.app, "", 'TestFile');
					if (success && file) {
						console.log('✓ File created:', file.path);
					} else {
						console.log('✗ Failed to create file');
					}
				} catch (error) {
					console.error('Error creating file:', error);
				}
			}
		});

		// Test command for createFrontMatter
		this.addCommand({
			id: 'test-create-frontmatter',
			name: 'Test: Create frontmatter',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await createTagsFrontMatter(this.app, activeFile);
					console.log('Frontmatter creation result:', result);
				} catch (error) {
					console.error('Error creating frontmatter:', error);
				}
			}
		});

		// Test command for hasFrontMatter
		this.addCommand({
			id: 'test-has-frontmatter',
			name: 'Test: Check if has frontmatter',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await hasFrontMatter(this.app, activeFile);
					console.log('Has frontmatter:', result.hasFrontmatter);
				} catch (error) {
					console.error('Error checking frontmatter:', error);
				}
			}
		});

		// Test command for renameFile
		this.addCommand({
			id: 'test-rename-file',
			name: 'Test: Rename file',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await renameFile(this.app, activeFile, 'RenamedFile');
					console.log('Rename result:', result);
				} catch (error) {
					console.error('Error renaming file:', error);
				}
			}
		});

		// Test command for readAllFileYaml
		this.addCommand({
			id: 'test-read-all-yaml',
			name: 'Test: Read all YAML',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const yaml = await readAllFileYaml(this.app, activeFile);
					console.log('All YAML:', yaml);
				} catch (error) {
					console.error('Error reading YAML:', error);
				}
			}
		});

		// Test command for readSpecificYamlSection
		this.addCommand({
			id: 'test-read-specific-yaml',
			name: 'Test: Read specific YAML key (tags)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const value = await readSpecificYamlSection(this.app, activeFile, 'tags');
					console.log('Value for "tags" key:', value);
				} catch (error) {
					console.error('Error reading specific YAML:', error);
				}
			}
		});

		// Test command for extractAllTagsFromYaml
		this.addCommand({
			id: 'test-extract-yaml-tags',
			name: 'Test: Extract tags from YAML',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const tags = await extractAllTagsFromYaml(this.app, activeFile);
					console.log('Tags from YAML:', tags);
				} catch (error) {
					console.error('Error extracting tags from YAML:', error);
				}
			}
		});

		// Test command for extractAllTagsFromFileBody
		this.addCommand({
			id: 'test-extract-body-tags',
			name: 'Test: Extract tags from file body',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const tags = await extractAllTagsFromFileBody(this.app, activeFile);
					console.log('Tags from file body:', tags);
				} catch (error) {
					console.error('Error extracting tags from file body:', error);
				}
			}
		});

		// Test command for readAllTagsFromFile
		this.addCommand({
			id: 'test-read-all-tags',
			name: 'Test: Read all tags (YAML + body)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const tags = await readAllTagsFromFile(this.app, activeFile);
					console.log('All tags from file:', tags);
				} catch (error) {
					console.error('Error reading all tags:', error);
				}
			}
		});

		// Test command for hasTag
		this.addCommand({
			id: 'test-has-tag',
			name: 'Test: Check if has tag (test)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await hasTag(this.app, activeFile, 'done');
					console.log('Has tag "test":', result);
				} catch (error) {
					console.error('Error checking tag:', error);
				}
			}
		});

		// Test command for hasTagAnywhere
		this.addCommand({
			id: 'test-has-tag-anywhere',
			name: 'Test: Check if has tag anywhere (test)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await hasTagAnywhere(this.app, activeFile, 'done');
					console.log('Has tag "test" anywhere:', result);
				} catch (error) {
					console.error('Error checking tag anywhere:', error);
				}
			}
		});

		// Test command for removeTagFromFileYaml
		this.addCommand({
			id: 'test-remove-tag-yaml',
			name: 'Test: Remove tag from YAML (test)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await removeTagFromFileYaml(this.app, activeFile, 'done');
					console.log('Remove tag from YAML result:', result);
				} catch (error) {
					console.error('Error removing tag from YAML:', error);
				}
			}
		});

		// Test command for removeTagFromFileBody
		this.addCommand({
			id: 'test-remove-tag-body',
			name: 'Test: Remove tag from body (test)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await removeTagFromFileBody(this.app, activeFile, 'done');
					console.log('Remove tag from body result:', result);
				} catch (error) {
					console.error('Error removing tag from body:', error);
				}
			}
		});

		// Test command for removeTagFromFile
		this.addCommand({
			id: 'test-remove-tag-file',
			name: 'Test: Remove tag from file (test)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await removeTagFromFile(this.app, activeFile, 'done');
					console.log('Remove tag from file result:', result);
				} catch (error) {
					console.error('Error removing tag from file:', error);
				}
			}
		});

		// Test command for addTagToFileYaml
		this.addCommand({
			id: 'test-add-tag-yaml',
			name: 'Test: Add tag to YAML (test-tag)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await addTagToFileYaml(this.app, activeFile, 'donee');
					console.log('Add tag to YAML result:', result);
				} catch (error) {
					console.error('Error adding tag to YAML:', error);
				}
			}
		});

		// Test command for replaceTagInFileYaml
		this.addCommand({
			id: 'test-replace-tag-yaml',
			name: 'Test: Replace tag in YAML (test -> replaced)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await replaceTagInFileYaml(this.app, activeFile, 'done', 'replaced');
					console.log('Replace tag in YAML result:', result);
				} catch (error) {
					console.error('Error replacing tag in YAML:', error);
				}
			}
		});

		// Test command for replaceTagInFileBody
		this.addCommand({
			id: 'test-replace-tag-body',
			name: 'Test: Replace tag in body (test -> replaced)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await replaceTagInFileBody(this.app, activeFile, 'done', 'replaced');
					console.log('Replace tag in body result:', result);
				} catch (error) {
					console.error('Error replacing tag in body:', error);
				}
			}
		});

		// Test command for replaceTagInFile
		this.addCommand({
			id: 'test-replace-tag-file',
			name: 'Test: Replace tag in file (test -> replaced)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await replaceTagInFile(this.app, activeFile, 'done', 'replaced');
					console.log('Replace tag in file result:', result);
				} catch (error) {
					console.error('Error replacing tag in file:', error);
				}
			}
		});

		// Test command for shiftTagsFromBodyToMetadata
		this.addCommand({
			id: 'test-shift-tags-to-yaml',
			name: 'Test: Shift tags from body to YAML',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await shiftTagsFromBodyToMetadata(this.app, activeFile);
					console.log('Shift tags to YAML result:', result);
				} catch (error) {
					console.error('Error shifting tags to YAML:', error);
				}
			}
		});

		// Test command for convertBodyTagsToYaml
		this.addCommand({
			id: 'test-convert-body-tags',
			name: 'Test: Convert body tags to YAML',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await convertBodyTagsToYaml(this.app, activeFile);
					console.log('Convert body tags result:', result);
				} catch (error) {
					console.error('Error converting body tags:', error);
				}
			}
		});

		// Test command for deleteAllYaml
		this.addCommand({
			id: 'test-delete-all-yaml',
			name: 'Test: Delete all YAML',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await deleteAllYaml(this.app, activeFile);
					console.log('Delete all YAML result:', result);
				} catch (error) {
					console.error('Error deleting all YAML:', error);
				}
			}
		});

		// Test command for deleteSpecificYaml
		this.addCommand({
			id: 'test-delete-specific-yaml',
			name: 'Test: Delete specific YAML key (author)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await deleteSpecificYaml(this.app, activeFile, 'tags');
					console.log('Delete specific YAML result:', result);
				} catch (error) {
					console.error('Error deleting specific YAML:', error);
				}
			}
		});

		// Test command for addNewMetadataSection
		this.addCommand({
			id: 'test-add-metadata',
			name: 'Test: Add metadata (author, date)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await addNewMetadataSection(this.app, activeFile, {
						author: 'Test Author2',
						listlist:[ "hi", "bye"],
						date: new Date().toISOString().split('T')[0],
						// date3: new Date().toISOString().split('T')[0],
						date3: "2026-02-04",
						temp: "another test i am a test line",
						numnum4: "3",
						numnum: 4,
						date2: (() => { const iso = new Date().toISOString(); return iso.substring(0, iso.lastIndexOf(':')); })()
					});
					console.log('Add metadata result:', result);
				} catch (error) {
					console.error('Error adding metadata:', error);
				}
			}
		});
		// Test command for replaceMetadataSection
		this.addCommand({
			id: 'test-replace-metadata',
			name: 'Test: Replace metadata (author)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await replaceMetadataSection(this.app, activeFile, {
						author: 'Test Authoro',
						date: new Date().toISOString().split('T')[0],
						temp: "another test i am a test line",
						numnum: 3,
						listlist:[ "hi", "bye"],
						tags:[ "hi", "bye"],
						tag2s:[ 2, 3],
						date2: (() => { const iso = new Date().toISOString(); return iso.substring(0, iso.lastIndexOf(':')); })(),
						check: true

					});
					console.log('Replace metadata result:', result);
				} catch (error) {
					console.error('Error replacing metadata:', error);
				}
			}
		});

		// Test command for appendMetadataSection
		this.addCommand({
			id: 'test-append-metadata',
			name: 'Test: Append metadata (categories)',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await appendMetadataSection(this.app, activeFile, {
						author: 'Test Authoro',
						date: new Date().toISOString().split('T')[0],
						temp: "another test i am a test line",
						numnum: 3,
						listlist:[ "hi", "bye"],
						tags:[ "hi", "bye"],
						tag2s:[ 2, 3],
						date2: (() => { const iso = new Date().toISOString(); return iso.substring(0, iso.lastIndexOf(':')); })(),
						check: true
					});
					console.log('Append metadata result:', result);
				} catch (error) {
					console.error('Error appending metadata:', error);
				}
			}
		});

		// Test command for normalizeFrontmatter
		this.addCommand({
			id: 'test-normalize-frontmatter',
			name: 'Test: Normalize frontmatter',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					console.log('No active file');
					return;
				}
				try {
					const result = await normalizeFrontmatter(this.app, activeFile);
					console.log('Normalize frontmatter result:', result);
				} catch (error) {
					console.error('Error normalizing frontmatter:', error);
				}
			}
		});

		// Test command for checkIfTagIsValid
		this.addCommand({
			id: 'test-validate-tag',
			name: 'Test: Validate tag format',
			callback: () => {
				const testTags = [
					'#valid-tag',
					'valid/nested/tag',
					'#invalid tag',
					'tag//invalid',
					'/invalid',
					'invalid/',
					'',
					'#a/b/c/d'
				];
				
				console.log('Tag validation results:');
				testTags.forEach(tag => {
					const isValid = checkIfTagIsValid(tag);
					console.log(`"${tag}": ${isValid ? '✓ valid' : '✗ invalid'}`);
				});
			}
		});


  }

	/**
	 * Initializes the tag tree after the metadata cache is ready.
	 * This is called after both the layout and metadata cache are resolved.
	 */
	private initializeTree(): void {
		// Construct the tag tree structure
		this.treeRoot = new TreeRoot(this.app, this.settings);
		
		console.log('Tag tree constructed successfully (metadata cache resolved)');

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
