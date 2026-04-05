

# Tag Folder Explorer for Obsidian


A tag folder-based explorer for Obsidian. It uses the nested tags feature of Obsidian to create virtual folders, allowing individual files to exist in multiple locations inside a single vault.

## The Problem

Obsidian is a great note-taking software, but its default tag explorer can feel restrictive. While traditional file explorers exist at the OS level, they rigidly lock each file into a single directory. 

Generally, we tend to dump all files into a single folder (like "Downloads"). The benefit is that everything is sorted chronologically, but it's a mess. Conversely, strictly sorting project-specific files into deeply nested folders often leads to "out of sight, out of mind" syndrome—you forget those files even exist.

## The Solution

This project strikes a balance between both approaches. It provides a virtual, nested tag-based view so that each file can logically exist in multiple paths simultaneously. At the same time, the classic Obsidian sidebar can still provide your beloved chronological or flat view.

## Features

- **Virtual Folders Representation**: Leverages Obsidian's nested tags (e.g., `#fruit/orange`, `#fruit/apple`) to create a familiar folder-like tree structure.
- **Multi-location Files**: By adding multiple nested tags to a single file, the file will identically appear in multiple "virtual" folders at the same time.
- **Sortable Tree Sidebar**: The left sidebar provides a nested view of your tags, allowing quick navigation and a bird's-eye view of your vault. Files are automatically organized based on their metadata tags. Untagged files are conveniently gathered in a dedicated "Untagged Files" folder.
- **Folder Descriptions**: Prevent the common issue of forgetting why a nested folder was created. Each virtual folder has an associated metadata file where you can manually document its context and purpose.
- **File/Folder Legends (Color Coding)**: Instead of creating endless subfolders for minor segregation, you can assign one of 6 legend colors to any file or folder. The meaning of these labels can be defined inside the parent folder's properties (e.g., "Red tags in the Math folder mean there's an upcoming deadline").
- **Pinned Files and Folders**: Keep your most important items easily accessible by pinning them to the top of any parent folder.
- **Intuitive GUI Manipulation**: Create, rename, and delete files and Tag Folders directly from the user interface. No need to manually type the exact tag into the file's frontmatter!
- **Drag & Drop Organization**: Seamlessly drag and drop files and folders between the tree sidebar and the main view to move them. Hold `Ctrl` (or `Cmd` on Mac) while dragging to assign the new tag while keeping the old one, making the file exist in both locations.
- **Smart Navigation**: Click on tag folders to open them in the current view, or hold `Ctrl` to open them seamlessly in a new background tab.

## How it Works

Obsidian naturally uses a feature called nested tags to organize and allow granular branching. For example, two tags named "orange" and "apple" can be grouped under the same parent tag as `#fruit/orange` and `#fruit/apple`.

This is a great organizational concept, but Obsidian's default tag explorer view is quite basic. 

By utilizing nested tags as placeholders for traditional folder paths, we can map multiple paths to a single file. Since Obsidian doesn't natively feature a file explorer that utilizes this multi-path capability, this plugin bridges the gap. It creates a scaffold for a traditional file explorer but supercharges it with the flexibility of nested tags.

## Installation

### Manual Installation

> ⚠️ **Warning**
> This plugin is currently under development. If you want to test it out, make sure to keep a backup copy of your vault. Although the chance of the plugin corrupting your files is incredibly low, it is never absolutely zero.

1. Download the zip file of this repository or clone it locally.
2. In your Obsidian vault, navigate to the `.obsidian/plugins/` folder. (Create it if it doesn't exist).
3. Create a new folder named `tag-folder-explorer` inside `.obsidian/plugins/`.
4. Locate the `dist/` folder from the downloaded zip/repo.
5. Copy the `main.js`, `styles.css`, and `manifest.json` files from it.
6. Paste these files into the `tag-folder-explorer` directory you created.
7. Open Obsidian, go to **Settings → Community plugins**.
8. Disable Safe Mode (if enabled).
9. Enable the **Tag Folder Explorer** plugin.
10. Reload Obsidian.

## Development

If you'd like to build the plugin locally:

1. Clone this repository into your vault's plugins folder (`<Vault>/.obsidian/plugins/tag-folder-explorer/`). Obsidian will automatically pick up the output `main.js` from the root directory.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start compilation in watch mode (or `npm run build` to create a production build).
4. (Optional) Use the [Hot-Reload plugin](https://github.com/pjeby/hot-reload) to automatically refresh Obsidian when the source code changes.

## License

MIT License. See [LICENSE](LICENSE) for more details.
