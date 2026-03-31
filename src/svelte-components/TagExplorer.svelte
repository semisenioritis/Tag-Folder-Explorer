<script lang="ts">
  import { writable } from 'svelte/store';
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
    targetParentPath: string) {


    console.log(`Item dropped: source (${sourceType}) ${sourcePath}  ${sourceParentPath} -> target (${targetType}) ${targetPath}  ${targetParentPath} `);
    // Add additional logic here to handle the drop action

    if (sourceType === "file"){

      if (targetPath == ""){
        await controller!.removeFileFromFolder(sourceParentPath, sourcePath)

      } else{
        await controller!.moveFileToFolder(sourceParentPath, targetPath, sourcePath)
        // probably display a notice that somethign moved from somewhere to somewhere

      }

      
    } else if (sourceType === "folder"){
      

      await controller!.moveFolderToFolder(sourceParentPath, targetPath, sourcePath)
      // probably display a notice that somethign moved from somewhere to somewhere

    }




  }



</script>







<div class="dual-sidebar-container" bind:this={containerEl}>
  <!-- Left Sidebar -->
  <div class="sidebar left-sidebar" 
  class:collapsed={leftCollapsed}  
  style:min-width={leftCollapsed ? '0px' : '250px'} 
  style:width={leftCollapsed ? 'auto' : `${leftWidth}px`}
  style:max-width="450px">
    <div class="sidebar-header">

      <button class="collapse-btn left-btn" onclick={toggleLeft} aria-label="Toggle left sidebar">
        {#if leftCollapsed}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        {/if}
      </button>           
      
      <span class="sidebar-title left-title"  class:hidden={leftCollapsed}>Left Sidebar</span>


    </div>
    <div class="sidebar-content" class:hidden={leftCollapsed}>
      <!-- Left sidebar content - Tag Tree -->
      <TagTreeView 
        bind:this={tagTreeViewRef}
        currentPath={currentPath}  
        onUpdate={handleUpdate} 
        onFocusChange={handleFocusChange}
        initialTreeData={initialTreeData}
        initialVersion={initialVersion}
        controller={controller}
        model={model}
        onItemDrop = {onItemDrop}

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

      <span class="main-subtitle">Main Section Sub</span>


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
      <span class="sidebar-title right-title"  class:hidden={rightCollapsed}>Right Sidebar</span>
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


  .hidden {
    display: none;
  }

  .left-btn{
    margin-right: auto;
  }
  .left-title{
    margin-left: auto;
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
    overflow: hidden;
  }


   .main-subtitle {
    font-weight: 500;
    font-size: 14px;
    color: var(--text-normal);
    white-space: nowrap;
    overflow: hidden;
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
    
    padding: 8px;
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

.path-holder{
  flex:1;
  background-color: var(--background-primary-alt);; /* your hex color */
  border-radius: 16px;
  height: 100%;
  display: grid ;
  align-items: center; /* vertical centering */
  padding-left: 10px;
}
  



</style>