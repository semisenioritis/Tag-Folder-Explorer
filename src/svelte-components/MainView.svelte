<script lang="ts">
  import { logger } from '../utils/logger';
  import { onDestroy } from 'svelte';
  import { Menu } from 'obsidian';
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



  // Track click timeouts to prevent single-click on double-click
  let clickTimeout: number | null = null;
  const CLICK_DELAY = 250; // milliseconds

  function handleContextMenu(event: MouseEvent, type: 'folder' | 'file', item: frontendFolder | frontendFile) {
    event.preventDefault();
    event.stopPropagation();

    const menu = new Menu();
    
    if(type == "file"){

      // Commenteing this out cuz for some reason it was not displaying the results on the ui so just sticking to the classic controlls

      // menu.addItem((menuItem) =>
      //   menuItem
      //     .setTitle(`Add Legend`)
      //     .setIcon("pencil")
      //     .onClick(async() => {
      //       if (currentPath != ""){
      //         await controller!.triggerLegendModal(type, item.path, currentPath)

      //         // After the action, re-fetch just this file's color
      //         const file = mainViewData!.files.find(f => f.path === item.path);
      //         if (file) {
      //           fileButtonColors[item.path] = await getFileButtonColor(file);
      //         }

      //       }
      //     })
      // );
      
      menu.addItem((menuItem) =>
        menuItem
          .setTitle(`Toggle Pin`)
          .setIcon("pin")
          .onClick(async() => {
            await controller?.cyclePinnedOfFile(item.path, currentPath)

            const file = mainViewData!.files.find(f => f.path === item.path);
            if (file) {
              filePinnedStatuses[item.path] = await getFilePinnedStatus(file);
            }
          })
      );

      // Commenting out for now. 

      // menu.addItem((menuItem) =>
      //   menuItem
      //     .setTitle(`Toggle Legend Lock`)
      //     .setIcon("pencil")
      //     .onClick(() => {

      //       console.log(`Dummy Toggle Legend Lock`);
      //     })
      // );

      // menu.addItem((menuItem) =>
      //   menuItem
      //     .setTitle(`Toggle Pin Lock`)
      //     .setIcon("pencil")
      //     .onClick(() => {
      //       console.log(`Dummy Toggle Pin Lock`);
      //     })
      // );
      

      // menu.addItem((menuItem) =>
      //   menuItem
      //     .setTitle(`Toggle Bookmark`)
      //     .setIcon("pencil")
      //     .onClick(() => {
      //       console.log(`Toggle Bookmark`);
      //     })
      // );
      
      menu.addItem((menuItem) =>
        menuItem
          .setTitle(`Copy File To...`)
          .setIcon("clipboard-plus")
          .onClick(async() => {
            await controller!.triggerCopyModal(type, item.path, currentPath)
          })
      );


      menu.addItem((menuItem) =>
        menuItem
          .setTitle(`Move File To...`)
          .setIcon("file-symlink")
          .onClick(async() => {
            await controller!.triggerMoveModal(type, item.path, currentPath)
          })
      );


      menu.addItem((menuItem) =>
        menuItem
          .setTitle(`Reveal File`)
          .setIcon("file-search-corner")
          .onClick(async() => {
            await controller!.revealFileInNavigation( item.path)
          })
      );

      menu.addItem((menuItem) =>
        menuItem
          .setTitle(`Rename File`)
          .setIcon("text-cursor-input")
          .onClick(async() => {
            await controller!.triggerRenameModal(type, item.path, currentPath)
          })
      );

      menu.addItem((menuItem) =>
        menuItem
          .setTitle(`Remove File`)
          .setIcon("trash-2")
          .onClick(async() => {
            await controller!.triggerDeleteModal(type, item.path, currentPath)
          })
      );
      

    }else if(type == "folder"){

      // Commenteing this out cuz for some reason it was not displaying the results on the ui so just sticking to the classic controlls

      // menu.addItem((menuItem) =>
      //   menuItem
      //     .setTitle(`Add Legend`)
      //     .setIcon("pencil")
      //     .onClick(async() => {
      //       if (currentPath != ""){
      //         await controller!.triggerLegendModal(type, item.path, currentPath)
      //         recomputeMainView()

      //       }
      //     })
      // );
      
      menu.addItem((menuItem) =>
        menuItem
          .setTitle(`Toggle Pin`)
          .setIcon("pin")
          .onClick(async() => {
            await controller?.cyclePinnedOfFolder(item.path)
            recomputeMainView()

          })
      );

      // Commenting out for now. 

      // menu.addItem((menuItem) =>
      //   menuItem
      //     .setTitle(`Toggle Legend Lock`)
      //     .setIcon("pencil")
      //     .onClick(() => {
      //       console.log(`Dummy Toggle Legend Lock`);
      //     })
      // );

      // menu.addItem((menuItem) =>
      //   menuItem
      //     .setTitle(`Toggle Pin Lock`)
      //     .setIcon("pencil")
      //     .onClick(() => {
      //       console.log(`Dummy Toggle Pin Lock`);
      //     })
      // );
      

      // menu.addItem((menuItem) =>
      //   menuItem
      //     .setTitle(`Toggle Bookmark`)
      //     .setIcon("pencil")
      //     .onClick(() => {
      //       console.log(`Dummy Toggle Bookmark`);
      //     })
      // );
      
      menu.addItem((menuItem) =>
        menuItem
          .setTitle(`Copy Folder To...`)
          .setIcon("clipboard-plus")
          .onClick(async() => {
            await controller!.triggerCopyModal(type, item.path, currentPath)
          })
      );

      menu.addItem((menuItem) =>
        menuItem
          .setTitle(`Move Folder To...`)
          .setIcon("folder-symlink")
          .onClick(async() => {
            await controller!.triggerMoveModal(type, item.path, currentPath)
          })
      );

      menu.addItem((menuItem) =>
        menuItem
          .setTitle(`Dulpicate Folder`)
          .setIcon("folder-plus")
          .onClick(async() => {
            await controller!.recreateFolder(item.path, currentPath)
          })
      );

      menu.addItem((menuItem) =>
        menuItem
          .setTitle(`Rename Folder`)
          .setIcon("text-cursor-input")
          .onClick(async() => {
            await controller!.triggerRenameModal(type, item.path, currentPath)
          })
      );
    
    menu.addItem((menuItem) =>
      menuItem
        .setTitle(`Delete Folder`)
        .setIcon("trash-2")
        .onClick(async() => {
          await controller!.triggerDeleteModal(type, item.path, currentPath)
        })
    );
    
  }

    // Show the menu at the cursor position
    menu.showAtMouseEvent(event);
  }

  function handleFolderDblClick(folder:frontendFolder) {
    // Cancel any pending single-click
    if (clickTimeout !== null) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }
 
    let foldername = folder.name
    let folderpath = folder.path
    let oldpath = currentPath

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

    let filepath = file.path
    let oldpath = currentPath

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
      let filepath = file.path
      let oldpath = currentPath

      
      
      // Update focus state when file is opened
      if (onFocusChange) {
        onFocusChange('file', filepath, oldpath);
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

  async function handleLegendActionButtonClickFolder(event: MouseEvent, tagPath:string ) {
    event.stopPropagation();
    const newColor = await controller?.cycleLegendForFolder( tagPath)

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
      const status = controller.readLegendStatusOfFolder(folder.path);
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
      const status = controller.readPinnedStatusOfFolder(folder.path);
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
  }

  // Load all pinned statuses initially
  async function loadFilePinnedStatuses() {
    const entries = await Promise.all(
      mainViewData!.files.map(async (file) => [file.path, await getFilePinnedStatus(file)])
    );
    filePinnedStatuses = Object.fromEntries(entries);
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
    activeDropTargetKey = null;
    if (event.dataTransfer) {

      event.dataTransfer.dropEffect = 'none';
    }
  }

  function handleDropDisabled(event: DragEvent, targetType: 'folder' | 'file', targetPath: string, parentPath:string) {
    event.preventDefault();
    activeDropTargetKey = null;
    isBackgroundActive = false;
    if (event.dataTransfer) {
      try {
        event.dataTransfer.dropEffect = 'none';
      } catch (e) {
        logger.error("Failed to parse drag data:", e);
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


  function getDropTargetKey(type: 'folder' | 'file', path: string, parentPath: string): string {
    return `${type}|${path}|${parentPath}`;
  }

  
  function handleDragOver(event: DragEvent, dropTargetKey?: string) {
    event.preventDefault(); // Necessary to allow dropping
    if (dropTargetKey && activeDropTargetKey !== dropTargetKey) {
      activeDropTargetKey = dropTargetKey;
      isBackgroundActive = false;
    }
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
    activeDropTargetKey = null;
    isBackgroundActive = false
    try {
      const payload = getDragPayload(event);
      if (!payload) return;

      onItemDrop(payload.type, payload.path, payload.parentPath, targetType, targetPath, targetParentPath, payload.source, event.ctrlKey || event.metaKey);

    } catch (e) {
      logger.error("Failed to parse drag data:", e);
    }
  }



  function handleBgDrop(event: DragEvent, targetType: 'folder', targetPath: string, targetParentPath: string) {
    event.preventDefault();
    activeDropTargetKey = null;
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
      logger.error("Failed to parse drag data:", e);
    }
  }


let activeDropTargetKey: string | null = $state(null);
let isBackgroundActive: boolean = $state(false);


function handleBackgroundDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';

  }

  isBackgroundActive = activeDropTargetKey === null;
}

function handleBackgroundDragLeave(event: DragEvent) {
  const target = event.currentTarget as HTMLElement;
  const related = event.relatedTarget as Node | null;
  if (!target.contains(related)) {
    isBackgroundActive = false;
    activeDropTargetKey = null; 
  }
}

function handleDragSessionEnd() {
  activeDropTargetKey = null;
  isBackgroundActive = false;
}

interface DetailsColumn {
  id: string;
  label: string;
  width: number;
  minWidth: number;
}


let detailsColumns = $state<DetailsColumn[]>([
  { id: 'type', label: 'Type', width: 50, minWidth: 50 },
  { id: 'name', label: 'Name', width: 260, minWidth: 160 },
  { id: 'desc', label: 'Description', width: 380, minWidth: 80 },
  { id: 'path', label: 'Path', width: 320, minWidth: 180 },
  { id: 'created', label: 'Created Time', width: 175, minWidth: 67 },
  { id: 'modified', label: 'Last Mod Time', width: 175, minWidth: 67 },
  { id: 'contents', label: 'Contents', width: 380, minWidth: 80 },
  { id: 'parent', label: 'Parent', width: 100, minWidth: 80 },
  { id: 'legend', label: 'Legend', width: 110, minWidth: 50 },
  { id: 'pinned', label: 'Pinned', width: 100, minWidth: 50 },
]);

const detailsGridTemplate = $derived.by(() => detailsColumns.map((column) => `${column.width}px`).join(' '));

let resizingColumnId: string | null = null;
let resizeStartX = 0;
let resizeStartWidth = 0;

function handleDetailsResizeStart(event: MouseEvent, columnId: string) {
  event.preventDefault();
  event.stopPropagation();

  const column = detailsColumns.find((item) => item.id === columnId);
  if (!column) return;

  resizingColumnId = columnId;
  resizeStartX = event.clientX;
  resizeStartWidth = column.width;

  window.addEventListener('mousemove', handleDetailsResizeMove);
  window.addEventListener('mouseup', handleDetailsResizeEnd);
}

function handleDetailsResizeMove(event: MouseEvent) {
  if (!resizingColumnId) return;

  const deltaX = event.clientX - resizeStartX;

  detailsColumns = detailsColumns.map((column) => {
    if (column.id !== resizingColumnId) return column;

    return {
      ...column,
      width: Math.max(column.minWidth, resizeStartWidth + deltaX),
    };
  });
}

function handleDetailsResizeEnd() {
  resizingColumnId = null;
  window.removeEventListener('mousemove', handleDetailsResizeMove);
  window.removeEventListener('mouseup', handleDetailsResizeEnd);
}

onDestroy(() => {
  window.removeEventListener('mousemove', handleDetailsResizeMove);
  window.removeEventListener('mouseup', handleDetailsResizeEnd);
});


function formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        hour12: false, 
        year: 'numeric', 
        month: 'numeric', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(',', '');
}


