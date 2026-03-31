<script lang="ts">
  // import { getleftSidebarTree} from '../modelInterface'

  import { openFileInNewTab } from '../windows'
  import type { ControllerInterface } from '../controllerInterface';
  import type { ModelInterface } from '../modelInterface';

  // Props
  interface Props {
    currentPath: string;
    onUpdate: (newPath: string) => void;  // Add function signature
    onFocusChange?: (type: 'folder' | 'file', path: string, parentpath: string) => void;  // Handler for focus changes
    initialTreeData?: unknown;
    initialVersion?: number;
    controller: ControllerInterface | null | undefined;
    model: ModelInterface | null | undefined;
    onItemDrop: (sourceType: 'folder' | 'file', sourcePath: string, sourceParentPath: string, targetType: 'folder', targetPath: string, targetParentPath: string) => void;
  }
  
  // Type definitions
  interface FileData {
    name: string;
    path: string;
    tagpath: string;
  }

  interface TagNodeData {
    name: string;
    path: string;
    parentPath: string;
    children: TagNodeData[];
    files: FileData[];
    totalFileCount: number;
  }

  interface TreeData {
    rootTags: TagNodeData[];
    untaggedFiles: FileData[];
  }

  let { currentPath, onUpdate, onFocusChange, initialTreeData, initialVersion = 0, controller, model, onItemDrop }:Props = $props();
  
  if (!model) {
      throw new Error("model is not initialized");
  }

  // State - Initialize with provided data or fetch from backend
  let treeData = $state<TreeData>(
    initialTreeData 
      ? (initialTreeData as TreeData) 
      : (model.getleftSidebarTree().tree as TreeData)
  );
  // console.log("test")
  // console.log(treeData) 
  // console.log($state.snapshot(treeData));
  // $inspect(treeData)
  let treeVersion = $state<number>(initialVersion);
  let expandedTags = $state<Set<string>>(new Set())
  const ROOT_TAGS_NODE_PATH = '__root_tags__';

  /**
   * Update tree data - called when the backend broadcasts an update
   */
  export function updateTreeData(newTreeData: unknown, newVersion: number): void {
    treeData = newTreeData as TreeData;
    treeVersion = newVersion;
    console.log("TagTreeView updated to version:", newVersion);
  }


  function toggleTag(path: string) {
    if (expandedTags.has(path)) {
      expandedTags.delete(path);
    } else {
      expandedTags.add(path);
    }
    expandedTags = new Set(expandedTags); // trigger reactivity
  }


  function isExpanded(path: string): boolean {
    return expandedTags.has(path);
  }

  function handleFolderClick(folder:string, parentPath: string = '') {

 
    let folderpath = folder
		// console.log('Folder clicked!');
    // console.log(foldername+" "+folderpath)

    onUpdate(folderpath);

    if (onFocusChange) {
      onFocusChange('folder', folderpath, parentPath);
    } 

	}

  function handleFileClick(file:string, parentPath: string = '') {

		// console.log('File clicked!');
    let filepath = file

    
    if (onFocusChange) {
      onFocusChange('file', filepath, parentPath);
    }

    // console.log(filepath)
    openFileInNewTab(filepath)

    // console.log("file path from tree view")
    // console.log(filepath)


	}



  function handleDragOverDisabled(event: DragEvent){
    event.preventDefault(); // Necessary to allow dropping
    if (event.dataTransfer) {

      event.dataTransfer.dropEffect = 'none';
    }
  }

  function handleDropDisabled(event: DragEvent, targetType: 'folder' | 'file', targetPath: string, parentPath:string) {
    event.preventDefault();
    if (event.dataTransfer) {
      try {
        event.dataTransfer.dropEffect = 'none';
      } catch (e) {
        console.error("Failed to parse drag data:", e);
      }
    }
  }

  function handleDragStart(event: DragEvent, type: 'folder' | 'file', path: string, parentPath: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify({ type, path, parentPath }));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault(); // Necessary to allow dropping
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }


  function handleDrop(event: DragEvent, targetType: 'folder', targetPath: string, targetParentPath: string) {
    event.preventDefault();
    if (event.dataTransfer) {
      try {
        const dataStr = event.dataTransfer.getData('application/json');
        if (!dataStr) return;
        
        const data = JSON.parse(dataStr);
        const sourcePath = data.path;
        const sourceType = data.type;
        const sourceParentPath = data.parentPath;
        
        // Trigger the requested function
        onItemDrop(sourceType, sourcePath, sourceParentPath, targetType, targetPath, targetParentPath);
      } catch (e) {
        console.error("Failed to parse drag data:", e);
      }
    }
  }

  function handleRootDrop(event: DragEvent, targetType: 'folder', targetPath: string) {
    event.preventDefault();
    if (event.dataTransfer) {
      try {
        const dataStr = event.dataTransfer.getData('application/json');
        if (!dataStr) return;
        
        const data = JSON.parse(dataStr);
        const sourcePath = data.path;
        const sourceType = data.type;
        const sourceParentPath = data.parentPath;
        
        if(sourceType == "folder"){
          // Trigger the requested function
          onItemDrop(sourceType, sourcePath, sourceParentPath, targetType, targetPath, "");
        }

      } catch (e) {
        console.error("Failed to parse drag data:", e);
      }
    }
  }

  function handleUntaggedDrop(event: DragEvent, targetType: 'folder', targetPath: string) {
    event.preventDefault();
    if (event.dataTransfer) {
      try {
        const dataStr = event.dataTransfer.getData('application/json');
        if (!dataStr) return;
        
        const data = JSON.parse(dataStr);
        const sourcePath = data.path;
        const sourceType = data.type;
        const sourceParentPath = data.parentPath;
        
        if(sourceType == "file"){
          // Trigger the requested function
          onItemDrop(sourceType, sourcePath, sourceParentPath, targetType, targetPath, "");
        }

      } catch (e) {
        console.error("Failed to parse drag data:", e);
      }
    }
  }






