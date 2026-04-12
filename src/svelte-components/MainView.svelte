<script lang="ts">
  // import { getmainViewData, ModelInterface, readLegendStatusOfFile, readLegendStatusOfFolder } from '../modelInterface'
  import type { ISerializedTagNode, frontendFile, frontendFolder } from '../interfaces'
  import { openFileInNewTab } from '../windows'
  import type { ControllerInterface } from '../controllerInterface';
  import type { ModelInterface } from '../modelInterface';
  import { openTagExplorerInNewTab } from '../windows';

  // Props
  interface Props {
    currentPath: string;
    onUpdate: (newPath: string) => void;  // Add function signature
    onFocusChange?: (type: 'folder' | 'file', path: string, parentpath: string) => void;  // Handler for focus changes
    refreshKey?: number;  // Key to force re-derivation of mainViewData
    controller: ControllerInterface | null | undefined;
    model: ModelInterface | null | undefined;
    colorDictionary:Record<string, string>
    getColorForName: (name: string) => string;
    onItemDrop: (sourceType: 'folder' | 'file', sourcePath: string, sourceParentPath: string, targetType: 'folder', targetPath: string, targetParentPath: string, source: 'internal' | 'external', ctrlPressed: boolean) => void;
    mainViewSortFlag: boolean;
    viewForm: "blocks" | "list" | "details";

  }


  let { currentPath, onUpdate, onFocusChange, refreshKey = 0, controller, model, colorDictionary, getColorForName, onItemDrop, mainViewSortFlag, viewForm}:Props = $props();
  // let { currentPath }: Props = $props();


  if (!model) {
  throw new Error("model is not initialized");
  }


  let mainViewData: ISerializedTagNode | null = $derived.by(() => {
    // Include refreshKey in the derivation to force recalculation when it changes
    void refreshKey;
    return model.getmainViewData(currentPath, mainViewSortFlag);
  });


  // console.log("im tesing ")
  // console.log(mainViewData)
  // console.log(mainViewData?.getChildren())
  // console.log(mainViewData?.getFiles())

  // Track click timeouts to prevent single-click on double-click
  let clickTimeout: number | null = null;
  const CLICK_DELAY = 250; // milliseconds

  function handleFolderDblClick(folder:frontendFolder) {
    // Cancel any pending single-click
    if (clickTimeout !== null) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }
 
    let foldername = folder.name
    let folderpath = folder.path
    let oldpath = currentPath
		// console.log('Folder clicked!');
    // console.log(foldername+" "+folderpath)

    onUpdate(folderpath);
    
    // Update focus state when folder is opened
    if (onFocusChange) {
      onFocusChange('folder', folderpath, oldpath);
    }

    
	}



	function handleFileDblClick(file:frontendFile) {
    // Cancel any pending single-click
    if (clickTimeout !== null) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }

		// console.log('File clicked!');
    let filepath = file.path
    let oldpath = currentPath

    // console.log(filepath)
    openFileInNewTab(filepath)
    
    // Update focus state when file is opened
    if (onFocusChange) {
      onFocusChange('file', filepath, oldpath);
    }
	}



  function handleFolderClick(folder:frontendFolder, ctrlClicked: boolean ) {
    // Delay single-click action to check for double-click
    if (clickTimeout !== null) {
      clearTimeout(clickTimeout);
    }
    
    clickTimeout = window.setTimeout(() => {
      let foldername = folder.name
      let folderpath = folder.path
      // console.log('Folder clicked!');
      // console.log(foldername+" "+folderpath)
      
      // Update focus state when folder is opened
      if (onFocusChange) {
        onFocusChange('folder', folderpath, currentPath);
      }

      if (ctrlClicked){
        openTagExplorerInNewTab(folder.path);

      }else{}
      
      clickTimeout = null;
    }, CLICK_DELAY);
	}



	function handleFileClick(file:frontendFile, ctrlClicked: boolean) {
    // Delay single-click action to check for double-click
    if (clickTimeout !== null) {
      clearTimeout(clickTimeout);
    }
    
    clickTimeout = window.setTimeout(() => {
      // console.log('File clicked!');
      let filepath = file.path
      let oldpath = currentPath

      // console.log("file path from main view")
      // console.log(filepath)
      
      
      // Update focus state when file is opened
      if (onFocusChange) {
        onFocusChange('file', filepath, oldpath);
        // console.log("i just changed it to file")
      }
      
      clickTimeout = null;
    }, CLICK_DELAY);
	}





	function handleKeyDown(event: KeyboardEvent, handler: Function, item: any) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handler(item);
		}
	}



  function handleMainViewClick() {
      if (onFocusChange) {
        onFocusChange('folder', currentPath, "");
      }
      
  }



  function handleItemClick(event: MouseEvent, handler: Function, item: any) {
    // Stop event from bubbling to main-view
    event.stopPropagation();
    handler(item, event.ctrlKey || event.metaKey);
  }

  async function handleLegendActionButtonClickFolder(event: MouseEvent, currColor:string, tagPath:string ) {
    event.stopPropagation();
    // console.log(currColor)
    // console.log(tagPath);
    // console.log("changing color")
    const newColor = await controller?.cycleLegendForFolder(currColor, tagPath)

    // Update local reactive data
    recomputeMainView()

  }
  async function handleLegendActionButtonClickFile(event: MouseEvent, filePath:string ) {
    event.stopPropagation();
    await controller?.cycleLegendOfFile(filePath,currentPath)

    // Update only this file's cached legend color; avoid full-view recompute
    // recomputeMainView()
    // await new Promise(r => setTimeout(r, 3000));
    // await refreshFileButtonColors();


    // After the action, re-fetch just this file's color
    const file = mainViewData!.files.find(f => f.path === filePath);
    if (file) {
      fileButtonColors[filePath] = await getFileButtonColor(file);
    }
    
  }

  async function getFileButtonColor(file: frontendFile): Promise<string> {

    try {
      if (!controller) {
        throw new Error("controller is not initialized");
      }
      const status = await controller.readLegendStatusOfFile(file.path, currentPath);
      // console.log("- fn getFileButtonColor")
      // console.log("- file.name")
      // console.log(file.name)
      // console.log("- status.color")
      // console.log(status.color)
      // console.log("------------------")
      return status.color || "";
    } catch (e) {
      return "";
    }

  }



  function getFolderButtonColor(folder: frontendFolder): string {
    try {
      if (!controller) {
        throw new Error("model is not initialized");
      }
      // console.log("getting color for ",folder)
      const status = controller.readLegendStatusOfFolder(folder.path);
      // console.log(status)
      // console.log("legend",status.legend)
      return status.legend || "";
    } catch (e) {
      return "";
    }
  }

  async function handlePinnedActionButtonClickFolder(event: MouseEvent, tagPath:string ) {
    event.stopPropagation();

    const newColor = await controller?.cyclePinnedOfFolder(tagPath)

    // Update local reactive data
    recomputeMainView()

  }

  async function handlePinnedActionButtonClickFile(event: MouseEvent, filePath:string ) {
    event.stopPropagation();
    await controller?.cyclePinnedOfFile(filePath,currentPath)

    // recomputeMainView()
    // await new Promise(r => setTimeout(r, 3000));


    // After the action, re-fetch just this file's pinned status
    const file = mainViewData!.files.find(f => f.path === filePath);
    if (file) {
      filePinnedStatuses[filePath] = await getFilePinnedStatus(file);
    }
    
  }

  function getFolderPinnedStatus(folder: frontendFolder): boolean {
    try {
      if (!controller) {
        throw new Error("model is not initialized");
      }
      // console.log("getting color for ",folder)
      const status = controller.readPinnedStatusOfFolder(folder.path);
      // console.log(status)
      // console.log("legend",status.legend)
      return status.pinned || false;
    } catch (e) {
      return false;
    }
  }

  async function getFilePinnedStatus(file: frontendFile): Promise<boolean> {

    try {
      if (!controller) {
        throw new Error("controller is not initialized");
      }
      const status = await controller.readPinnedStatusOfFile(file.path, currentPath);

      return status.pinned || false;
    } catch (e) {
      return false;
    }

  }
    function recomputeMainView(): void {
        refreshKey++
    }


  let fileButtonColors = $state<Record<string, string>>({});
  let filePinnedStatuses = $state<Record<string, boolean>>({});

  const hasPinnedItems = $derived.by(() => {
    if (!mainViewData) return false;

    const hasPinnedFolders = mainViewData.children.some((child) => getFolderPinnedStatus(child) === true);
    const hasPinnedFiles = mainViewData.files.some((file) => filePinnedStatuses[file.path] === true);

    return hasPinnedFolders || hasPinnedFiles;
  });




  // Load all colors initially
  async function loadFileColors() {
    const entries = await Promise.all(
      mainViewData!.files.map(async (file) => [file.path, await getFileButtonColor(file)])
    );
    fileButtonColors = Object.fromEntries(entries);
    console.log("🔵🔵🔵🔵🔵🔵")
    console.log(fileButtonColors)
  }

  // Load all pinned statuses initially
  async function loadFilePinnedStatuses() {
    const entries = await Promise.all(
      mainViewData!.files.map(async (file) => [file.path, await getFilePinnedStatus(file)])
    );
    filePinnedStatuses = Object.fromEntries(entries);
    console.log("🟣🟣🟣🟣🟣🟣")
    console.log(filePinnedStatuses)
  }

  async function loadFileData(){
      await loadFileColors();
      await loadFilePinnedStatuses();
  }

  $effect(() => {
    if (mainViewData!.files) {
      loadFileData();
    }

  });


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
    source: 'internal' | 'external';
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
    const uriPath = parseExternalFilePath(textUriList);
    if (uriPath) {
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


  // function handleDroptest(event: DragEvent) {
  //   event.preventDefault();
  //   if (event.dataTransfer) {
  //     try {
  //       const dataStr = event.dataTransfer
  //       if (!dataStr) return;
        
  //       // const data = JSON.parse(dataStr);

  //       console.log(dataStr)
  //       // Trigger the requested function
  //       // onItemDrop(sourceType, sourcePath, sourceParentPath, targetType, targetPath, targetParentPath, event.ctrlKey || event.metaKey);
  //     } catch (e) {
  //       console.error("Failed to parse drag data:", e);
  //     }
  //   }
  // }



  function handleDrop(event: DragEvent, targetType: 'folder', targetPath: string, targetParentPath: string) {
    event.preventDefault();
    activeIndex = null;
    isBackgroundActive = false
    try {
      const payload = getDragPayload(event);
      if (!payload) return;

      onItemDrop(payload.type, payload.path, payload.parentPath, targetType, targetPath, targetParentPath, payload.source, event.ctrlKey || event.metaKey);

    } catch (e) {
      console.error("Failed to parse drag data:", e);
    }
  }



  function handleBgDrop(event: DragEvent, targetType: 'folder', targetPath: string, targetParentPath: string) {
    event.preventDefault();
    activeIndex = null;
    isBackgroundActive = false
    try {
      const payload = getDragPayload(event);
      if (!payload) return;

      if(payload.type == "folder"){
        // Trigger the requested function
        onItemDrop(payload.type, payload.path, payload.parentPath, targetType, targetPath, "", "internal", event.ctrlKey || event.metaKey);
      }
      if(payload.type == "file"){
        if(targetPath != ""){

          onItemDrop(payload.type, payload.path, payload.parentPath, targetType, targetPath, targetParentPath, payload.source, event.ctrlKey || event.metaKey);
        }
      }
    } catch (e) {
      console.error("Failed to parse drag data:", e);
    }
  }


let activeIndex: number | null = $state(null);
let isBackgroundActive: boolean = $state(false);


function handleDragEnter(index: number) {
  activeIndex = index;
}

function handleDragLeave(event: DragEvent, index: number) {
  const target = event.currentTarget as HTMLElement;
  const related = event.relatedTarget as Node | null;
  if (target && related && !target.contains(related)) {
    activeIndex = null;
  }
}


function handleBackgroundDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';

  }

  isBackgroundActive = activeIndex === null;
}