</script>

{#if mainViewData}

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div 
class="main-view-container" 
onclick={handleMainViewClick}
draggable="false"
ondragend={handleDragSessionEnd}

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
                oncontextmenu={(e) => handleContextMenu(e, 'folder', child)}
                ondblclick={(e) => { e.stopPropagation(); handleFolderDblClick(child); }} 
                onkeydown={(e) => handleKeyDown(e, handleFolderDblClick, child)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, 'folder', child.path, child.parentPath)}
                ondragover={(e) => handleDragOver(e, getDropTargetKey('folder', child.path, child.parentPath))}
                ondrop={(e) => handleDrop(e, "folder", child.path, child.parentPath)}

                class:active={activeDropTargetKey === getDropTargetKey('folder', child.path, child.parentPath)}

                >
                  <div class="icon-blocks">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c1acec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-icon lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></div>
                  <div class="label-blocks">{child.name}</div>
                  {#if currentPath !== ""}
                    <button class="legend-button circle" class:hidden={getFolderButtonColor(child) === ""} style="background-color: {getColorForName(getFolderButtonColor(child))}" onclick={(e) => handleLegendActionButtonClickFolder(e ,child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {getFolderButtonColor(child)}"></button>
                  {/if}
                    
                  <button class="top-left square"   class:pinned={getFolderPinnedStatus(child) == true} onclick={(e) => handlePinnedActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Pin">
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
                  aria-label="{file.path}" 
                  onclick={(e) => handleItemClick(e, handleFileClick, file)} 
                  oncontextmenu={(e) => handleContextMenu(e, 'file', file)}
                  ondblclick={(e) => { e.stopPropagation(); handleFileDblClick(file); }} 
                  onkeydown={(e) => handleKeyDown(e, handleFileDblClick, file)}
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, 'file', file.path, file.parentPath)}
                  ondragover={handleDragOverDisabled}
                  ondrop={(e) => handleDropDisabled(e, "file", file.path, file.parentPath)}
                  >
                    <div class="icon-blocks">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffffB0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></div>
                    <div class="label-blocks">{file.name}</div>
                    {#if currentPath !== ""}
                      <!-- <button class="legend-button circle" class:hidden={await getFileButtonColor(file) === ""} style="background-color: {getColorForName( await getFileButtonColor(file))}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Action"></button> -->
                      <button class="legend-button circle" class:hidden={!fileButtonColors[file.path]}  style="background-color: {fileButtonColors[file.path] ?? ''}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {fileButtonColors[file.path]}"></button>
                    {/if} 

                    <button class="top-left square" class:pinned={filePinnedStatuses[file.path] === true} onclick={(e) => handlePinnedActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Pin">
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
                aria-label="{child.path}" 
                onclick={(e) => handleItemClick(e, handleFolderClick, child)}  
                oncontextmenu={(e) => handleContextMenu(e, 'folder', child)}
                ondblclick={(e) => { e.stopPropagation(); handleFolderDblClick(child); }} 
                onkeydown={(e) => handleKeyDown(e, handleFolderDblClick, child)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, 'folder', child.path, child.parentPath)}
                ondragover={(e) => handleDragOver(e, getDropTargetKey('folder', child.path, child.parentPath))}
                ondrop={(e) => handleDrop(e, "folder", child.path, child.parentPath)}

                class:active={activeDropTargetKey === getDropTargetKey('folder', child.path, child.parentPath)}

                >
                  <div class="icon-blocks">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c1acec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-icon lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></div>
                  <div class="label-blocks">{child.name}</div>
                  {#if currentPath !== ""}
                    <button class="legend-button circle" class:hidden={getFolderButtonColor(child) === ""} style="background-color: {getColorForName(getFolderButtonColor(child))}" onclick={(e) => handleLegendActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {getFolderButtonColor(child)}"></button>
                  {/if}
                    
                  <button class="top-left square"   class:pinned={getFolderPinnedStatus(child) == true} onclick={(e) => handlePinnedActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Pin">
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
                  aria-label="{file.path}" 
                  onclick={(e) => handleItemClick(e, handleFileClick, file)} 
                  oncontextmenu={(e) => handleContextMenu(e, 'file', file)}
                  ondblclick={(e) => { e.stopPropagation(); handleFileDblClick(file); }} 
                  onkeydown={(e) => handleKeyDown(e, handleFileDblClick, file)}
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, 'file', file.path, file.parentPath)}
                  ondragover={handleDragOverDisabled}
                  ondrop={(e) => handleDropDisabled(e, "file", file.path, file.parentPath)}
                  >
                    <div class="icon-blocks">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffffB0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></div>
                    <div class="label-blocks">{file.name}</div>
                    {#if currentPath !== ""}
                      <!-- <button class="legend-button circle" class:hidden={await getFileButtonColor(file) === ""} style="background-color: {getColorForName( await getFileButtonColor(file))}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Action"></button> -->
                      <button class="legend-button circle" class:hidden={!fileButtonColors[file.path]}  style="background-color: {fileButtonColors[file.path] ?? ''}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {fileButtonColors[file.path]}"></button>
                    {/if} 

                    <button class="top-left square" class:pinned={filePinnedStatuses[file.path] === true} onclick={(e) => handlePinnedActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Pin">
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
                aria-label="{child.path}" 
                onclick={(e) => handleItemClick(e, handleFolderClick, child)}  
                oncontextmenu={(e) => handleContextMenu(e, 'folder', child)}
                ondblclick={(e) => { e.stopPropagation(); handleFolderDblClick(child); }} 
                onkeydown={(e) => handleKeyDown(e, handleFolderDblClick, child)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, 'folder', child.path, child.parentPath)}
                ondragover={(e) => handleDragOver(e, getDropTargetKey('folder', child.path, child.parentPath))}
                ondrop={(e) => handleDrop(e, "folder", child.path, child.parentPath)}

                class:active={activeDropTargetKey === getDropTargetKey('folder', child.path, child.parentPath)}

                >
                  <div class="icon-list">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c1acec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-icon lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></div>
                  <div class="label-list">{child.name}</div>
                  {#if currentPath !== ""}
                    <button class="legend-button circle" class:hidden={getFolderButtonColor(child) === ""} style="background-color: {getColorForName(getFolderButtonColor(child))}" onclick={(e) => handleLegendActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {getFolderButtonColor(child)}"></button>
                  {/if}
                    
                  <button class="top-left-list square"   class:pinned={getFolderPinnedStatus(child) == true} onclick={(e) => handlePinnedActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Pin">
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
                  aria-label="{file.path}" 
                  onclick={(e) => handleItemClick(e, handleFileClick, file)} 
                  oncontextmenu={(e) => handleContextMenu(e, 'file', file)}
                  ondblclick={(e) => { e.stopPropagation(); handleFileDblClick(file); }} 
                  onkeydown={(e) => handleKeyDown(e, handleFileDblClick, file)}
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, 'file', file.path, file.parentPath)}
                  ondragover={handleDragOverDisabled}
                  ondrop={(e) => handleDropDisabled(e, "file", file.path, file.parentPath)}
                  >
                    <div class="icon-list">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffffB0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></div>
                    <div class="label-list">{file.name}</div>
                    {#if currentPath !== ""}
                      <!-- <button class="legend-button circle" class:hidden={await getFileButtonColor(file) === ""} style="background-color: {getColorForName( await getFileButtonColor(file))}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Action"></button> -->
                      <button class="legend-button circle" class:hidden={!fileButtonColors[file.path]}  style="background-color: {fileButtonColors[file.path] ?? ''}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {fileButtonColors[file.path]}"></button>
                    {/if} 

                    <button class="top-left-list square" class:pinned={filePinnedStatuses[file.path] === true} onclick={(e) => handlePinnedActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Pin">
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
                aria-label="{child.path}" 
                onclick={(e) => handleItemClick(e, handleFolderClick, child)}  
                oncontextmenu={(e) => handleContextMenu(e, 'folder', child)}
                ondblclick={(e) => { e.stopPropagation(); handleFolderDblClick(child); }} 
                onkeydown={(e) => handleKeyDown(e, handleFolderDblClick, child)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, 'folder', child.path, child.parentPath)}
                ondragover={(e) => handleDragOver(e, getDropTargetKey('folder', child.path, child.parentPath))}
                ondrop={(e) => handleDrop(e, "folder", child.path, child.parentPath)}

                class:active={activeDropTargetKey === getDropTargetKey('folder', child.path, child.parentPath)}

                >
                  <div class="icon-list">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c1acec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-icon lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></div>
                  <div class="label-list">{child.name}</div>
                  {#if currentPath !== ""}
                    <button class="legend-button circle" class:hidden={getFolderButtonColor(child) === ""} style="background-color: {getColorForName(getFolderButtonColor(child))}" onclick={(e) => handleLegendActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {getFolderButtonColor(child)}"></button>
                  {/if}
                    
                  <button class="top-left-list square"   class:pinned={getFolderPinnedStatus(child) == true} onclick={(e) => handlePinnedActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Pin">
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
                  aria-label="{file.path}" 
                  onclick={(e) => handleItemClick(e, handleFileClick, file)} 
                  oncontextmenu={(e) => handleContextMenu(e, 'file', file)}
                  ondblclick={(e) => { e.stopPropagation(); handleFileDblClick(file); }} 
                  onkeydown={(e) => handleKeyDown(e, handleFileDblClick, file)}
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, 'file', file.path, file.parentPath)}
                  ondragover={handleDragOverDisabled}
                  ondrop={(e) => handleDropDisabled(e, "file", file.path, file.parentPath)}
                  >
                    <div class="icon-list">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffffB0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></div>
                    <div class="label-list">{file.name}</div>
                    {#if currentPath !== ""}
                      <!-- <button class="legend-button circle" class:hidden={await getFileButtonColor(file) === ""} style="background-color: {getColorForName( await getFileButtonColor(file))}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Action"></button> -->
                      <button class="legend-button circle" class:hidden={!fileButtonColors[file.path]}  style="background-color: {fileButtonColors[file.path] ?? ''}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {fileButtonColors[file.path]}"></button>
                    {/if} 

                    <button class="top-left-list square" class:pinned={filePinnedStatuses[file.path] === true} onclick={(e) => handlePinnedActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Pin">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                    </button>

                  </div>
                {/if}
              {/each}
            {/if}
          </div>

        {:else if viewForm == "details" }



          <div class="details-view-container">
            <div class="details-table" role="table">
              <div class="details-table-header" style={`grid-template-columns: ${detailsGridTemplate};`} role="row">
                {#each detailsColumns as column}
                  <div class="details-header-cell" role="columnheader">
                    <span class="details-header-label">{column.label}</span>
                    <button
                      class="details-column-resizer"
                      aria-label={`Resize ${column.label}`}
                      onmousedown={(event) => handleDetailsResizeStart(event, column.id)}
                    ></button>
                  </div>
                {/each}
              </div>



              <div class="details-table-body" role="rowgroup">
                {#each mainViewData.children as child, index}
                  {#if getFolderPinnedStatus(child) == true}

                    <div 
                    class="details-data-row" 
                    style={`grid-template-columns: ${detailsGridTemplate};`} 
                    role="row"
                    tabindex="0"
                    title="{child.path}" 
                    onclick={(e) => handleItemClick(e, handleFolderClick, child)}  
                oncontextmenu={(e) => handleContextMenu(e, 'folder', child)}
                    ondblclick={(e) => { e.stopPropagation(); handleFolderDblClick(child); }} 
                    onkeydown={(e) => handleKeyDown(e, handleFolderDblClick, child)}
                    draggable="true"
                    ondragstart={(e) => handleDragStart(e, 'folder', child.path, child.parentPath)}
                    ondragover={(e) => handleDragOver(e, getDropTargetKey('folder', child.path, child.parentPath))}
                    ondrop={(e) => handleDrop(e, "folder", child.path, child.parentPath)}

                    class:active={activeDropTargetKey === getDropTargetKey('folder', child.path, child.parentPath)}
                    >
                      <div class="details-data-cell details-center-align " role="cell">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c1acec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-icon lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></div>
                      <div class="details-data-cell details-center-align details-title" role="cell">{child.name}</div>

                      {#await model.getDetailedViewData(currentPath, "folder", child.path)}
                        <!-- promise is pending -->
                        <div class="details-data-cell" role="cell"></div>
                        <div class="details-data-cell details-center-align " role="cell">/{child.path}</div>
                        <div class="details-data-cell" role="cell"></div>
                        <div class="details-data-cell" role="cell"></div>

                      {:then details}
                        <!-- promise was fulfilled -->
                        <div class="details-data-cell details-long-text" role="cell">{details?.description}</div>
                        <div class="details-data-cell details-center-align " role="cell">/{child.path}</div>
                        <div class="details-data-cell details-center-align details-single-line" role="cell">{formatDate(details?.created)}</div>
                        <div class="details-data-cell details-center-align details-single-line" role="cell">{formatDate(details?.modified)}</div>
                        
                        {/await}
                        <div class="details-data-cell details-long-text" role="cell">-</div>
                        <div class="details-data-cell details-center-align " role="cell">{currentPath}</div>
                        <div class="details-data-cell details-center-align" role="cell">
                  {#if currentPath !== ""}
                    <button class="legend-button circle details-legend" class:hidden={getFolderButtonColor(child) === ""} style="background-color: {getColorForName(getFolderButtonColor(child))}" onclick={(e) => handleLegendActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {getFolderButtonColor(child)}"></button>
                  {/if}
                        </div>
                        <div class="details-data-cell details-center-align" role="cell">
                  <button class="top-left-list square details-legend"   class:pinned={getFolderPinnedStatus(child) == true} onclick={(e) => handlePinnedActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Pin">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                  </button>
                        </div>

                    </div>
                  {/if}
                {/each}

                {#if currentPath != ""}
                  {#each mainViewData.files as file}
                    {#if filePinnedStatuses[file.path] === true}

                      <div 
                      class="details-data-row" 
                      style={`grid-template-columns: ${detailsGridTemplate};`} 
                      role="row"
                      tabindex="0" 
                      title="{file.path}" 
                      onclick={(e) => handleItemClick(e, handleFileClick, file)} 
                  oncontextmenu={(e) => handleContextMenu(e, 'file', file)}
                      ondblclick={(e) => { e.stopPropagation(); handleFileDblClick(file); }} 
                      onkeydown={(e) => handleKeyDown(e, handleFileDblClick, file)}
                      draggable="true"
                      ondragstart={(e) => handleDragStart(e, 'file', file.path, file.parentPath)}
                      ondragover={handleDragOverDisabled}
                      ondrop={(e) => handleDropDisabled(e, "file", file.path, file.parentPath)}
                      >
                        <div class="details-data-cell details-center-align " role="cell">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffffB0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></div>
                        <div class="details-data-cell details-center-align details-title" role="cell">{file.name}</div>

                        {#await model.getDetailedViewData(currentPath, "file", file.path)}
                          <!-- promise is pending -->
                          <div class="details-data-cell" role="cell"></div>
                          <div class="details-data-cell details-center-align " role="cell">{file.path}</div>
                          <div class="details-data-cell" role="cell"></div>
                          <div class="details-data-cell" role="cell"></div>
                          <div class="details-data-cell" role="cell"></div>

                        {:then details}
                          <!-- promise was fulfilled -->
                          <div class="details-data-cell details-long-text" role="cell">{details?.filemetadata["description"]}</div>
                          <div class="details-data-cell details-center-align " role="cell">{file.path}</div>
                          <div class="details-data-cell details-center-align details-single-line" role="cell">{formatDate(details?.fileobsdata.ctime)}</div>
                          <div class="details-data-cell details-center-align details-single-line" role="cell">{formatDate(details?.fileobsdata.mtime)}</div>
                          <div class="details-data-cell details-long-text" role="cell">{details?.fileinitial}</div>
                          
                          {/await}
                          <div class="details-data-cell details-center-align " role="cell">{currentPath}</div>
                          <div class="details-data-cell details-center-align" role="cell">
                    {#if currentPath !== ""}
                      <!-- <button class="legend-button circle" class:hidden={await getFileButtonColor(file) === ""} style="background-color: {getColorForName( await getFileButtonColor(file))}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Action"></button> -->
                      <button class="legend-button circle details-legend" class:hidden={!fileButtonColors[file.path]}  style="background-color: {fileButtonColors[file.path] ?? ''}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {fileButtonColors[file.path]}"></button>
                    {/if} 
                          </div>
                          <div class="details-data-cell details-center-align" role="cell">
                    <button class="top-left square details-legend" class:pinned={filePinnedStatuses[file.path] === true} onclick={(e) => handlePinnedActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Pin">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                    </button>
                          </div>

                      </div>
                    {/if}

                  {/each}
                {/if}
                <!-- unpinned files and folders -->
                {#if hasPinnedItems}
                  <div class="section-divider"></div>
                {/if}
                {#each mainViewData.children as child, index}
                  {#if getFolderPinnedStatus(child) == false}

                    <div 
                    class="details-data-row" 
                    style={`grid-template-columns: ${detailsGridTemplate};`} 
                    role="row"
                    tabindex="0" 
                    title="{child.path}" 
                    onclick={(e) => handleItemClick(e, handleFolderClick, child)}  
                oncontextmenu={(e) => handleContextMenu(e, 'folder', child)}
                    ondblclick={(e) => { e.stopPropagation(); handleFolderDblClick(child); }} 
                    onkeydown={(e) => handleKeyDown(e, handleFolderDblClick, child)}
                    draggable="true"
                    ondragstart={(e) => handleDragStart(e, 'folder', child.path, child.parentPath)}
                    ondragover={(e) => handleDragOver(e, getDropTargetKey('folder', child.path, child.parentPath))}
                    ondrop={(e) => handleDrop(e, "folder", child.path, child.parentPath)}

                    class:active={activeDropTargetKey === getDropTargetKey('folder', child.path, child.parentPath)}
                    >
                      <div class="details-data-cell details-center-align " role="cell">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c1acec" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-icon lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></div>
                      <div class="details-data-cell details-center-align details-title" role="cell">{child.name}</div>

                      {#await model.getDetailedViewData(currentPath, "folder", child.path)}
                        <!-- promise is pending -->
                        <div class="details-data-cell" role="cell"></div>
                        <div class="details-data-cell details-center-align " role="cell">/{child.path}</div>
                        <div class="details-data-cell" role="cell"></div>
                        <div class="details-data-cell" role="cell"></div>

                      {:then details}
                        <!-- promise was fulfilled -->
                        <div class="details-data-cell details-long-text" role="cell">{details?.description}</div>
                        <div class="details-data-cell details-center-align " role="cell">/{child.path}</div>
                        <div class="details-data-cell details-center-align details-single-line" role="cell">{formatDate(details?.created)}</div>
                        <div class="details-data-cell details-center-align details-single-line" role="cell">{formatDate(details?.modified)}</div>
                        
                        {/await}
                        <div class="details-data-cell details-long-text" role="cell">-</div>
                        <div class="details-data-cell details-center-align " role="cell">{currentPath}</div>
                        <div class="details-data-cell details-center-align" role="cell">
                  {#if currentPath !== ""}
                    <button class="legend-button circle details-legend" class:hidden={getFolderButtonColor(child) === ""} style="background-color: {getColorForName(getFolderButtonColor(child))}" onclick={(e) => handleLegendActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {getFolderButtonColor(child)}"></button>
                  {/if}
                        </div>
                        <div class="details-data-cell details-center-align " role="cell">
                  <button class="top-left-list square details-legend"   class:pinned={getFolderPinnedStatus(child) == true} onclick={(e) => handlePinnedActionButtonClickFolder(e, child.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Pin">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                  </button>
                        </div>

                    </div>
                  {/if}
                {/each}

                {#if currentPath != ""}
                  {#each mainViewData.files as file}
                    {#if filePinnedStatuses[file.path] === false}

                      <div 
                      class="details-data-row" 
                      style={`grid-template-columns: ${detailsGridTemplate};`} 
                      role="row"
                      tabindex="0" 
                      title="{file.path}" 
                      onclick={(e) => handleItemClick(e, handleFileClick, file)} 
                      oncontextmenu={(e) => handleContextMenu(e, 'file', file)}
                      ondblclick={(e) => { e.stopPropagation(); handleFileDblClick(file); }} 
                      onkeydown={(e) => handleKeyDown(e, handleFileDblClick, file)}
                      draggable="true"
                      ondragstart={(e) => handleDragStart(e, 'file', file.path, file.parentPath)}
                      ondragover={handleDragOverDisabled}
                      ondrop={(e) => handleDropDisabled(e, "file", file.path, file.parentPath)}
                      >
                        <div class="details-data-cell details-center-align " role="cell">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffffB0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></div>
                        <div class="details-data-cell details-center-align details-title" role="cell">{file.name}</div>

                        {#await model.getDetailedViewData(currentPath, "file", file.path)}
                          <!-- promise is pending -->
                          <div class="details-data-cell" role="cell"></div>
                          <div class="details-data-cell details-center-align " role="cell">{file.path}</div>
                          <div class="details-data-cell" role="cell"></div>
                          <div class="details-data-cell" role="cell"></div>
                          <div class="details-data-cell" role="cell"></div>

                        {:then details}
                          <!-- promise was fulfilled -->
                          <div class="details-data-cell details-long-text" role="cell">{details?.filemetadata["description"]}</div>
                          <div class="details-data-cell details-center-align " role="cell">{file.path}</div>
                          <div class="details-data-cell details-center-align details-single-line" role="cell">{formatDate(details?.fileobsdata.ctime)}</div>
                          <div class="details-data-cell details-center-align details-single-line" role="cell">{formatDate(details?.fileobsdata.mtime)}</div>
                          <div class="details-data-cell details-long-text" role="cell">{details?.fileinitial}</div>
                          
                          {/await}
                          <div class="details-data-cell details-center-align " role="cell">{currentPath}</div>
                          <div class="details-data-cell details-center-align" role="cell">
                    {#if currentPath !== ""}
                      <!-- <button class="legend-button circle" class:hidden={await getFileButtonColor(file) === ""} style="background-color: {getColorForName( await getFileButtonColor(file))}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Action"></button> -->
                      <button class="legend-button circle details-legend" class:hidden={!fileButtonColors[file.path]}  style="background-color: {fileButtonColors[file.path] ?? ''}" onclick={(e) => handleLegendActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} aria-label="Legend: {fileButtonColors[file.path]}"></button>
                    {/if} 
                          </div>
                          <div class="details-data-cell details-center-align" role="cell">
                    <button class="top-left square details-legend" class:pinned={filePinnedStatuses[file.path] === true} onclick={(e) => handlePinnedActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Pin">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" style="opacity: 70%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                    </button>
                          </div>

                      </div>
                    {/if}

                  {/each}
                {/if}


              </div>
            </div>
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
    padding: 10px 5px 2px 5px;
  }

  .main-view{
    height: 100%;
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

.details-data-row:focus{
  outline: 1.75px solid var(--interactive-accent);
  outline-offset: 0px;
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

.details-data-row:hover .legend-button {
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

.details-data-row:hover .circle {
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

.details-data-row:hover .square {
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

.details-view-container {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.details-table {
  display: flex;
  flex-direction: column;
  min-width: max-content;
  height: 100%;
  min-height: 0;
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--background-primary);
}

.details-table-header {
  display: grid;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
}

.details-header-cell {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 34px;
  padding: 0 10px;
  border-right: 1px solid var(--background-modifier-border);
  user-select: none;
}

.details-header-cell:last-child {
  border-right: none;
}

.details-header-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.details-column-resizer {
  position: absolute;
  top: 0;
  right: -5px;
  width: 10px;
  height: 100%;
  border: none;
  padding: 0;
  margin: 0;
  background: transparent;
  cursor: col-resize;
  box-shadow: none;
}

.details-column-resizer::after {
  content: '';
  position: absolute;

}

.details-table-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-top: 5px;
}

.details-data-row {
  display: grid;
  /* border-bottom: 1px solid var(--background-modifier-border); */
  border-bottom: 1px solid color-mix(in srgb, var(--background-modifier-border) 30%, transparent);
  margin-left: 5px;
  margin-right: 5px;
  border-radius: 5px;
  max-height: 45px;
}




.details-data-cell {
    min-height: 34px;
    display: -webkit-box;        
    -webkit-box-orient: vertical; 
    -webkit-line-clamp: 2;
    
    display: box;                   
    box-orient: vertical;
    line-clamp: 2;       

    overflow: hidden;            
    text-overflow: ellipsis;     
    padding: 0 10px;
    font-size: 13px;
    padding: 5px;

}

.details-center-align {
    display: flex;                 /* flex container */
    flex-direction: column;        /* stack items vertically (optional here) */
    justify-content: center;       /* vertically center content */
}

.details-single-line{
  white-space: nowrap;     
  overflow: hidden;        
}
.details-long-text{
    opacity: 60%;
    font-size: 12px;
    line-height: 18px;
}

.details-title{
  font-size: 14px;
}

.details-legend{
  position: unset
}


.details-data-cell:last-child {
  border-right: none;
}

</style>
