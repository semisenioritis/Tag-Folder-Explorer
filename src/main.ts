import { Plugin } from 'obsidian'


import { TreeRoot } from './core/TreeRoot';
import { ControllerInterface } from './api/controllerInterface';
import { ModelInterface } from './api/modelInterface';
import { Orchestrator } from './orchestration/orchestrator';
import { EventListener } from './orchestration/EventListener';
import {shiftTagsFromBodyToMetadata} from "./orchestration/fileEditor";


import { TagExplorerView, VIEW_TYPE_TAG_EXPLORER } from './ui/views/TagExplorerView';

 


import {DEFAULT_SETTINGS, TagFolderSettingTab} from "./settings";
import { logger, setDebugLogging } from "./utils/logger";
import type { PluginHost } from "./types/common";
import { inconsistencyFlag } from "./ui/store";
import { initWindows, disposeWindows } from "./ui/windows";
import type {TagFolderPluginSettings} from "./settings";








export default class TagFolderPlugin extends Plugin implements PluginHost {

	settings: TagFolderPluginSettings = DEFAULT_SETTINGS;
  private readonly HIDE_OBSIDIAN_METADATA_CLASS = 'tag-folder-hide-metadata';
	
  /**
   * Shared runtime flag for all Tag Explorer view instances.
   * This is process-wide state for this plugin instance (per vault session).
   * It indicates if any tree/system is in an inconsistent state. 
   * Each function reads this flag before it proceeds.
   * If the flag is false, it proceeds.
   * It first makes the flag true, ensureing that it is locked.
   * Then it completes its own function.
   * Once it is done or it encounters an error and is about to return, it resets the flag to false
   * This prevents race conditions. 
   */
  private tagExplorerInconsistentState: boolean = false;


	treeRoot: TreeRoot | null = null;
	controller: ControllerInterface | null = null;
  model: ModelInterface | null = null;
	
	/**
	 * Track all active TagExplorerView instances for broadcasting updates.
	 * Views are added in onOpen() and removed in onClose().
	 */
	private activeViews: Set<TagExplorerView> = new Set();

 


  async onload() {

    await this.loadSettings();
    initWindows(this.app);
    this.applyObsMetadataVisibility();

		logger.debug('Tag Folder Plugin loaded');

    this.registerView(VIEW_TYPE_TAG_EXPLORER, leaf => new TagExplorerView(leaf, this))

		// Wait for the metadata cache to be fully resolved before computing the tree
		// The metadata cache is populated asynchronously after vault load,
		// so we need to wait for it to be ready before building the tag tree
		this.app.workspace.onLayoutReady(async () => {
			// Check if metadata cache is already resolved
			if (this.app.metadataCache.resolvedLinks) {
				await this.initializeTree();
			} else {
				// Wait for the metadata cache to finish resolving
				const resolveRef = this.app.metadataCache.on('resolved', async () => {
					await this.initializeTree();
					this.app.metadataCache.offref(resolveRef);
				});
				this.registerEvent(resolveRef);
			}
		});


    this.addRibbonIcon('folder-tree', 'Open Tag Explorer', () => this.activateTagExplorerView())

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TagFolderSettingTab(this.app, this));


    this.addCommand({
        id: 'pull-tags-into-frontmatter',
        name: 'Pull all tags from body into metadata',
        callback: async() => {

          const activeFile = this.app.workspace.getActiveFile();
          if (!activeFile) {
              logger.warn('No active file');
              return;
          }

          shiftTagsFromBodyToMetadata(this.app, activeFile)


        },
    });

    this.addCommand({
      id: 'launch-tag-file-explorer',
      name: 'Launch Tag File Explorer',
      callback: () => {
        this.activateTagExplorerView()
      },

    });

  }

	/**
	 * Initializes the tag tree after the metadata cache is ready.
	 * This is called after both the layout and metadata cache are resolved.
	 */
	private async initializeTree(): Promise<void> {
		// Construct the tag tree structure
		this.treeRoot = await TreeRoot.create(this.app, this.settings);
		
		// Initialize controller interface for frontend access
		const orchestrator = new Orchestrator(this.app, this.treeRoot, this, (busy) => inconsistencyFlag.set(busy));
		this.controller = new ControllerInterface(orchestrator);
		
		logger.debug('Tag tree constructed successfully (metadata cache resolved)');

    this.model = new ModelInterface(this.treeRoot, this.app)

    // Register event listeners for external file changes
    const eventListener = new EventListener(this, orchestrator);
    eventListener.registerListeners();

    
		
		// Note: Initial tree construction doesn't broadcast since no views exist yet
		// When tree is modified later (e.g., by orchestrator), call this.broadcastTreeUpdate()
	}

  async activateTagExplorerView() {
    const w = this.app.workspace
    let leaf = w.getLeaf(true)
    await leaf.setViewState({ type: VIEW_TYPE_TAG_EXPLORER, active: true })
    w.revealLeaf(leaf)

  }

  /**
   * Read the shared Tag Explorer flag.
   */
  getTagExplorerInconsistentStateFlag(): boolean {
    return this.tagExplorerInconsistentState;
  }

  /**
   * Update the shared Tag Explorer flag.
   */
  setTagExplorerInconsistentStateFlag(value: boolean): void {
    this.tagExplorerInconsistentState = value;
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
      }
    });
  }

	onunload() {
		logger.debug('Tag Folder Plugin unloaded');
    document.body.classList.remove(this.HIDE_OBSIDIAN_METADATA_CLASS);
    disposeWindows();
		
		// Clean up the tree reference
		this.treeRoot = null;
		this.controller = null;
    this.model = null;
    

    
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<TagFolderPluginSettings>);
		setDebugLogging(this.settings.debugLogging);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		setDebugLogging(this.settings.debugLogging);
    this.applyObsMetadataVisibility();
	}  

  private applyObsMetadataVisibility(): void {
    if (this.settings.showObsMetaData) {
      document.body.classList.remove(this.HIDE_OBSIDIAN_METADATA_CLASS);
      return;
    }

    document.body.classList.add(this.HIDE_OBSIDIAN_METADATA_CLASS);
  }

}
