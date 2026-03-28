<script lang="ts">
  // import { getmainViewData, ModelInterface, readLegendStatusOfFile, readLegendStatusOfFolder } from '../modelInterface'
  import type { ISerializedTagNode, frontendFile, frontendFolder } from '../interfaces'
  import { openFileInNewTab } from '../windows'
  import type { ControllerInterface } from '../controllerInterface';
  import type { ModelInterface } from '../modelInterface';

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
  }


  let { currentPath, onUpdate, onFocusChange, refreshKey = 0, controller, model, colorDictionary, getColorForName }:Props = $props();
  // let { currentPath }: Props = $props();


  if (!model) {
  throw new Error("model is not initialized");
  }


  let mainViewData: ISerializedTagNode | null = $derived.by(() => {
    // Include refreshKey in the derivation to force recalculation when it changes
    void refreshKey;
    return model.getmainViewData(currentPath);
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



  function handleFolderClick(folder:frontendFolder) {
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
      
      clickTimeout = null;
    }, CLICK_DELAY);
	}



	function handleFileClick(file:frontendFile) {
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
    handler(item);
  }

  async function handleActionButtonClickFolder(event: MouseEvent, currColor:string, tagPath:string ) {
    event.stopPropagation();
    // console.log(currColor)
    // console.log(tagPath);
    // console.log("changing color")
    const newColor = await controller?.cycleLegendForFolder(currColor, tagPath)

    // Update local reactive data
    recomputeMainView()

  }
  async function handleActionButtonClickFile(event: MouseEvent, filePath:string ) {
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

    function recomputeMainView(): void {
        refreshKey++
    }


  let fileButtonColors = $state<Record<string, string>>({});


  // Load all colors initially
  async function loadFileColors() {
    const entries = await Promise.all(
      mainViewData!.files.map(async (file) => [file.path, await getFileButtonColor(file)])
    );
    fileButtonColors = Object.fromEntries(entries);
    console.log("🔵🔵🔵🔵🔵🔵")
    console.log(fileButtonColors)
  }

  $effect(() => {
    if (mainViewData!.files) loadFileColors();

  });




</script>


<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div class="main-view-container" onclick={handleMainViewClick}>


  <div class="main-content-area">

    {#if mainViewData}
      <!-- <pre class="debug-info">{JSON.stringify(mainViewData, null, 2)}</pre> -->
      
    {/if}


<div class="main-view" >
  {#if mainViewData}
    <div class="file-grid">
      <!-- Render child folders/tags -->
      {#each mainViewData.children as child}
        <div class="item folder" role="button" tabindex="0" onclick={(e) => handleItemClick(e, handleFolderClick, child)}  ondblclick={(e) => { e.stopPropagation(); handleFolderDblClick(child); }} onkeydown={(e) => handleKeyDown(e, handleFolderDblClick, child)}>
          <div class="icon">📁</div>
          <div class="label">{child.name}</div>
          <button class="action-button circle" class:hidden={getFolderButtonColor(child) === ""} style="background-color: {getColorForName(getFolderButtonColor(child))}" onclick={(e) => handleActionButtonClickFolder(e, getFolderButtonColor(child) ,child.path)} ondblclick={(e) => e.stopPropagation()} title="Action"></button>
        </div>
      {/each}

      <!-- Render files -->
      {#each mainViewData.files as file}
        <div class="item file" role="button" tabindex="0" onclick={(e) => handleItemClick(e, handleFileClick, file)} ondblclick={(e) => { e.stopPropagation(); handleFileDblClick(file); }} onkeydown={(e) => handleKeyDown(e, handleFileDblClick, file)}>
          <div class="icon">📄</div>
          <div class="label">{file.name}</div>
          <!-- <button class="action-button circle" class:hidden={await getFileButtonColor(file) === ""} style="background-color: {getColorForName( await getFileButtonColor(file))}" onclick={(e) => handleActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Action"></button> -->
          <button class="action-button circle" class:hidden={!fileButtonColors[file.path]} style="background-color: {fileButtonColors[file.path] ?? ''}" onclick={(e) => handleActionButtonClickFile(e, file.path)} ondblclick={(e) => e.stopPropagation()} title="Action"></button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <p>No data available for this path</p>
    </div>
  {/if}
</div>  











  </div>
</div>

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

.item{
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

.item:hover{
  /* background:var(--bg-item-hover); */
  background: var(--background-modifier-border);


}

.item:focus{
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
  background: var(--background-modifier-border);
}

.icon{
  font-size:28px;
  line-height:1;
}

.label{
  font-size:13px;
  text-align:center;
  word-break:break-word;
}

.action-button {
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

.item:hover .action-button {
  display: block;
}

.action-button:hover {
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

  .item:hover .circle {
    opacity: 1;
  }

  .hidden {

    opacity: 0;
  }






</style>
