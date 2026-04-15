<script lang="ts">
  // import { getleftSidebarTree} from '../modelInterface'

  import { openFileInNewTab } from '../windows'
  import type { ControllerInterface } from '../controllerInterface';
  import type { ModelInterface } from '../modelInterface';
  import { openTagExplorerInNewTab } from '../windows';
  import type { FileData, TagNodeData, SerializedTreeData} from '../interfaces';
  

  // Props
  interface Props {
    currentPath: string;
    onUpdate: (newPath: string) => void;  // Add function signature
    onFocusChange?: (type: 'folder' | 'file', path: string, parentpath: string) => void;  // Handler for focus changes
    refreshKey?: number;  
    treeViewSortFlag: boolean;
    initialTreeData?: unknown;
    initialVersion?: number;
    controller: ControllerInterface | null | undefined;
    model: ModelInterface | null | undefined;
    onItemDrop: (sourceType: 'folder' | 'file', sourcePath: string, sourceParentPath: string, targetType: 'folder', targetPath: string, targetParentPath: string, source: 'internal' | 'external', ctrlPressed: boolean) => void;
    treeView: "tree" | "untagged" | "emptyfolders" | "allfiles" | "allfolders";
  }
  

  let { currentPath, onUpdate, onFocusChange, refreshKey, treeViewSortFlag, initialTreeData, initialVersion = 0, controller, model, onItemDrop, treeView }:Props = $props();
  
  if (!model) {
      throw new Error("model is not initialized");
  }

  // State - Initialize with provided data or fetch from backend
  let treeData = $state<SerializedTreeData>(
    initialTreeData 
      ? (initialTreeData as SerializedTreeData) 
      : (model!.getleftSidebarTree(treeViewSortFlag).tree as SerializedTreeData)
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
    treeData = model!.getleftSidebarTree(treeViewSortFlag).tree as SerializedTreeData;
    treeVersion = newVersion;
    console.log("TagTreeView updated to version:", newVersion);
  }

  $effect(() => {
    void refreshKey;
    treeData = model!.getleftSidebarTree(treeViewSortFlag).tree as SerializedTreeData;
  });


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

  function handleFolderClick(folder:string, parentPath: string = '', ctrlClicked: boolean) {

    if (ctrlClicked){
      openTagExplorerInNewTab(folder);

    }else{
      let folderpath = folder
      // console.log('Folder clicked!');
      // console.log(foldername+" "+folderpath)
  
      onUpdate(folderpath);
  
      if (onFocusChange) {
        onFocusChange('folder', folderpath, parentPath);
      } 

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

  interface DragPayload {
    type: 'folder' | 'file';
    path: string;
    parentPath: string;
    source: 'internal' | 'external'
  }

  function parseObsidianOpenUri(raw: string): string | null {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'obsidian:') return null;

      const fileParam = url.searchParams.get('file');
      if (!fileParam) return null;

      return decodeURIComponent(fileParam).trim() || null;
    } catch {
      return null;
    }
  }

  function parseExternalFilePath(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const firstLine = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith('#'));

    if (!firstLine) return null;

    const obsidianPath = parseObsidianOpenUri(firstLine);
    if (obsidianPath) return obsidianPath;

    const wikiMatch = firstLine.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
    if (wikiMatch?.[1]) {
      return wikiMatch[1].trim() || null;
    }

    return firstLine;
  }

  function getDragPayload(event: DragEvent): DragPayload | null {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) return null;

    // Internal plugin drag payload
    const internalJson = dataTransfer.getData('application/json');
    if (internalJson) {
      try {
        const data = JSON.parse(internalJson) as Partial<DragPayload>;
        if ((data.type === 'folder' || data.type === 'file') && typeof data.path === 'string') {
          return {
            type: data.type,
            path: data.path,
            parentPath: typeof data.parentPath === 'string' ? data.parentPath : '',
            source: "internal"
          };
        }
      } catch {
      }
    }

    // External drag payload from Obsidian file explorer
    const textUriList = dataTransfer.getData('text/uri-list');
    console.log(textUriList)
    const uriPath = parseExternalFilePath(textUriList);
    if (uriPath && uriPath.length >0) {
      console.log(uriPath)
      console.log("hi")
      return { type: 'file', path: uriPath, parentPath: '', source: "external" };
    }

    return null;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault(); // Necessary to allow dropping
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }


  function handleDrop(event: DragEvent, targetType: 'folder', targetPath: string, targetParentPath: string) {
    event.preventDefault();
    activeIndex = null;
    isRootActive = false;
    isUntaggedActive = false;

    try {
      const payload = getDragPayload(event);
      if (!payload) return;

      onItemDrop(payload.type, payload.path, payload.parentPath, targetType, targetPath, targetParentPath, payload.source, event.ctrlKey || event.metaKey);

    } catch (e) {
      console.error("Failed to parse drag data:", e);
    }
  }

  function handleRootDrop(event: DragEvent, targetType: 'folder', targetPath: string) {
    event.preventDefault();
    activeIndex = null;
    isRootActive = false;
    isUntaggedActive = false;


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
          onItemDrop(sourceType, sourcePath, sourceParentPath, targetType, targetPath, "", "internal", event.ctrlKey || event.metaKey);
        }

      } catch (e) {
        console.error("Failed to parse drag data:", e);
      }
    }
  }

  function handleUntaggedDrop(event: DragEvent, targetType: 'folder', targetPath: string) {
    event.preventDefault();
    activeIndex = null;
    isRootActive = false;
    isUntaggedActive = false;

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
          onItemDrop(sourceType, sourcePath, sourceParentPath, targetType, targetPath, "", "internal", event.ctrlKey || event.metaKey);
        }

      } catch (e) {
        console.error("Failed to parse drag data:", e);
      }
    }
  }


