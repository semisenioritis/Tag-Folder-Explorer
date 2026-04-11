<script lang="ts">

//   import { getrightSidebarData } from '../modelInterface'
    import type { ControllerInterface } from '../controllerInterface';
    import type { ModelInterface } from '../modelInterface';
    import { openTagExplorerInNewTab, openRaindropInSidebar } from '../windows';

    // Props
    interface Props {
        currentPath: string;
        focusedObjectType: string ;
        focusedObjectPath: string ;
        focusedObjectParent: string ;
        showObsMetaData?: boolean;
        fieldsToSkip?: string;
        controller: ControllerInterface | null | undefined;
        model: ModelInterface | null | undefined;
        colorDictionary:Record<string, string>
        getColorForName: (name: string) => string;
    }


    let { currentPath, focusedObjectType, focusedObjectPath, focusedObjectParent, showObsMetaData = true, fieldsToSkip = '', controller, model, colorDictionary, getColorForName}:Props = $props();
    

    if (!model) {
        throw new Error("model is not initialized");
    }

    let metadataViewData: any | null = $derived(await model.getrightSidebarData(focusedObjectParent, focusedObjectType, focusedObjectPath));


	let descriptionValue = $derived.by(() => {
        console.log("derivation was triggered")
        let tempdescriptionValue
        if (focusedObjectType== "folder"){
            if (metadataViewData?.description) {
                tempdescriptionValue = metadataViewData.description;
            }else{
                tempdescriptionValue = ""
            }
        }
        else if (focusedObjectType== "file"){
            if (metadataViewData?.filemetadata && "description" in metadataViewData.filemetadata) {
                tempdescriptionValue = metadataViewData.filemetadata["description"];
            }else{
                tempdescriptionValue = ""
            }
        }
        return tempdescriptionValue
	});

	let raindropUrlValue = $derived.by(() => {
        console.log("derivation was triggered")
        let tempraindropUrlValue
        if (focusedObjectType== "folder"){
            if (metadataViewData?.raindropLink) {
                tempraindropUrlValue = metadataViewData.raindropLink;
            }else{
                tempraindropUrlValue = ""
            }
        }
        return tempraindropUrlValue
	});

	let legendValue = $derived.by(() => {
        console.log("derivation was triggered")
        let templegendValue
        if (focusedObjectType== "folder"){
            if (metadataViewData?.legend){
                templegendValue = metadataViewData.legend
            }
        }
        return templegendValue
	});


    // Parse fieldsToSkip into a Set for efficient lookup
    let fieldsToSkipSet = $derived.by(() => {
        if (!fieldsToSkip) return new Set<string>();
        return new Set(
            fieldsToSkip
                .split('\n')
                .map(field => field.trim().toLowerCase())
                .filter(field => field.length > 0)
        );
    });


    
    // Helper function to check if a field should be displayed
    function shouldDisplayField(fieldName: string): boolean {
        return !fieldsToSkipSet.has(fieldName.toLowerCase());
    }
 
    function formatDate(dateString: string): string {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }


    function formatTimestamp(timestamp: number): string {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function formatFieldName(fieldName: string): string {
        // Convert field names like "modified" to "Modified"
        return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    }

    function isTagsField(fieldName: string): boolean {
        return fieldName.trim().toLowerCase() === 'tags';
    }

    function normalizeTag(tag: string): string {
        return tag.trim().replace(/^#/, '').replace(/^\/+|\/+$/g, '');
    }

    function parseTagsFromValue(value: unknown): string[] {
        if (Array.isArray(value)) {
            return value
                .map((tag) => normalizeTag(String(tag)))
                .filter((tag) => tag.length > 0);
        }

        if (typeof value === 'string') {
            return value
                .split(',')
                .map((tag) => normalizeTag(tag))
                .filter((tag) => tag.length > 0);
        }

        return [];
    }

    async function handleTagClick(tag: string): Promise<void> {
        await openTagExplorerInNewTab(tag);
    }

    async function handleRaindropButtonClick(raindropurl: string): Promise<void> {
        await openRaindropInSidebar(raindropurl);
    }

    async function handleDescriptionUpdate() {
        if (!controller) return;

        try {
            if (focusedObjectType === 'folder') {
                await controller.updateFolderDescription(focusedObjectPath, {
                    description: descriptionValue
                });
            } else if (focusedObjectType === 'file') {
                await controller.updateFileDescription(focusedObjectParent, focusedObjectPath, {
                    description: descriptionValue
                });
            }

            await recomputeMetadata()
        } catch (error) {
            console.error('Failed to update description:', error);
        }
    }

    async function handleRaindropUrlUpdate() {
        if (!controller) return;

        try {
            if (focusedObjectType === 'folder') {

                const urlValidationValue = raindropUrlValue.trim();

                const pattern = /^https:\/\/app\.raindrop\.io\/.+$/;


                if (!pattern.test(urlValidationValue)) {
                    console.log("Invalid Raindrop URL");
                    raindropUrlValue = ""
                    // probably should display a notice on the ui that this is invalid
                    return;
                }

                await controller.updateFolderRaindropioLink(focusedObjectPath, {
                    raindropLink: raindropUrlValue
                });
            }
            await recomputeMetadata()
        } catch (error) {
            console.error('Failed to update raindrop url:', error);
        }
    }


    async function handleLegendUpdate() {
        console.log("updating legend")
        if (!controller) return;

        try {
            if (focusedObjectType === 'folder') {
                let result = await controller.updateFolderLegend(focusedObjectPath, {
                    legend: legendValue
                });
                
                console.log('Legend update successful');
                console.log("Result",result)
            }
            await recomputeMetadata()
        } catch (error) {
            console.error('Failed to update legend:', error);
        }
    }

    async function recomputeMetadata(): Promise<void> {
        if (!model) {
            throw new Error("model is not initialized");
        }
        metadataViewData = await model.getrightSidebarData(focusedObjectParent, focusedObjectType, focusedObjectPath);
    }

    function doesNotStartWithPluginPrefixes(
    value: string,
    prefixes: string[] = ["🏷-Legend-", "Description", "🏷-Pinned" ]
    ): boolean {
        const lowerValue = value.toLowerCase();

        return !prefixes.some(prefix =>
            lowerValue.startsWith(prefix.toLowerCase())
        );
    }


</script>


{#if focusedObjectType == 'folder'}
    {#if metadataViewData.name== "" }
    <div class="metadata-container">
        
        <div class="folder-image-container">
        <svg
            class="folder-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--interactive-accent)"
            stroke-width="1"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        </div>


        <details class="metadata-section" open>
            <summary class="metadata-title">General Info</summary>
            <div class="metadata-field">
                <span class="field-label">Name:</span>
                <span class="field-value">Home</span>
            </div>
            
            <div class="metadata-field">
                <span class="field-label">Path:</span>
                <span class="field-value path">/</span>
            </div>

        </details>

    </div>
    {:else}
        {#if metadataViewData}
        <div class="metadata-container">

            <div class="folder-image-container">
            <svg
                class="folder-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--interactive-accent)"
                stroke-width="1"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            
            {#if raindropUrlValue != ""}
                <div class="raindrop-button">
                    <button
                        class="raindrop-button-internal"
                        type="button"
                        onclick={() => handleRaindropButtonClick(raindropUrlValue)}
                        title="Raindrop.io"
                        
                    >
                        <span class="raindrop-text">Raindrop.io</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud-icon lucide-cloud"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
                    </button>
                </div>
            {/if}
            </div>



            <details class="metadata-section" open>
                <summary class="metadata-title">General Info</summary>
            
                <div class="metadata-field">
                    <span class="field-label">Name:</span>
                    <span class="field-value">{metadataViewData.name || 'N/A'}</span>
                </div>
                
                <div class="metadata-field">
                    <span class="field-label">Path:</span>
                    <span class="field-value path">{metadataViewData.path || 'N/A'}</span>
                </div>

                <div class="metadata-field">
                    <span class="field-label">Created:</span>
                    <span class="field-value">{formatDate(metadataViewData.created)}</span>
                </div>
                
                <div class="metadata-field">
                    <span class="field-label">Modified:</span>
                    <span class="field-value">{formatDate(metadataViewData.modified)}</span>
                </div>


            </details>




            <details class="metadata-section" open>
                <summary class="metadata-title">Description</summary>
                <textarea 
                    placeholder="Folder Desc..."
                    class="description-text" 
                    bind:value={descriptionValue}
                    onchange={handleDescriptionUpdate}
                ></textarea>
            </details>




            {#if currentPath != ""}
                {#if metadataViewData.legend}
                <details class="metadata-section">
                    <summary class="metadata-title">Legend</summary>
                    <div class="legend-list">
                        {#each Object.entries(metadataViewData.legend) as [color, label]}
                            <div class="legend-item">
                                <span class="legend-icon" data-legend-color="{color}">
                                    <span class="circle" style="background-color: {getColorForName(color)};" ></span>
                                </span>
                                <!-- <span class="legend-label">{label}</span> -->
                                <textarea
                                    placeholder="Legend Label"
                                    class="legend-label"
                                    bind:value={metadataViewData.legend[color]}
                                    onchange={handleLegendUpdate}

                                ></textarea>
                            </div>
                        {/each}
                    </div>
                </details>
                {/if}
            {/if}

            <details class="metadata-section" open>
                <summary class="metadata-title">Raindrop.io Folder</summary>
                <textarea 
                    placeholder="Add your raindrop.io folder url here..."
                    class="description-text" 
                    bind:value={raindropUrlValue}
                    onchange={handleRaindropUrlUpdate}
                ></textarea>
            </details>

        </div>
        {:else}
        <div class="empty-state">
            <p>No metadata available</p>
        </div>
        {/if}

    {/if}
{/if}



{#if focusedObjectType == 'file'}
    {#if metadataViewData}
    <div class="metadata-container">  
      
        <div class="folder-image-container">
        <svg
            class="folder-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--interactive-accent)"
            stroke-width="1"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/>
        </svg>


        
        </div>

        <details class="metadata-section" open>
            <summary class="metadata-title">General Info</summary>
        
            <div class="metadata-field">
                <span class="field-label">Name:</span>
                <span class="field-value">{metadataViewData.filenamestring || 'N/A'}</span>
            </div>
            
            <div class="metadata-field">
                <span class="field-label">Path:</span>
                <span class="field-value path">{metadataViewData.filepathstring || 'N/A'}</span>
            </div>


        </details>

      <details class="metadata-section" open>
          <summary class="metadata-title">File Description</summary>
          <textarea 
            placeholder="File Desc..."
            class="description-text" 
            bind:value={descriptionValue}
            onchange={handleDescriptionUpdate}
          ></textarea>
      </details>


      {#if metadataViewData.filemetadata && Object.keys(metadataViewData.filemetadata).length > 0}
      {@const filteredMetadata = Object.entries(metadataViewData.filemetadata).filter(([key]) => shouldDisplayField(key))}
      {#if filteredMetadata.length > 0}
      <details class="metadata-section" open>
          <summary class="metadata-title">File Metadata</summary>
          {#each filteredMetadata as [key, value]}
            {#if doesNotStartWithPluginPrefixes(key)}
              <div class="metadata-field">
                  <span class="field-label">{formatFieldName(key)}:</span>
                                    {#if isTagsField(key)}
                                        {@const tags = parseTagsFromValue(value)}
                                        {#if tags.length > 0}
                                            <div class="field-value tags-container">
                                                {#each tags as tag}
                                                    <button
                                                        class="tag-pill"
                                                        type="button"
                                                        onclick={() => handleTagClick(tag)}
                                                        title={`#${tag}`}
                                                    >
                                                        #{tag}
                                                    </button>
                                                {/each}
                                            </div>
                                        {:else}
                                            <span class="field-value">N/A</span>
                                        {/if}
                                    {:else}
                                        <span class="field-value">{value || 'N/A'}</span>
                                    {/if}
              </div>
            {/if}
          {/each}
      </details>
      {/if}
      {/if}


      {#if metadataViewData.fileobsdata && showObsMetaData}
      <details class="metadata-section">
          <summary class="metadata-title">Obsidian Information</summary>
          <div class="metadata-field">
              <span class="field-label">Created Time:</span>
              <span class="field-value">{formatTimestamp(metadataViewData.fileobsdata.ctime)}</span>
          </div>
          <div class="metadata-field">
              <span class="field-label">Modified Time:</span>
              <span class="field-value">{formatTimestamp(metadataViewData.fileobsdata.mtime)}</span>
          </div>
      </details>
      {/if}
  </div>
    {:else}
        <div class="empty-state">
            <p>No file data available</p>
        </div>
    {/if}
{/if}


{#if metadataViewData.fileinitial}
<details class="metadata-section">
    <summary class="metadata-title">File Content</summary>
    <textarea readonly class="description-text" >{metadataViewData.fileinitial}</textarea>
</details>
{/if}


<style>

  .metadata-container {
    padding: 8px;
    color: var(--text-normal);
  }

  .folder-image-container {
    /* width: 65%; */
    /* above one grows when sidebar is resized */
    width: 150px;
    aspect-ratio: 1 / 1;
    margin-bottom: 20px;
    margin-left: auto;
    margin-right: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--background-secondary) 0%, var(--background-primary) 100%);
    border-radius: 8px;
    padding: 25px;
    box-sizing: border-box;

    position: relative;
  }

.raindrop-button {
  position: absolute;
  bottom: -2px;
  right: -2px;

  font-size: 12px;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
justify-content: flex-end; /* 👈 keeps icon pinned right */

transition: width 0.25s ease, background 0.2s ease;
}

.raindrop-button-internal {
    border: 1px solid var(--background-modifier-border);
    background: #1c82ae29;
    color: #3e95bb;
    border-radius: 999px;
    padding: 4px;
    font-size: 12px;
    cursor: pointer;
    box-shadow: none;
    text-align: left;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    display: inline-flex;
    align-items: center;
    width: fit-content;


}

/* hidden text */
.raindrop-text {
  opacity: 0;
  max-width: 0;
  overflow: hidden;
  white-space: nowrap;

  transform: translateX(6px);
  transition: opacity 0.4s ease, transform 0.4s ease, max-width 0.4s ease;
}


/* reveal text */
.raindrop-button-internal:hover .raindrop-text {
  opacity: 1;
  transform: translateX(0);
  max-width: 100px;
  margin-left: 6px;
  margin-right: 6px;
}

  .folder-icon {
    width: 100%;
    height: 100%;
    max-width: 200px;
    max-height: 200px;
  }

  .metadata-section {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--background-modifier-border);
  }

  .metadata-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .metadata-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-normal);
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    user-select: none;
  }

  .metadata-field {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
    gap: 12px;
  }

  .field-label {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 500;
    flex-shrink: 0;
    padding-top: 2px;
  }

  .field-value {
    font-size: 13px;
    color: var(--text-normal);
    text-align: right;
    word-break: break-word;
    min-width: 0;
  }

  .tags-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 4px;
  }

    .tag-pill {
        border: 1px solid var(--background-modifier-border);
        background: var(--tag-background);
        color: var(--text-accent);
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 12px;
        cursor: pointer;
        height: 20px;
        margin-top: 5px;
        box-shadow: none;
        text-align: left;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: inline;
    }

    .tag-pill:hover {
        background: var(--tag-background-hover);
    }

  .field-value.path {
    font-family: var(--font-monospace);
    font-size: 12px;
  }

  .description-text {
    background-color: var(--background-secondary);
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: var(--text-normal);
    width: 100%;
    resize: none;
    field-sizing: content;
  }

  .legend-list {
    display: flex;
    flex-direction: column;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 2px 10px;
    background-color: var(--background-secondary);
    border-radius: 4px;
    font-size: 13px;
    
  }

  .legend-icon {
    height: 100%;
    font-size: 18px;
    flex-shrink: 0;
  }

.circle {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #333;
}
  .legend-label {
    color: var(--text-normal);
    width: 100%;
    resize: none;
    field-sizing: content;

  }

  .empty-state {
    padding: 32px 16px;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }


/* Hide the default marker */
details > summary {
  list-style: none;
  cursor: pointer;
}

details > summary::-webkit-details-marker {
  display: none;
}


details > summary::before {
  content: '';
  display: inline-block;
  width: 20px;
  height: 20px;
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9Imx1Y2lkZSBsdWNpZGUtY2hldnJvbi1yaWdodC1pY29uIGx1Y2lkZS1jaGV2cm9uLXJpZ2h0Ij48cGF0aCBkPSJtOSAxOCA2LTYtNi02Ii8+PC9zdmc+");
  background-size: contain;
  background-repeat: no-repeat;
  vertical-align: middle;
  margin-right: 8px;
  transition: transform 0.2s ease;
  stroke: white
}


details[open] > summary::before {
  transform: rotate(90deg);
}

</style>