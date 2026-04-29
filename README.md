

# Tag Folder Explorer for Obsidian
<img width="1916" height="1019" alt="image" src="https://github.com/user-attachments/assets/4eeea79f-f51a-42a5-87be-6f8af239d5e3" />


A tag folder-based explorer for Obsidian. It uses the nested tags feature of Obsidian to create virtual folders, allowing individual files to exist in multiple locations inside a single vault.

## The Problem

Obsidian is a great note taking software, but its default tag explorer can feel restrictive. While traditional file explorers exist at the OS level, they technically lock each file into a single directory. 

Generally, when I create new files, I tend to dump them all into a single folder (like "Downloads"). The benefit is that everything is sorted chronologically, but it's a mess. On the other hand, strictly sorting project specific files into deeply nested folders often leads to them becoming "out of sight, out of mind" and you end up forgetting those files even exist.

## The Solution

This project strikes a balance between both approaches. It provides a virtual, nested tag-based view so that each file can logically exist in multiple paths simultaneously. At the same time, the classic Obsidian sidebar can still provide you a chronological, flat view.

## Features



https://github.com/user-attachments/assets/2a3878b4-6a01-4192-81c1-1f18583262f8


- **Virtual Folders Representation**: Leverages Obsidian's nested tags (e.g., `#fruit/orange`, `#fruit/apple`) to create a familiar folder-like tree structure. (In the example, the parent folder is fruit which has two children folders orange and apple).

- **Multi-location Files**: By adding multiple nested tags to a single file, the file will identically appear in multiple "virtual" folders at the same time.

- **Sortable Tree Sidebar**: The left sidebar provides a nested view of your tags, allowing quick navigation and a bird's-eye view of your vault. Files are automatically organized based on their metadata tags. Untagged files are gathered under a separate "Untagged Files" folder.

- **Folder Descriptions**: Each virtual folder has an associated metadata file where you can manually document its context and purpose. This allows a folder to have an explanation for its existence and exact purpose. 

- **File/Folder Legends (Color Coding)**: In cases where you don't want to create subfolders for minor segregation, but still want to separate files and folders, within a parent, you can assign one of 6 legend colors to any file or folder. The meaning of these labels can be defined inside the parent folder's properties (e.g., "Red tags in the Math folder mean there's an upcoming deadline").

- **Pinned Files and Folders**: Pinning files and folders allows you to keep your most important items easily accessible at the top of the parent folder.

- **Intuitive GUI**: A familiar graphical user interface allows users to create, rename, and delete files and virtual Tag Folder visually. Thus, the user doesnt need to manually type the exact tag into the file's frontmatter, which can lead to accidental typos.

- **Drag & Drop**: Having a seamless drag and drop functionality allows the user to drag and drop files and folders between the tree sidebar and the main view to move them. Hold `Ctrl` (or `Cmd` on Mac) while dragging to assign the new tag while keeping the old one, making the file exist in both locations.

- **Easy Navigation**: By clicking on tag folders users can open them in the current view, or hold `Ctrl` to open them in a new background tab.

- **Data Portability**: Staying true to the philosophy of Obsidian, all the plugin's data is stored natively inside file's YAML metadata. This means your data is never locked behind the plugin's internal database. Every virtual folder has an associated `.json` file stored in the `.TagNodeMeta` folder at the root of your vault.

## How it Works

Obsidian naturally implements a feature called nested tags to organize and allow granular branching of tags. For example, two tags named "orange" and "apple" can be grouped under the same parent tag as `#fruit/orange` and `#fruit/apple`.

This is a great concept from the perspective of organization, but Obsidian's default tag explorer view is quite basic and doesnt build on the potential of this feature. 

By utilizing nested tags as virtual folder paths, we can map multiple paths to a single file, allowing a single file to exist in multiple virtual folders. Since Obsidian doesn't natively feature a file explorer that utilizes this multi-path capability, this plugin bridges the gap. It creates a nested tag based file explorer, which attempts to maximize the utility of nested tags.


## Optimization

 Since the application has multiple moving parts, the initial priority while building this project, was correctness and feature completeness  which later was followed by systematic performance tuning across the codebase .

