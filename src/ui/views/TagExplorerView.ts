import { ItemView, WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import TagExplorer from '../components/TagExplorer.svelte';
import type { ControllerInterface } from '../../api/controllerInterface';
import type { ModelInterface } from '../../api/modelInterface';
import type { TagFolderPluginSettings } from '../../settings';

export const VIEW_TYPE_TAG_EXPLORER = 'tag-explorer-view';

/**
 * What the view needs from the plugin. The view depends on this interface, not on the
 * plugin class, so `main.ts` and this file do not import each other.
 */
export interface ExplorerViewHost {
  settings: TagFolderPluginSettings;
  controller: ControllerInterface | null;
  model: ModelInterface | null;
  getTreeVersion(): number;
  addViewInstance(view: TagExplorerView): void;
  removeViewInstance(view: TagExplorerView): void;
}

export class TagExplorerView extends ItemView {
  component: ReturnType<typeof TagExplorer> | undefined;
  plugin: ExplorerViewHost;
  private currentTreeVersion: number = 0;
  // Stored state for persistence
  private savedState: {
    currentPath?: string;
    backPaths?: string[];
    forwardPaths?: string[];
  } = {};

  constructor(leaf: WorkspaceLeaf, plugin: ExplorerViewHost) { 
    super(leaf)
    this.plugin = plugin;
  }

  getViewType() { 
    return VIEW_TYPE_TAG_EXPLORER 
  }

  getDisplayText() { 
    return 'Tag Explorer' 
  }
  
  /**
   * Save the current view state for persistence
   */
  getState() {
    const navigationState = this.component?.getNavigationState?.() || {
      currentPath: "",
      backPaths: [],
      forwardPaths: []
    };

    return {
      ...super.getState(),
      currentPath: navigationState.currentPath || "",
      backPaths: navigationState.backPaths || [],
      forwardPaths: navigationState.forwardPaths || []
    };
  }
  
  /**
   * Restore the view state from saved data
   */
  async setState(state: any, result: any): Promise<void> {
    // Store the state to use when rendering
    this.savedState = {
      currentPath: state.currentPath || "",
      backPaths: state.backPaths || [],
      forwardPaths: state.forwardPaths || []
    };
    
    await super.setState(state, result);

    // Re-render the view if the state changes after the component is already mounted
    if (this.component) {
      unmount(this.component);
      this.component = undefined;
      this.renderView();
    }
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
    
    const snapshot = this.plugin.model?.getleftSidebarTree();
    
    if (snapshot?.tree) {
      this.updateTree(snapshot.tree, snapshot.version);
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
    
    if (this.component) {
        unmount(this.component);
        this.component = undefined;
    }
    
    // Get initial tree data with version
    const snapshot = this.plugin.model?.getleftSidebarTree();
    const treeData = snapshot?.tree;
    const version = snapshot?.version ?? 0;
    this.currentTreeVersion = version;
    
    this.component = mount(TagExplorer, {
      target: this.contentEl,
      props: {
        settings: this.plugin.settings,
        controller: this.plugin.controller,
        model: this.plugin.model,
        initialTreeData: treeData,
        initialCurrentPath: this.savedState.currentPath,
        initialBackPaths: this.savedState.backPaths,
        initialForwardPaths: this.savedState.forwardPaths,
        onNavigationChange: () => {
          // Request workspace to save layout when navigation changes
          this.app.workspace.requestSaveLayout();
        }
      }
    });
    
  }
  
  async onClose() {
    // Unregister this view from the plugin
    this.plugin.removeViewInstance(this);
    
    if (this.component) {
      unmount(this.component);
    }
  }
}
