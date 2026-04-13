<script lang="ts">
  import { writable } from 'svelte/store';
  import { inconsistencyFlag } from '../store';
  import { fade } from 'svelte/transition';
  import TagTreeView from './TagTreeView.svelte';
  import MainView from './MainView.svelte';
	import MetadataView from './MetadataView.svelte';

  import type {TagFolderPluginSettings} from '../settings';

  // import {getVaultName, doesTagPathExist} from '../modelInterface'
  import type { ControllerInterface } from '../controllerInterface';
  import type { ModelInterface } from '../modelInterface';
	import BottomStatusBar from './BottomStatusBar.svelte';


  // Props
  interface Props {
    settings?: TagFolderPluginSettings;
    controller?: ControllerInterface | null;
    model?:ModelInterface | null;
    initialTreeData?: unknown;
    initialVersion?: number;
    initialCurrentPath?: string;
    initialBackPaths?: string[];
    initialForwardPaths?: string[];
    onNavigationChange?: () => void;
  }

  let { 
    settings, 
    controller,
    model,
    initialTreeData, 
    initialVersion = 0,
    initialCurrentPath = "",
    initialBackPaths = [],
    initialForwardPaths = [],
    onNavigationChange
  }: Props = $props();


  if (!model) {
  throw new Error("model is not initialized");
  }

  let currVaultName  = model.getVaultName()

  function pathExists(path: string): boolean {
    if (!model) {
      throw new Error("model is not initialized");
    }
    return model.doesTagPathExist(path);
  }

  function getNearestExistingPath(path: string): string {
    let candidate = (path ?? '').trim().replace(/^\/+|\/+$/g, '');

    while (candidate.length > 0) {
      if (pathExists(candidate)) {
        return candidate;
      }

      const lastSlash = candidate.lastIndexOf('/');
      candidate = lastSlash === -1 ? '' : candidate.slice(0, lastSlash);
    }

    return '';
  }

  // State for sidebar collapse
  let leftCollapsed = $state(false);
  let rightCollapsed = $state(false);

  // actual variables to maintain state
  let currentPath = $state(getNearestExistingPath(initialCurrentPath))
  // let currentPath = writable("")

  // Navigation history arrays for back/forward functionality
  let backPaths = $state<string[]>([...initialBackPaths])
  let forwardPaths = $state<string[]>([...initialForwardPaths])

  // State for currently focused object
  let focusedObjectType = $state<'folder' | 'file' >('folder');
  let focusedObjectPath = $state<string>("");
  let focusedObjectParent = $state<string>("");
  
  // Reference to TagTreeView component for updates
  let tagTreeViewRef: any = $state(null);
  
  // Reference to MainView component for updates
  let mainViewRef: any = $state(null);
  
  // Trigger for forcing MainView to re-derive its data
  let mainViewRefreshKey = $state(0);
  
  // focusedObjectPath will store:
  // - Tag path (e.g., "programming/typescript") if focusedObjectType is 'folder'
  // - Physical file path (e.g., "path/to/file.md") if focusedObjectType is 'file'

  /**
   * Update tree data - called by TagExplorerView when tree changes
   * Passes the update directly to TagTreeView which holds the state
   */
  export function updateTreeData(newTreeData: unknown, newVersion: number): void {
    // Pass update directly to TagTreeView - no duplicate state here
    tagTreeViewRef?.updateTreeData?.(newTreeData, newVersion);
  }
  
  /**
   * Refresh the current node in the main view
   * Called when tree changes to ensure main view shows updated node data
   */
  export function refreshCurrentNode(): void {
    // Increment key to force MainView to re-derive its data
    mainViewRefreshKey++;
  }
  
  /**
   * Get the current navigation state for persistence
   */
  export function getNavigationState() {
    return {
      currentPath,
      backPaths: [...backPaths],
      forwardPaths: [...forwardPaths]
    };
  }

  function toggleLeft() {
    leftCollapsed = !leftCollapsed;
  }
  
  function toggleRight() {
    rightCollapsed = !rightCollapsed;
  }

  // Handle updates to focused object
  function handleFocusChange(type: 'folder' | 'file', path: string, parentpath: string) {
    focusedObjectType = type;
    focusedObjectPath = path;
    focusedObjectParent = parentpath
    console.log("__")
    console.log(type)
    console.log(path)
    console.log("__")
  }

  function handleUpdate(newData: string) {
    // When visiting a new location via tree navigation
    // Add current path to back history
    if (currentPath !== newData) {
      backPaths = [...backPaths, currentPath];
      // Clear forward history when visiting a new location
      forwardPaths = [];
    }
    currentPath = newData;
    onNavigationChange?.();
  }


  function goBack() {
    if (backPaths.length === 0) return;

    // Add current path to forward history
    forwardPaths = [...forwardPaths, currentPath];
    
    // Pop from back history and navigate to it
    const newPath = backPaths[backPaths.length - 1];
    backPaths = backPaths.slice(0, -1);
    
    currentPath = getNearestExistingPath(newPath);
    handleFocusChange('folder', currentPath, "");
    onNavigationChange?.();
  }

  function goForward() {
    if (forwardPaths.length === 0) return;
    
    // Add current path to back history
    backPaths = [...backPaths, currentPath];
    
    // Pop from forward history and navigate to it
    const newPath = forwardPaths[forwardPaths.length - 1];
    forwardPaths = forwardPaths.slice(0, -1);
    
    currentPath = getNearestExistingPath(newPath);
    handleFocusChange('folder', currentPath, "");
    onNavigationChange?.();
  }

  function goToParentFolder(){

    let tempCurrPath = currentPath
    let lastSlash = tempCurrPath.lastIndexOf("/");
    let newpath = lastSlash === -1 ? "" : tempCurrPath.slice(0, lastSlash);
    
    // Add current path to back history when navigating to parent
    backPaths = [...backPaths, currentPath];
    // Clear forward history when using parent navigation
    forwardPaths = [];
    
    currentPath = getNearestExistingPath(newpath)

    handleFocusChange('folder', currentPath, tempCurrPath)
    onNavigationChange?.();

  }

  function goToHomeFolder(){

    let tempCurrPath = currentPath
    
    // Add current path to back history when navigating to home
    if (currentPath !== "") {
      backPaths = [...backPaths, currentPath];
      // Clear forward history when using home navigation
      forwardPaths = [];
    }
    
    currentPath = ""

    handleFocusChange('folder', currentPath, tempCurrPath)
    onNavigationChange?.();

  }

  function refreshCurerntFolder(){

    let tempCurrPath = currentPath
    currentPath = ""
    currentPath = getNearestExistingPath(tempCurrPath)

    handleFocusChange('folder', currentPath, tempCurrPath)

  }

  let leftWidth = $state(250);
  let rightWidth = $state(250);
  let containerEl: HTMLDivElement | null = null;

  let resizing: String = "";

  function startResize(event: MouseEvent, side: 'left' | 'right') {
    resizing = side;

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopResize);
  }

  function onMouseMove(event: MouseEvent) {
    if (!containerEl) {
      return;
    }

    const bounds = containerEl.getBoundingClientRect();

    if (resizing === 'left') {
      leftWidth = Math.max(0, event.clientX - bounds.left);
    }

    if (resizing === 'right') {
      rightWidth = Math.max(0, bounds.right - event.clientX);
    }
  }

  function stopResize() {
    resizing = "";
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', stopResize);
  }

  // Color dictionary mapping color names to CSS color values
  const colorDictionary: Record<string, string> = {
      'red': '#ff0000',
      'green': '#00ff00',
      'blue': '#0000ff',
      'yellow': '#ffff00',
      'orange': '#ff8800',
      'purple': '#800080'
  };

  function getColorForName(colorName: string): string {
      const normalizedName = colorName.toLowerCase().trim();
      // Check if it's a known color name
      if (colorDictionary[normalizedName]) {
          return colorDictionary[normalizedName];
      }
      // Default fallback color
      return 'none';
  }



  async function onItemDrop(
    sourceType: 'folder' | 'file', 
    sourcePath: string, 
    sourceParentPath: string, 
    targetType: 'folder', 
    targetPath: string, 
    targetParentPath: string, 
    source: 'internal' | 'external',
    ctrlPressed: boolean) {
      // console.log("🔴ondrop details:")
      // console.log("sourceType")
      // console.log(sourceType)
      // console.log("sourcePath")
      // console.log(sourcePath)
      // console.log("sourceParentPath")
      // console.log(sourceParentPath)
      // console.log("targetType")
      // console.log(targetType)
      // console.log("targetPath")
      // console.log(targetPath)
      // console.log("targetParentPath")
      // console.log(targetParentPath)
      // console.log("source")
      // console.log(source)
      // console.log("ctrlPressed")
      // console.log(ctrlPressed)
      // console.log("-----------")

    if (source == "external"){
      if (sourceType === "file"){
        sourcePath = sourcePath + ".md"

        await controller!.addFileToTagpath(targetPath, sourcePath)
      }
    } else {
      console.log(`Item dropped: source (${sourceType}) ${sourcePath}  ${sourceParentPath} -> target (${targetType}) ${targetPath}  ${targetParentPath} `);

      if (sourceType === "file"){
  
        if (targetPath == ""){
          await controller!.removeFileFromFolder(sourceParentPath, sourcePath)
  
        }else{

          if(ctrlPressed){
            if (sourceParentPath == ""){
              await controller!.moveFileToFolder(sourceParentPath, targetPath, sourcePath)

            }else{
              await controller!.copyFileToFolder(sourceParentPath, targetPath, sourcePath)

            }

          }else{
            await controller!.moveFileToFolder(sourceParentPath, targetPath, sourcePath)
            // probably display a notice that somethign moved from somewhere to somewhere
          }
        }
        
      } else if (sourceType === "folder"){

        if (ctrlPressed){
          await controller!.recreateFolder(sourcePath, targetPath )

        }else{
          await controller!.moveFolderToFolder(sourceParentPath, targetPath, sourcePath)
          // probably display a notice that somethign moved from somewhere to somewhere

        }
      }

    }




  }