Below are the optimizations which were implemented, what was improved, and their impact.


### 1. Root Node Child Lookup Optimization

**Problem:**  
Unlike standard `TagNode` instances, which stored children in a map/record for O(1) lookup, the root node was implemented as a lightweight proxy and did not maintain the same structure. As a result, child lookups at the root level were falling back to O(n) traversal.

**Improvement:**  
The root node was upgraded to use a proper keyed record structure for its children, aligning it with the rest of the tree implementation.

**Result:**
- Time complexity of a tree recompute improved from **O(n) to O(1)**
- Load performance improved from **1018.90ms to 672.70ms**
- Overall improvement: **~1.5x faster loading**


### 2. File Retrieval Optimization in Tag Nodes

**Problem:**  
File retrieval within a `TagNode` was implemented using an O(n) search, iterating through file lists to locate matches.

**Improvement:**  
Instead of performing repeated linear searches, the existing global file map was leveraged. File identity validation was then done using direct reference comparison, which is an O(1) operation.

**Result:**
- Time complexity improved from **O(n) to O(1)**
- Sidebar file detail load time reduced from **7.10ms to 4.90ms**
- Overall improvement: **~1.4x faster retrieval**


### 3. Tag Extraction and Frontmatter Sync Optimization

**Problem:**  
The process for extracting tags from the body and syncing them into frontmatter suffered from multiple inefficiencies:
- Files were being opened and closed repeatedly per tag (N+1 I/O issue)
- Duplicate handling used nested iteration, resulting in O(n^2) complexity

**Improvement:**  
- Eliminated repeated file I/O by batching operations
- Replaced nested deduplication with conversion to sets:
	- Merge lists
	- Convert to `Set`
	- Convert back to array

**Result:**
- Time reduced from **13489.40ms to 1.10ms**
- Eliminated N+1 I/O issue
- Reduced merge complexity from O(n^2) to near O(n)


## Installation

### Manual Installation

> ⚠️ **Warning**
> This plugin is currently under development. If you want to test it out, make sure to keep a backup copy of your vault. Although the chance of the plugin corrupting your files is incredibly low, it is never absolutely zero.
## Installation

You can either clone/download the repository manually **or download the latest pre-built files from the Releases page**.

### Option 1: Using a Release (recommended)
1. Go to the **Releases** page and download the files `main.js`, `styles.css`, and `manifest.json` under Assets.
2. Navigate into your vault’s `.obsidian/plugins/` folder.
3. Create a new folder named `tag-folder-explorer` inside `.obsidian/plugins/`.
4. Move the downloaded files into the `tag-folder-explorer` directory you created.
5. Open Obsidian, go to **Settings → Community plugins**.
6. Disable Safe Mode (if enabled).
7. Enable the **sample** plugin.
8. Reload Obsidian.

### Option 2: Manual Installation (from source)
1. Download the zip file of this repository directly or from the releases page or clone it locally.
2. In your Obsidian vault, navigate to the `.obsidian/plugins/` folder (create it if it doesn't exist).
3. Create a new folder named `tag-folder-explorer` inside `.obsidian/plugins/`.
4. Locate the `dist/` folder from the downloaded zip/repo.
5. Copy `main.js`, `styles.css`, and `manifest.json` from it.
6. Paste these files into the `tag-folder-explorer` directory you created.
7. Open Obsidian, go to **Settings → Community plugins**.
8. Disable Safe Mode (if enabled).
9. Enable the **sample** plugin.
10. Reload Obsidian.


## Development

If you'd like to build the plugin locally:

1. Clone this repository into your vault's plugins folder (`<Vault>/.obsidian/plugins/tag-folder-explorer/`). Obsidian will automatically pick up the output `main.js` from the root directory.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start compilation in watch mode (or `npm run build` to create a production build).
4. (Optional) Use the [Hot-Reload plugin](https://github.com/pjeby/hot-reload) to automatically refresh Obsidian when the source code changes.

## License

MIT License. See [LICENSE](LICENSE) for more details.