</script>

{#snippet renderTagNode(node: TagNodeData, parentPath: string = '')}
  <!-- Tag/Folder Item using Obsidian's native classes -->
  <div class="tree-item nav-folder" class:is-collapsed={!isExpanded(node.path)}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      class="tree-item-self nav-folder-title is-clickable mod-collapsible"
      data-path={node.path}
      draggable="true"
      ondragstart={(e) => handleDragStart(e, 'folder', node.path, parentPath)}
      ondragover={handleDragOver}
      ondrop={(e) => handleDrop(e, 'folder', node.path, parentPath)}
    >
      <div 
        class="tree-item-icon collapse-icon is-clickable" 
        class:is-collapsed={!isExpanded(node.path)}
        role="button"
        tabindex="0"
        onclick={() => toggleTag(node.path)}
        onkeydown={(e) => e.key === 'Enter' && toggleTag(node.path)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
          <path d="M3 8L12 17L21 8"></path>
        </svg>
      </div>
      <div 
        class="tree-item-inner nav-folder-title-content my-tree"
        role="button"
        tabindex="0"
        onclick={() => handleFolderClick(node.path, parentPath)}
        onkeydown={(e) => e.key === 'Enter' && handleFolderClick(node.path, parentPath)}
      >{node.name}</div>
      <div class="tree-item-flair-outer">
        <span class="tree-item-flair">{node.totalFileCount}</span>
      </div>
    </div>
    
    {#if isExpanded(node.path)}
      <div class="tree-item-children nav-folder-children">
        <!-- Render files in this tag -->
        {#if node.files && node.files.length > 0}
          {#each node.files as file}
            <div class="tree-item nav-file">
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div 
                class="tree-item-self nav-file-title tappable is-clickable"
                data-path={file.path}
                role="button"
                tabindex="0"
                draggable="true"
                ondragstart={(e) => handleDragStart(e, 'file', file.path, node.path)}
                ondragover={handleDragOver}
                ondrop={(e) => handleDrop(e, 'folder', node.path, node.parentPath)}
                ondblclick={() => handleFileClick(file.path, node.path)}
                onkeydown={(e) => e.key === 'Enter' && handleFileClick(file.path, node.path)}
              >
                <div class="tree-item-inner nav-file-title-content">{file.name}</div>
              </div>
            </div>
          {/each}
        {/if}
        
        <!-- Render child tags -->
        {#if node.children && node.children.length > 0}
          {#each node.children as child}
            {@render renderTagNode(child, node.path)}
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

<!-- Tag Tree using Obsidian's native classes -->
{#if treeData && treeData.rootTags}
  <div class="nav-files-container node-insert-event">
    <div class="tree-item nav-folder" class:is-collapsed={!isExpanded(ROOT_TAGS_NODE_PATH)}>
      <div 
        class="tree-item-self nav-folder-title is-clickable mod-collapsible"
        data-path={""}
        role="button"
        tabindex="0"
        ondragover={handleDragOver}
        ondrop={(e) => handleRootDrop(e, 'folder', "")}
        onclick={() => toggleTag(ROOT_TAGS_NODE_PATH)}
        onkeydown={(e) => e.key === 'Enter' && toggleTag(ROOT_TAGS_NODE_PATH)}
      >
        <div class="tree-item-icon collapse-icon" class:is-collapsed={!isExpanded(ROOT_TAGS_NODE_PATH)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
            <path d="M3 8L12 17L21 8"></path>
          </svg>
        </div>
        <div class="tree-item-inner nav-folder-title-content main-folder-title">Tags</div>
        <div class="tree-item-flair-outer">
          <span class="tree-item-flair">{treeData.rootTags.length}</span>
        </div>
      </div>

      {#if isExpanded(ROOT_TAGS_NODE_PATH)}
        <div class="tree-item-children nav-folder-children">
          {#each treeData.rootTags as tagNode}
            {@render renderTagNode(tagNode)}
          {/each}
        </div>
      {/if}
    </div>
    
    {#if treeData.untaggedFiles && treeData.untaggedFiles.length > 0}
      <!-- Untagged Files as a special folder -->
      <div class="tree-item nav-folder" class:is-collapsed={!isExpanded('__untagged__')}>
        <div 
          class="tree-item-self nav-folder-title is-clickable mod-collapsible"
          data-path="__untagged__"
          role="button"
          tabindex="0"
          ondragover={handleDragOver}
          ondrop={(e) => handleUntaggedDrop(e, 'folder', "")}
          onclick={() => toggleTag('__untagged__')}
          onkeydown={(e) => e.key === 'Enter' && toggleTag('__untagged__')}
        >
          <div class="tree-item-icon collapse-icon" class:is-collapsed={!isExpanded('__untagged__')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
              <path d="M3 8L12 17L21 8"></path>
            </svg>
          </div>
          <div class="tree-item-inner nav-folder-title-content main-folder-title">Untagged Files</div>
          <div class="tree-item-flair-outer">
            <span class="tree-item-flair">{treeData.untaggedFiles.length}</span>
          </div>
        </div>
        
        {#if isExpanded('__untagged__')}
          <div class="tree-item-children nav-folder-children">
            {#each treeData.untaggedFiles as file}
              <div class="tree-item nav-file">
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div 
                  class="tree-item-self nav-file-title tappable is-clickable"
                  data-path={file.path}
                  role="button"
                  tabindex="0"
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, 'file', file.path, "")}
                  ondragover={handleDragOver}
                  ondrop={(e) => handleUntaggedDrop(e, 'folder', "")}
                  ondblclick={() => handleFileClick(file.path, '')}
                  onkeydown={(e) => e.key === 'Enter' && handleFileClick(file.path, '__untagged__')}
                >
                  <div class="tree-item-inner nav-file-title-content">{file.name}</div>
                </div>
                
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{:else}
  <p class="placeholder-text">No tags found</p>
{/if}

<style>
  /* 
   * Obsidian native CSS classes are used for tree rendering.
   * Minimal overrides to ensure proper display in custom view.
   */
  
  .nav-files-container {
    padding: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  /* Ensure the collapse icon rotates properly */
  .collapse-icon.is-collapsed {
    transform: rotate(-90deg);
  }
  
  .collapse-icon {
    transition: transform 100ms ease-in-out;
  }

  .placeholder-text {
    color: var(--text-muted);
    font-size: 14px;
    padding: 12px;
  }


  .my-tree {
    width: 100%;
  }

  
  .main-folder-title{
    color: var(--interactive-accent)
  }
</style>