let mainViewSortFlag = $state(true)
let treeViewSortFlag = $state(true)

function flipMainViewSortFlag(){
  mainViewSortFlag = !mainViewSortFlag;

  console.log(mainViewRefreshKey)
  mainViewRefreshKey += 1
  console.log(mainViewRefreshKey)
}

function flipLeftSidebarViewSortFlag(){
  treeViewSortFlag = !treeViewSortFlag

  console.log(mainViewRefreshKey)
  mainViewRefreshKey += 1
  console.log(mainViewRefreshKey)
}


async function renameSelectedItem(type: 'folder' | 'file', path: string, parentpath: string){
  console.log("renameSelectedItem")

    console.log(type)
    console.log(path)
    console.log(parentpath)
    await controller!.triggerRenameModal(type, path, parentpath)

}

async function createNewFileInFolder(type:'file', parentpath: string){
  console.log("createNewFileInFolder")

    console.log(type)
    console.log(parentpath)
    await controller!.triggerNewFileOrFolderModal(type, parentpath)

}

async function createNewFolderInFolder(type: 'folder', parentpath: string){
  console.log("createNewFolderInFolder")

    console.log(type)
    console.log(parentpath)
    await controller!.triggerNewFileOrFolderModal(type, parentpath)

}


async function deleteSelectedItem(type: 'folder' | 'file', path: string, parentpath: string){
  console.log("delteSelectedItem")

    console.log(type)
    console.log(path)
    console.log(parentpath)
    await controller!.triggerDeleteModal(type, path, parentpath)

}