let activeIndex: string | null = $state(null);
let isRootActive: boolean = $state(false);
let isUntaggedActive: boolean = $state(false);

function handleDragEnter(index: number, level: number) {
  activeIndex = level.toString() + "_" + index.toString()
  // activeIndex = index;
}

function handleDragLeave(event: DragEvent, index: number) {
  const target = event.currentTarget as HTMLElement;
  const related = event.relatedTarget as Node | null;
  if (target && related && !target.contains(related)) {
    activeIndex = null;
  }
}

function handleDragEnterRoot() {
  isRootActive = true;
}


function handleDragLeaveRoot(event: DragEvent) {
  const target = event.currentTarget as HTMLElement;
  const related = event.relatedTarget as Node | null;
  if (target && related && !target.contains(related)) {
    isRootActive = false;

  }
}

function handleDragEnterUntagged() {
  isUntaggedActive = true;
}


function handleDragLeaveUntagged(event: DragEvent) {
  const target = event.currentTarget as HTMLElement;
  const related = event.relatedTarget as Node | null;
  if (target && related && !target.contains(related)) {
    isUntaggedActive = false;

  }
}

</script>

{#snippet renderTagNode(node: TagNodeData, parentPath: string = '', index: number, level: number)}
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

      class:active={activeIndex === `${level}_${index}`}
      ondragenter={() => handleDragEnter(index, level)}
      ondragleave={(e) => handleDragLeave(e, index)}
      aria-label={node.path}
    >
      <div 
        class="tree-item-icon collapse-icon is-clickable " 
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
        onclick={(e) => handleFolderClick(node.path, parentPath, e.ctrlKey)}
        onkeydown={(e) => e.key === 'Enter' && handleFolderClick(node.path, parentPath, e.ctrlKey)}
      >{node.name}</div>
      <div class="tree-item-flair-outer">
        <span class="tree-item-flair">{node.totalFileCount}</span>
      </div>
    </div>
    
    {#if isExpanded(node.path)}
      <div 
      class="tree-item-children nav-folder-children"
      class:active={activeIndex === `${level}_${index}`}

      >

        <!-- Render child tags -->
        {#if node.children && node.children.length > 0}
          {#each node.children as child, index}
            {@render renderTagNode(child, node.path, index, level+1)}
          {/each}
        {/if}

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

                ondragenter={() => handleDragEnter(index, level)}
                ondragleave={(e) => handleDragLeave(e, index)}
                aria-label={file.path}
              >
                <div class="tree-item-inner nav-file-title-content">{file.name}</div>
              </div>
            </div>
          {/each}
        {/if}
        
      </div>
    {/if}
  </div>
{/snippet}

<!-- Tag Tree using Obsidian's native classes -->
{#if treeData && treeData.rootTags}
  {#if treeView == "tree"}
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

          class:active={isRootActive === true}
          ondragenter={() => handleDragEnterRoot()}
          ondragleave={(e) => handleDragLeaveRoot(e)}
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
            
            {#each treeData.rootTags as tagNode, index}
              {@render renderTagNode(tagNode, "", index, 1)}
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

            class:active={isUntaggedActive === true}
            ondragenter={() => handleDragEnterUntagged()}
            ondragleave={(e) => handleDragLeaveUntagged(e)}
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
            <div 
            class="tree-item-children nav-folder-children"
            class:active={isUntaggedActive === true}
            >
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


                    ondragenter={() => handleDragEnterUntagged()}
                    ondragleave={(e) => handleDragLeaveUntagged(e)}
                    aria-label={file.path}
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
  {:else if treeView == "untagged" }
    <div class="nav-files-container node-insert-event">

      {#if treeData.untaggedFiles && treeData.untaggedFiles.length > 0}
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

            class:active={isUntaggedActive === true}
            ondragenter={() => handleDragEnterUntagged()}
            ondragleave={(e) => handleDragLeaveUntagged(e)}
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
            <div 
            class="tree-item-children nav-folder-children"
            class:active={isUntaggedActive === true}
            >
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


                    ondragenter={() => handleDragEnterUntagged()}
                    ondragleave={(e) => handleDragLeaveUntagged(e)}
                    aria-label={file.path}

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

  {:else if treeView == "emptyfolders" }

    <div class="nav-files-container node-insert-event">

      {#if treeData.emptyTagNodes && treeData.emptyTagNodes.length > 0}
        <div class="tree-item nav-folder" class:is-collapsed={!isExpanded('__emptyfolders__')}>
          <div 
            class="tree-item-self nav-folder-title is-clickable mod-collapsible"
            data-path="__emptyfolders__"
            role="button"
            tabindex="0"
            onclick={() => toggleTag('__emptyfolders__')}
            onkeydown={(e) => e.key === 'Enter' && toggleTag('__emptyfolders__')}

          >
            <div class="tree-item-icon collapse-icon" class:is-collapsed={!isExpanded('__emptyfolders__')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
                <path d="M3 8L12 17L21 8"></path>
              </svg>
            </div>
            <div class="tree-item-inner nav-folder-title-content main-folder-title">Empty Folders</div>
            <div class="tree-item-flair-outer">
              <span class="tree-item-flair">{treeData.emptyTagNodes.length}</span>
            </div>
          </div>
          
          {#if isExpanded('__emptyfolders__')}
            <div 
            class="tree-item-children nav-folder-children"
            >
              {#each treeData.emptyTagNodes as tagNode, index}
                {@render renderTagNode(tagNode, "", index, 1)}
              {/each}
            </div>
          {/if}
        </div>

      {/if}
    </div>

  {:else if treeView == "allfiles" }
    <div class="nav-files-container node-insert-event">

      {#if treeData.allFiles && treeData.allFiles.length > 0}
        <div class="tree-item nav-folder" class:is-collapsed={!isExpanded('__allfiles__')}>
          <div 
            class="tree-item-self nav-folder-title is-clickable mod-collapsible"
            data-path="__allfiles__"
            role="button"
            tabindex="0"
            onclick={() => toggleTag('__allfiles__')}
            onkeydown={(e) => e.key === 'Enter' && toggleTag('__allfiles__')}

          >
            <div class="tree-item-icon collapse-icon" class:is-collapsed={!isExpanded('__allfiles__')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
                <path d="M3 8L12 17L21 8"></path>
              </svg>
            </div>
            <div class="tree-item-inner nav-folder-title-content main-folder-title">All Files</div>
            <div class="tree-item-flair-outer">
              <span class="tree-item-flair">{treeData.allFiles.length}</span>
            </div>
          </div>
          
          {#if isExpanded('__allfiles__')}
            <div 
            class="tree-item-children nav-folder-children"
            >
              {#each treeData.allFiles as file}
                <div class="tree-item nav-file">
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div 
                    class="tree-item-self nav-file-title tappable is-clickable"
                    data-path={file.path}
                    role="button"
                    tabindex="0"
                    draggable="true"
                    ondragstart={(e) => handleDragStart(e, 'file', file.path, "")}
                    ondblclick={() => handleFileClick(file.path, '')}
                    onkeydown={(e) => e.key === 'Enter' && handleFileClick(file.path, '__allfiles__')}
                    aria-label={file.path}


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
  {:else if treeView == "allfolders" }
      
      {#if treeData.allTagNodeFolders && treeData.allTagNodeFolders.length > 0}
        <div class="tree-item nav-folder" class:is-collapsed={!isExpanded('__allfolders__')}>
          <div 
            class="tree-item-self nav-folder-title is-clickable mod-collapsible"
            data-path="__allfolders__"
            role="button"
            tabindex="0"
            onclick={() => toggleTag('__allfolders__')}
            onkeydown={(e) => e.key === 'Enter' && toggleTag('__allfolders__')}

          >
            <div class="tree-item-icon collapse-icon" class:is-collapsed={!isExpanded('__allfolders__')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle">
                <path d="M3 8L12 17L21 8"></path>
              </svg>
            </div>
            <div class="tree-item-inner nav-folder-title-content main-folder-title">All Folders</div>
            <div class="tree-item-flair-outer">
              <span class="tree-item-flair">{treeData.allTagNodeFolders.length}</span>
            </div>
          </div>
          
          {#if isExpanded('__allfolders__')}
            <div 
            class="tree-item-children nav-folder-children"
            >
              {#each treeData.allTagNodeFolders as tagNode, index}
                {@render renderTagNode(tagNode, "", index, 1)}
              {/each}
            </div>
          {/if}
        </div>

      {/if}
  {/if}
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

.active {
  background-color: color-mix(in srgb, var(--interactive-accent) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 60%, transparent);
}
</style>