function handleBackgroundDragLeave(event: DragEvent) {
  const target = event.currentTarget as HTMLElement;
  const related = event.relatedTarget as Node | null;
  if (!target.contains(related)) {
    isBackgroundActive = false;
    activeIndex = null; 
  }
}



</script>

{#if mainViewData}

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div 
class="main-view-container" 
onclick={handleMainViewClick}
draggable="false"

ondrop={(e) => handleBgDrop(e, "folder", mainViewData.path, mainViewData.parent ?? "")}


class:active={isBackgroundActive}
ondragover={(e) => handleBackgroundDragOver(e)}
ondragleave={handleBackgroundDragLeave}
>


  <div class="main-content-area">

    {#if mainViewData}
      <!-- <pre class="debug-info">{JSON.stringify(mainViewData, null, 2)}</pre> -->
      
    {/if}


    <div class="main-view" >
      {#if mainViewData}
        {#if viewForm == "blocks"}
          <div class="file-grid">
            <!-- Render child folders/tags -->
            {#each mainViewData.children as child, index}
              {#if getFolderPinnedStatus(child) == true}
                <div 
                class="item-blocks folder" 
                role="button" 
                tabindex="0" 
                title="{child.path}" 
                onclick={(e) => handleItemClick(e, handleFolderClick, child)}  
                ondblclick={(e) => { e.stopPropagation(); handleFolderDblClick(child); }} 
                onkeydown={(e) => handleKeyDown(e, handleFolderDblClick, child)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, 'folder', child.path, child.parentPath)}
                ondragover={handleDragOver}
                ondrop={(e) => handleDrop(e, "folder", child.path, child.parentPath)}

                class:active={activeIndex === index}
                ondragenter={() => handleDragEnter(index)}
                ondragleave={(e) => handleDragLeave(e, index)}

                >
                  <div class="icon-blocks">📁</div>
                  <div class="label-blocks">{child.name}</div>
                  {#if currentPath !== ""}
                    <button class="legend-button circle" class:hidden={getFolderButtonColor(child) === ""} style="background-color: {getColorForName(getFolderButtonColor(child))}" onclick={(e) => handleLegendActionButtonClickFolder(e, getFolderButtonColor(child) ,child.path)} ondblclick={(e) => e.stopPropagation()} title="Legend: {getFolderButtonColor(child)}"></button>
                  {/if}
                    
                  <button class="top-left square"   class:pinned={getFolderPinnedStatus(child) == true} onclick={(e) => handlePinnedActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} title="Pinned">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                  </button>
                </div>
              {/if}
            {/each}

            <!-- Render files -->
            {#if currentPath != ""}
              {#each mainViewData.files as file}
                {#if filePinnedStatuses[file.path] === true}

                  <div 
                  class="item-blocks file" 
                  role="button" 
                  tabindex="0" 
                  title="{file.path}" 
                  onclick={(e) => handleItemClick(e, handleFileClick, file)} 
                  ondblclick={(e) => { e.stopPropagation(); handleFileDblClick(file); }} 
                  onkeydown={(e) => handleKeyDown(e, handleFileDblClick, file)}
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, 'file', file.path, file.parentPath)}
                  ondragover={handleDragOverDisabled}
                  ondrop={(e) => handleDropDisabled(e, "file", file.path, file.parentPath)}
                  >
                    <div class="icon-blocks">📄</div>
                    <div class="label-blocks">{file.name}</div>
                    {#if currentPath !== ""}
                      <!-- <button class="legend-button circle" class:hidden={await getFileButtonColor(file) === ""} style="background-color: {getColorForName( await getFileButtonColor(file))}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Action"></button> -->
                      <button class="legend-button circle" class:hidden={!fileButtonColors[file.path]}  style="background-color: {fileButtonColors[file.path] ?? ''}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Legend: {fileButtonColors[file.path]}"></button>
                    {/if} 

                    <button class="top-left square" class:pinned={filePinnedStatuses[file.path] === true} onclick={(e) => handlePinnedActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Pinned">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                    </button>

                  </div>
                {/if}
              {/each}
            {/if}
          </div>

          {#if hasPinnedItems}
            <div class="section-divider"></div>
          {/if}
          <div class="file-grid">
            <!-- Render child folders/tags -->
            {#each mainViewData.children as child, index}
              {#if getFolderPinnedStatus(child) == false}
                <div 
                class="item-blocks folder" 
                role="button" 
                tabindex="0" 
                title="{child.path}" 
                onclick={(e) => handleItemClick(e, handleFolderClick, child)}  
                ondblclick={(e) => { e.stopPropagation(); handleFolderDblClick(child); }} 
                onkeydown={(e) => handleKeyDown(e, handleFolderDblClick, child)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, 'folder', child.path, child.parentPath)}
                ondragover={handleDragOver}
                ondrop={(e) => handleDrop(e, "folder", child.path, child.parentPath)}

                class:active={activeIndex === index}
                ondragenter={() => handleDragEnter(index)}
                ondragleave={(e) => handleDragLeave(e, index)}

                >
                  <div class="icon-blocks">📁</div>
                  <div class="label-blocks">{child.name}</div>
                  {#if currentPath !== ""}
                    <button class="legend-button circle" class:hidden={getFolderButtonColor(child) === ""} style="background-color: {getColorForName(getFolderButtonColor(child))}" onclick={(e) => handleLegendActionButtonClickFolder(e, getFolderButtonColor(child) ,child.path)} ondblclick={(e) => e.stopPropagation()} title="Legend: {getFolderButtonColor(child)}"></button>
                  {/if}
                    
                  <button class="top-left square"   class:pinned={getFolderPinnedStatus(child) == true} onclick={(e) => handlePinnedActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} title="Pinned">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                  </button>
                </div>
              {/if}
            {/each}

            <!-- Render files -->
            {#if currentPath != ""}

              {#each mainViewData.files as file}
                {#if filePinnedStatuses[file.path] === false}

                  <div 
                  class="item-blocks file" 
                  role="button" 
                  tabindex="0" 
                  title="{file.path}" 
                  onclick={(e) => handleItemClick(e, handleFileClick, file)} 
                  ondblclick={(e) => { e.stopPropagation(); handleFileDblClick(file); }} 
                  onkeydown={(e) => handleKeyDown(e, handleFileDblClick, file)}
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, 'file', file.path, file.parentPath)}
                  ondragover={handleDragOverDisabled}
                  ondrop={(e) => handleDropDisabled(e, "file", file.path, file.parentPath)}
                  >
                    <div class="icon-blocks">📄</div>
                    <div class="label-blocks">{file.name}</div>
                    {#if currentPath !== ""}
                      <!-- <button class="legend-button circle" class:hidden={await getFileButtonColor(file) === ""} style="background-color: {getColorForName( await getFileButtonColor(file))}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Action"></button> -->
                      <button class="legend-button circle" class:hidden={!fileButtonColors[file.path]}  style="background-color: {fileButtonColors[file.path] ?? ''}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Legend: {fileButtonColors[file.path]}"></button>
                    {/if} 

                    <button class="top-left square" class:pinned={filePinnedStatuses[file.path] === true} onclick={(e) => handlePinnedActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Pinned">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                    </button>

                  </div>
                {/if}
              {/each}
            {/if}
          </div>
        {:else if viewForm == "list" }
          <div class="file-list">
            <!-- Render child folders/tags -->
            {#each mainViewData.children as child, index}
              {#if getFolderPinnedStatus(child) == true}
                <div 
                class="item-list folder" 
                role="button" 
                tabindex="0" 
                title="{child.path}" 
                onclick={(e) => handleItemClick(e, handleFolderClick, child)}  
                ondblclick={(e) => { e.stopPropagation(); handleFolderDblClick(child); }} 
                onkeydown={(e) => handleKeyDown(e, handleFolderDblClick, child)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, 'folder', child.path, child.parentPath)}
                ondragover={handleDragOver}
                ondrop={(e) => handleDrop(e, "folder", child.path, child.parentPath)}

                class:active={activeIndex === index}
                ondragenter={() => handleDragEnter(index)}
                ondragleave={(e) => handleDragLeave(e, index)}

                >
                  <div class="icon-list">📁</div>
                  <div class="label-list">{child.name}</div>
                  {#if currentPath !== ""}
                    <button class="legend-button circle" class:hidden={getFolderButtonColor(child) === ""} style="background-color: {getColorForName(getFolderButtonColor(child))}" onclick={(e) => handleLegendActionButtonClickFolder(e, getFolderButtonColor(child) ,child.path)} ondblclick={(e) => e.stopPropagation()} title="Legend: {getFolderButtonColor(child)}"></button>
                  {/if}
                    
                  <button class="top-left-list square"   class:pinned={getFolderPinnedStatus(child) == true} onclick={(e) => handlePinnedActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} title="Pinned">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                  </button>
                </div>
              {/if}
            {/each}

            <!-- Render files -->
            {#if currentPath != ""}
              {#each mainViewData.files as file}
                {#if filePinnedStatuses[file.path] === true}

                  <div 
                  class="item-list file" 
                  role="button" 
                  tabindex="0" 
                  title="{file.path}" 
                  onclick={(e) => handleItemClick(e, handleFileClick, file)} 
                  ondblclick={(e) => { e.stopPropagation(); handleFileDblClick(file); }} 
                  onkeydown={(e) => handleKeyDown(e, handleFileDblClick, file)}
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, 'file', file.path, file.parentPath)}
                  ondragover={handleDragOverDisabled}
                  ondrop={(e) => handleDropDisabled(e, "file", file.path, file.parentPath)}
                  >
                    <div class="icon-list">📄</div>
                    <div class="label-list">{file.name}</div>
                    {#if currentPath !== ""}
                      <!-- <button class="legend-button circle" class:hidden={await getFileButtonColor(file) === ""} style="background-color: {getColorForName( await getFileButtonColor(file))}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Action"></button> -->
                      <button class="legend-button circle" class:hidden={!fileButtonColors[file.path]}  style="background-color: {fileButtonColors[file.path] ?? ''}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Legend: {fileButtonColors[file.path]}"></button>
                    {/if} 

                    <button class="top-left-list square" class:pinned={filePinnedStatuses[file.path] === true} onclick={(e) => handlePinnedActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Pinned">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                    </button>

                  </div>
                {/if}
              {/each}
            {/if}
          </div>
          
          {#if hasPinnedItems}
            <div class="section-divider"></div>
          {/if}
          <div class="file-list">
            <!-- Render child folders/tags -->
            {#each mainViewData.children as child, index}
              {#if getFolderPinnedStatus(child) == false}
                <div 
                class="item-list folder" 
                role="button" 
                tabindex="0" 
                title="{child.path}" 
                onclick={(e) => handleItemClick(e, handleFolderClick, child)}  
                ondblclick={(e) => { e.stopPropagation(); handleFolderDblClick(child); }} 
                onkeydown={(e) => handleKeyDown(e, handleFolderDblClick, child)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, 'folder', child.path, child.parentPath)}
                ondragover={handleDragOver}
                ondrop={(e) => handleDrop(e, "folder", child.path, child.parentPath)}

                class:active={activeIndex === index}
                ondragenter={() => handleDragEnter(index)}
                ondragleave={(e) => handleDragLeave(e, index)}

                >
                  <div class="icon-list">📁</div>
                  <div class="label-list">{child.name}</div>
                  {#if currentPath !== ""}
                    <button class="legend-button circle" class:hidden={getFolderButtonColor(child) === ""} style="background-color: {getColorForName(getFolderButtonColor(child))}" onclick={(e) => handleLegendActionButtonClickFolder(e, getFolderButtonColor(child) ,child.path)} ondblclick={(e) => e.stopPropagation()} title="Legend: {getFolderButtonColor(child)}"></button>
                  {/if}
                    
                  <button class="top-left-list square"   class:pinned={getFolderPinnedStatus(child) == true} onclick={(e) => handlePinnedActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} title="Pinned">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                  </button>
                </div>
              {/if}
            {/each}

            <!-- Render files -->
            {#if currentPath != ""}

              {#each mainViewData.files as file}
                {#if filePinnedStatuses[file.path] === false}

                  <div 
                  class="item-list file" 
                  role="button" 
                  tabindex="0" 
                  title="{file.path}" 
                  onclick={(e) => handleItemClick(e, handleFileClick, file)} 
                  ondblclick={(e) => { e.stopPropagation(); handleFileDblClick(file); }} 
                  onkeydown={(e) => handleKeyDown(e, handleFileDblClick, file)}
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, 'file', file.path, file.parentPath)}
                  ondragover={handleDragOverDisabled}
                  ondrop={(e) => handleDropDisabled(e, "file", file.path, file.parentPath)}
                  >
                    <div class="icon-list">📄</div>
                    <div class="label-list">{file.name}</div>
                    {#if currentPath !== ""}
                      <!-- <button class="legend-button circle" class:hidden={await getFileButtonColor(file) === ""} style="background-color: {getColorForName( await getFileButtonColor(file))}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Action"></button> -->
                      <button class="legend-button circle" class:hidden={!fileButtonColors[file.path]}  style="background-color: {fileButtonColors[file.path] ?? ''}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Legend: {fileButtonColors[file.path]}"></button>
                    {/if} 

                    <button class="top-left-list square" class:pinned={filePinnedStatuses[file.path] === true} onclick={(e) => handlePinnedActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Pinned">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                    </button>

                  </div>
                {/if}
              {/each}
            {/if}
          </div>

        {:else if viewForm == "details" }
          <div class="empty-state">
            <p>Details view coming soon</p>
          </div>
        {/if}
      {:else}
        <div class="empty-state">
          <p>No data available for this path</p>
        </div>
      {/if}
    </div>  











  </div>
</div>

{/if}


<style>
  .main-view-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }


  .main-content-area {
    flex: 1;
    overflow: auto;
    min-height: 0;
    padding: 16px;
  }



.file-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(120px, 1fr));
  gap:12px;
}

.file-list{
  display: flex;
  flex-direction: column;
  gap: 12px;
}


.item-blocks{
  /* border:10px solid blue; */
  /* border: 1px solid var(--background-modifier-border); */

  position: relative;
  border-radius:6px;
  padding:12px 8px;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:6px;
  cursor:pointer;
  user-select:none;
}

.item-blocks:hover{
  /* background:var(--bg-item-hover); */
  background: var(--background-modifier-border);


}

.item-blocks:focus{
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
  background: var(--background-modifier-border);
}


.item-list{
  /* border:10px solid blue; */
  /* border: 1px solid var(--background-modifier-border); */

  position: relative;
  border-radius:6px;
  padding:12px 14px;
  display:flex;
  flex-direction:row;
  align-items:center;
  gap:6px;
  cursor:pointer;
  user-select:none;
}

.item-list:hover{
  /* background:var(--bg-item-hover); */
  background: var(--background-modifier-border);


}

.item-list:focus{
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
  background: var(--background-modifier-border);
}



.icon-blocks{
  font-size:28px;
  line-height:1;
}

.icon-list{
  font-size:20px;
  line-height:1;
}

.label-blocks{
  font-size:13px;
  text-align:center;
  word-break:break-word;
}

.label-list{
  font-size:13px;
  text-align:center;
  margin-left: 15px;
}

.legend-button {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid var(--background-secondary-alt);
  border-radius: 3px;
  background: var(--background-secondary);
  cursor: pointer;

}
.top-left{
  position: absolute;
  top: 4px;
  left: 4px;

  padding: 0;
  /* background: var(--background-secondary); */
  cursor: pointer;
  opacity: 0%;

}


.top-left-list{
  position: absolute;
  top: 2px;
  left: 1px;

  padding: 0;
  /* background: var(--background-secondary); */
  cursor: pointer;
  opacity: 0%;

}

.item-blocks:hover .legend-button {
  display: block;
}

.item-list:hover .legend-button {
  display: block;
}

.legend-button:hover {
  background: var(--background-secondary-alt);
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}



.circle {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #333;
  opacity: 50%;
  transition: opacity 0.3s ease; /* smooth fade */
}

.item-blocks:hover .circle {
  opacity: 1;
}

.item-list:hover .circle {
  opacity: 1;
}

.square {
  display: inline-block;
  width: 16px;
  height: 16px;
  /* border: 1px solid #333; */
  transition: opacity 0.3s ease; /* smooth fade */
  box-shadow: none;
  background: transparent;
}

.item-blocks:hover .square {
  opacity: 1;
}

.item-list:hover .square {
  opacity: 1;
}

.hidden {

  opacity: 0;
}

.pinned{
  opacity: 1;

}
.pinned svg {
  stroke: var(--color-accent);
}


.active {
  background-color: color-mix(in srgb, var(--interactive-accent) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 60%, transparent);
}

.section-divider{
  height: 5px;
    background: #ffffff0a;
    margin: 20px;
    border-radius: 10px;
}

</style>