let viewForm: "blocks" | "list" | "details"= $state("blocks")

function toggleViewForm(){
  if(viewForm == "blocks"){
    viewForm = "list"

  }else if (viewForm == "list"){
    viewForm = "details"

  }else if (viewForm == "details"){
    viewForm = "blocks"

  }
}


let treeView: "tree" | "untagged" | "emptyfolders" | "allfiles" | "allfolders"= $state("tree")

function toggleTreeView(){
  if(treeView == "tree"){
    treeView = "untagged"

  }else if (treeView == "untagged"){
    treeView = "emptyfolders"

  }else if (treeView == "emptyfolders"){
    treeView = "allfiles"

  }else if (treeView == "allfiles"){
    treeView = "allfolders"

  }else if (treeView == "allfolders"){
    
    treeView = "tree"

  }

}

</script>



{#if $inconsistencyFlag}
  <div class="loading-overlay" transition:fade={{ duration: 300 }}>
    <div class="spinner"></div>
    <div class="loading-text">Rebuilding folder structure...</div>
  </div>
{/if}




<div class="dual-sidebar-container" bind:this={containerEl}>
  <!-- Left Sidebar -->
  <div class="sidebar left-sidebar" 
  class:collapsed={leftCollapsed}  
  style:min-width={leftCollapsed ? '0px' : '250px'} 
  style:width={leftCollapsed ? 'auto' : `${leftWidth}px`}
  style:max-width="450px">
    <div class="sidebar-header">

      <button class="collapse-btn" onclick={toggleLeft} aria-label="Toggle left sidebar">
        {#if leftCollapsed}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        {/if}
      </button>           
      
      <span class="sidebar-title left-title"  class:hidden={leftCollapsed} >Tag Tree</span>

      <div class="sidebar-button-holder" class:hidden={leftCollapsed}>

        <div 
        class="header-button"
        role="button"
        tabindex="0"
        onclick={() => toggleTreeView()}
        onkeydown={(e) => e.key === 'Enter' && toggleTreeView()}
        title="Change Tree"
        >
          {#if treeView == "tree"}
            <!-- <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grid2x2-icon lucide-grid-2x2"><path d="M12 3v18"/><path d="M3 12h18"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg> -->
            <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-tree-icon lucide-folder-tree"><path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M3 5a2 2 0 0 0 2 2h3"/><path d="M3 3v13a2 2 0 0 0 2 2h3"/></svg>
          {:else if treeView == "untagged"}
            <!-- <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-stretch-horizontal-icon lucide-stretch-horizontal"><rect width="20" height="6" x="2" y="4" rx="2"/><rect width="20" height="6" x="2" y="14" rx="2"/></svg> -->
            <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-icon lucide-file"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/></svg>
          {:else if treeView == "emptyfolders"}
            <!-- <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-logs-icon lucide-logs"><path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/><path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/></svg> -->
            <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-open-icon lucide-folder-open"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>
          {:else if treeView == "allfiles"}
            <!-- <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-logs-icon lucide-logs"><path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/><path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/></svg> -->
            <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gallery-horizontal-end-icon lucide-gallery-horizontal-end"><path d="M2 7v10"/><path d="M6 5v14"/><rect width="12" height="18" x="10" y="3" rx="2"/></svg>
          {:else if treeView == "allfolders"}
            <!-- <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-logs-icon lucide-logs"><path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/><path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/></svg>            -->
            <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folders-icon lucide-folders"><path d="M20 5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2.5a1.5 1.5 0 0 1 1.2.6l.6.8a1.5 1.5 0 0 0 1.2.6z"/><path d="M3 8.268a2 2 0 0 0-1 1.738V19a2 2 0 0 0 2 2h11a2 2 0 0 0 1.732-1"/></svg>
          {/if}
        </div>

        <div 
        class="header-button"
        role="button"
        tabindex="0"
        onclick={() => flipLeftSidebarViewSortFlag()}
        onkeydown={(e) => e.key === 'Enter' && flipLeftSidebarViewSortFlag()}
        title="Sort Order: Tree View"
        >
          {#if !treeViewSortFlag}
            <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-wide-narrow-icon lucide-arrow-down-wide-narrow"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/></svg>
          {:else}
            <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-narrow-wide-icon lucide-arrow-down-narrow-wide"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h4"/><path d="M11 8h7"/><path d="M11 12h10"/></svg>
          {/if}
        </div>

      </div>


    </div>
    <div class="sidebar-content" class:hidden={leftCollapsed}>
      <!-- Left sidebar content - Tag Tree -->
      <TagTreeView 
        bind:this={tagTreeViewRef}
        currentPath={currentPath}  
        onUpdate={handleUpdate} 
        onFocusChange={handleFocusChange}
        refreshKey={mainViewRefreshKey}
        treeViewSortFlag={treeViewSortFlag}
        initialTreeData={initialTreeData}
        initialVersion={initialVersion}
        controller={controller}
        model={model}
        onItemDrop = {onItemDrop}
        treeView = {treeView}

      />
    </div>
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    id="leftHandle"
    class="handle"
    onmousedown={(e) => startResize(e, 'left')}
  ></div>





  <!-- Main Content Area -->
  <div class="main-content">

      

    <div class="main-header">


      <div class="button-holder">
        <div 
          class="header-button"
          class:disabled={backPaths.length === 0}
          role="button"
          tabindex="0"
          onclick={() => goBack()}
          onkeydown={(e) => e.key === 'Enter' && goBack()}
          aria-label="Go back"
        >
          <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-big-left-icon lucide-arrow-big-left"><path d="M13 9a1 1 0 0 1-1-1V5.061a1 1 0 0 0-1.811-.75l-6.835 6.836a1.207 1.207 0 0 0 0 1.707l6.835 6.835a1 1 0 0 0 1.811-.75V16a1 1 0 0 1 1-1h6a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1z"/></svg>
        </div>
        <div 
          class="header-button"
          class:disabled={forwardPaths.length === 0}
          role="button"
          tabindex="0"
          onclick={() => goForward()}
          onkeydown={(e) => e.key === 'Enter' && goForward()}
          aria-label="Go forward"
        >
          <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-big-right-icon lucide-arrow-big-right"><path d="M11 9a1 1 0 0 0 1-1V5.061a1 1 0 0 1 1.811-.75l6.836 6.836a1.207 1.207 0 0 1 0 1.707l-6.836 6.835a1 1 0 0 1-1.811-.75V16a1 1 0 0 0-1-1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z"/></svg>
        </div>
      </div>


      <div 
      class="header-button"
      role="button"
      tabindex="0"
      onclick={() => goToHomeFolder()}
      onkeydown={(e) => e.key === 'Enter' && goToHomeFolder()}
      >
        <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-house-icon lucide-house"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      </div>



      <div class="path-holder">
        <span class="main-title"><strong style="color: var(--color-base-60);">{currVaultName}:/</strong>{currentPath}</span>
      </div>

      <div 
      class="header-button"
      role="button"
      tabindex="0"
      onclick={() => refreshCurerntFolder()}
      onkeydown={(e) => e.key === 'Enter' && refreshCurerntFolder()}
      >
        <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw-icon lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
      </div>


      <div 
      class="header-button"
      role="button"
      tabindex="0"
      onclick={() => goToParentFolder()}
      onkeydown={(e) => e.key === 'Enter' && goToParentFolder()}
      >
        <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-output-icon lucide-folder-output"><path d="M2 7.5V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-1.5"/><path d="M2 13h10"/><path d="m5 10-3 3 3 3"/></svg>
      </div>



    </div>

    <div class="main-subheader">

      <span class="main-subtitle">Options: 
      </span>

      <div 
      class="subheader-button"
      role="button"
      tabindex="0"
      onclick={() => flipMainViewSortFlag()}
      onkeydown={(e) => e.key === 'Enter' && flipMainViewSortFlag()}
      title="Sort Order: Main View"
      >
        {#if !mainViewSortFlag}
          <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-wide-narrow-icon lucide-arrow-down-wide-narrow"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/></svg>
        {:else}
          <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-down-narrow-wide-icon lucide-arrow-down-narrow-wide"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h4"/><path d="M11 8h7"/><path d="M11 12h10"/></svg>
        {/if}
      </div>

      <div 
      class="subheader-button"
      role="button"
      tabindex="0"
      onclick={() => renameSelectedItem(focusedObjectType, focusedObjectPath, focusedObjectParent)}
      onkeydown={(e) => e.key === 'Enter' && renameSelectedItem(focusedObjectType, focusedObjectPath, focusedObjectParent)}
      title="Rename File/Folder!"
      >

        <!-- <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-pen-icon lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg> -->
        <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-text-cursor-input-icon lucide-text-cursor-input"><path d="M12 20h-1a2 2 0 0 1-2-2 2 2 0 0 1-2 2H6"/><path d="M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7"/><path d="M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1"/><path d="M6 4h1a2 2 0 0 1 2 2 2 2 0 0 1 2-2h1"/><path d="M9 6v12"/></svg>
      </div>

      <div 
      class="subheader-button"
      role="button"
      tabindex="0"
      onclick={() => createNewFileInFolder("file", currentPath)}
      onkeydown={(e) => e.key === 'Enter' && createNewFileInFolder("file", currentPath)}
      title="New File"
      >

        <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-plus-icon lucide-file-plus"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M9 15h6"/><path d="M12 18v-6"/></svg>
      </div>

      <div 
      class="subheader-button"
      role="button"
      tabindex="0"
      onclick={() => createNewFolderInFolder("folder", currentPath)}
      onkeydown={(e) => e.key === 'Enter' && createNewFolderInFolder("folder", currentPath)}
      title="New Folder"
      >

        <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-plus-icon lucide-folder-plus"><path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
      </div>

      <div 
      class="subheader-button"
      role="button"
      tabindex="0"
      onclick={() => toggleViewForm()}
      onkeydown={(e) => e.key === 'Enter' && toggleViewForm()}
      title="Change View"
      >
        {#if viewForm == "blocks"}
          <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grid2x2-icon lucide-grid-2x2"><path d="M12 3v18"/><path d="M3 12h18"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        {:else if viewForm == "list"}
          <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-stretch-horizontal-icon lucide-stretch-horizontal"><rect width="20" height="6" x="2" y="4" rx="2"/><rect width="20" height="6" x="2" y="14" rx="2"/></svg>
          <!-- <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rows4-icon lucide-rows-4"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M21 7.5H3"/><path d="M21 12H3"/><path d="M21 16.5H3"/></svg> -->
        {:else if viewForm == "details"}
          <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-logs-icon lucide-logs"><path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/><path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/></svg>
          <!-- <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-list-icon lucide-layout-list"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M14 4h7"/><path d="M14 9h7"/><path d="M14 15h7"/><path d="M14 20h7"/></svg> -->
        {/if}
      </div>

      <div 
      class="subheader-button subheader-button-left"
      role="button"
      tabindex="0"
      onclick={() => deleteSelectedItem(focusedObjectType, focusedObjectPath, focusedObjectParent)}
      onkeydown={(e) => e.key === 'Enter' && deleteSelectedItem(focusedObjectType, focusedObjectPath, focusedObjectParent)}
      title="Delete Selected"
      >

        <svg style="padding:2px" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </div>

    </div>

    <MainView 
      bind:this={mainViewRef}
      currentPath={currentPath}  
      onUpdate={handleUpdate} 
      onFocusChange={handleFocusChange}
      refreshKey={mainViewRefreshKey}
      controller={controller}
      model={model}
      colorDictionary = {colorDictionary}
      getColorForName = {getColorForName}
      onItemDrop = {onItemDrop}
      mainViewSortFlag = {mainViewSortFlag}
      viewForm = {viewForm}

    />

    <BottomStatusBar
      
    />
  </div>



  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    id="rightHandle"
    class="handle"
    onmousedown={(e) => startResize(e, 'right')}
  ></div>


  <!-- Right Sidebar -->
  <div class="sidebar right-sidebar" 
  class:collapsed={rightCollapsed} 
  style:min-width={rightCollapsed ? '0px' : '250px'} 
  style:width={rightCollapsed ? 'auto' : `${rightWidth}px`}
  style:max-width="450px">
    <div class="sidebar-header">
      <button class="collapse-btn right-btn" onclick={toggleRight} aria-label="Toggle right sidebar">
        {#if rightCollapsed}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        {/if}
      </button>
      <span class="sidebar-title right-title"  class:hidden={rightCollapsed}>Metadata</span>
    </div>
    {#if !rightCollapsed}
      <div class="sidebar-content">
        <!-- Left sidebar content will go here -->  
        <MetadataView  
          currentPath={currentPath} 
          focusedObjectType={focusedObjectType} 
          focusedObjectPath={focusedObjectPath} 
          focusedObjectParent={focusedObjectParent} 
          showObsMetaData={settings?.showObsMetaData} 
          fieldsToSkip={settings?.fieldsToSkip}
          controller={controller}
          model= {model}
          colorDictionary = {colorDictionary}
          getColorForName = {getColorForName}
        />
      </div>
    {/if}
  </div>
</div>












<style>

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--background-primary);
    opacity: 0.3;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .spinner {
    border: 4px solid var(--background-modifier-border);
    border-top: 4px solid var(--interactive-accent);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }

  .loading-text {
    margin-top: 10px;
    color: var(--text-normal);
    font-weight: bold;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .handle {
    width: 5px;
    cursor: ew-resize;
  }

  .dual-sidebar-container {
    display: flex;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    background-color: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    transition: width 0.2s ease;
    flex-shrink: 0;
  }

  .left-sidebar {
    border-right: 1px solid var(--background-modifier-border);
  }

  .right-sidebar {
    border-left: 1px solid var(--background-modifier-border);
  }

  .sidebar.collapsed {
    width: 40px;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    
    padding: 8px;
    border-bottom: 1px solid var(--background-modifier-border);
    background-color: var(--background-secondary-alt);
    min-height: 40px;
  }

  .left-sidebar .sidebar-header {
    flex-direction: row;
  }

  .right-sidebar .sidebar-header {
    flex-direction: row-reverse;
  }

  .sidebar-title {
    font-weight: 500;
    font-size: 14px;
    color: var(--text-normal);
    white-space: nowrap;
    overflow: hidden;
  }
  
  .left-title{
    margin-left: 10px;
    margin-right: auto;
  }

  .collapsed .sidebar-title {
    display: none;
  }

  .collapse-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border-radius: 4px;
  }

  .collapse-btn:hover {
    background-color: var(--background-modifier-hover);
    color: var(--text-normal);
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    scrollbar-gutter: stable;
    padding: 12px;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    background-color: var(--background-primary);
    min-height: 0;
  }






  .right-btn{
    margin-left: auto;
  }
  .right-title{
    margin-right: auto;
  }  





   .main-title {
    font-weight: 500;
    font-size: 14px;
    color: var(--text-normal);
    white-space: nowrap;
    padding-right: 20px;
  }


   .main-subtitle {
    font-weight: 500;
    font-size: 14px;
    color: var(--text-normal);
    white-space: nowrap;
    overflow: hidden;
    height: 20px;
  }


  .main-header {
    display: flex;
    flex-direction:row;
    align-items: center;
    
    padding: 5px;
    padding-left: 0px;
    padding-right: 0px;
    border-bottom: 1px solid var(--background-modifier-border);
    background-color: var(--background-secondary-alt);
    min-height: 40px;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .main-subheader {
    display: flex;
    align-items: center;
    
    padding: 4px;
    border-bottom: 1px solid var(--background-modifier-border);
    background-color: var(--background-primary-alt);
    min-height: 40px;
    position: sticky;
    top: 40px;
    z-index: 9;
  }


.button-holder{
  display: flex;
  flex-direction: row;
  align-items: center; /* vertical centering */

  height: 100%;
  margin-right: 5px;
}

.header-button{
  height: 100%;
  aspect-ratio: 1 / 1; 
  background-color: var(--background-primary-alt);; /* your hex color */
  border-radius: 10px;
  padding:5px;
  margin-left:3px;
  margin-right:3px; 

  display: grid ;
  align-items: center; /* vertical centering */
  place-items: center;

  cursor: pointer;
  transition: background-color 0.2s ease; /* smooth hover */
}

.sidebar-button-holder{
  display: flex;
  flex-direction: row;
  align-items: center;
}

.header-button:hover {
  background-color: var(--background-primary);
  /* or a hex value like #e2e2e2 */
}

.header-button:active {
  transform: scale(0.96);
}

.header-button.disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}


.subheader-button{
  height: 100%;
  aspect-ratio: 1 / 1; 
  background-color: var(--background-secondary-alt); /* your hex color */
  border-radius: 10px;
  padding:4px;
  margin-left:3px;
  margin-right:3px; 

  display: grid ;
  align-items: center; /* vertical centering */
  place-items: center;

  cursor: pointer;
  transition: background-color 0.2s ease; /* smooth hover */
  /* border: 2px solid var(--background-modifier-border); */
  box-sizing: border-box;

}


.subheader-button:hover {
  background-color: var(--background-primary);
  /* or a hex value like #e2e2e2 */
}

.subheader-button:active {
  transform: scale(0.96);
}


.subheader-button-left{
margin-left: auto;
}


.subheader-button-left:hover {
  background-color: #e84545;
  /* or a hex value like #e2e2e2 */
}






.path-holder{
  flex:1;
  background-color: var(--background-primary-alt);; /* your hex color */
  border-radius: 16px;
  height: 100%;
  display: grid ;
  align-items: center; /* vertical centering */
  padding-left: 10px;

  overflow-x: auto;
  white-space: nowrap; 

  /* Hide scrollbar - Firefox */
  scrollbar-width: none;

  /* Hide scrollbar - IE/Edge */
  -ms-overflow-style: none;
}
  
.path-holder::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

.hidden {
  display: none;
}


</style>