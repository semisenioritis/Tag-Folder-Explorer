import {App, Plugin, PluginSettingTab, Setting} from "obsidian";

export interface TagFolderPluginSettings {
	folderPathsToSkip: string;
	showObsMetaData: boolean;
	fieldsToSkip: string;
	debugLogging: boolean;
}

export const DEFAULT_SETTINGS: TagFolderPluginSettings = {
	folderPathsToSkip: '',
	showObsMetaData: false,
	fieldsToSkip: '',
	debugLogging: false
}

/** The part of the plugin the settings tab needs. Avoids importing the plugin class (and a cycle with main.ts). */
export interface SettingsHost extends Plugin {
	settings: TagFolderPluginSettings;
	saveSettings(): Promise<void>;
}

export class TagFolderSettingTab extends PluginSettingTab {
	plugin: SettingsHost;

	constructor(app: App, plugin: SettingsHost) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		const setting = new Setting(containerEl)
			.setName('Folders to skip in tree')
			.addTextArea(text => text
				.setPlaceholder('Folder Paths')
				.then(t => {
				const control = t.inputEl.closest('.setting-item-control');
				if (control instanceof HTMLElement) {
					control.addClass('tfe-setting-item-control-wide');
				}
				t.inputEl.addClass('tfe-setting-item-data-contents');
				})
				.setValue(this.plugin.settings.folderPathsToSkip)
				.onChange(async (value) => {
					this.plugin.settings.folderPathsToSkip = value;
					await this.plugin.saveSettings();
				}));
		
		// setting.descEl.innerHTML = 'These are physical folders in your vault that you dont want to be indexed and included in the Tag-tree.<br><br>Enter each folder path on a new line<br><br> For eg:<br>Subject/Maths<br>Personal/Journal';

		setting.descEl.empty();

		const skip_folder_lines = [
			"These are physical folders in your vault that you don't want to be indexed and included in the Tag-tree.",
			"",
			"Enter each folder path on a new line",
			"",
			"For e.g:",
			"Subject/Maths",
			"Personal/Journal"
		];

		skip_folder_lines.forEach(line => {
			if (line === "") {
				setting.descEl.createEl("br");
			} else {
				setting.descEl.createDiv({ text: line });
			}
		});


		const showObsMetaData  = new Setting(containerEl)
			.setName('Show the Metadata Created by Obsidian ')
			.setDesc('Toggle to show or hide Obsidian-created metadata')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showObsMetaData)
				.onChange(async (value) => {
					this.plugin.settings.showObsMetaData = value;
					await this.plugin.saveSettings();
				}));

		const fieldsToSkip = new Setting(containerEl)
			.setName('Metadata fields to skip while rendering sidebar')
			.addTextArea(text => text
				.setPlaceholder('Metadata fields')
				.then(t => {
				const control = t.inputEl.closest('.setting-item-control');
				if (control instanceof HTMLElement) {
					control.addClass('tfe-setting-item-control-wide');
				}
				t.inputEl.addClass('tfe-setting-item-data-contents');
				})
				.setValue(this.plugin.settings.fieldsToSkip)
				.onChange(async (value) => {
					this.plugin.settings.fieldsToSkip = value;
					await this.plugin.saveSettings();
				}));
		
		// fieldsToSkip.descEl.innerHTML = 'These are metadata fields in your files that you dont want to render in the Metadata Sidebar.<br><br>Enter each metadata field on a new line<br><br> For eg:<br>tags<br>assigned<br>category';


		fieldsToSkip.descEl.empty();

		const field_to_skip_lines = [

			"These are metadata fields in your files that you dont want to render in the Metadata Sidebar.",
			"",
			"Enter each metadata field on a new line",
			"",
			"For e.g:",
			"tags",
			"assigned",
			"category"
		];

		field_to_skip_lines.forEach(line => {
			if (line === "") {
				fieldsToSkip.descEl.createEl("br");
			} else {
				fieldsToSkip.descEl.createDiv({ text: line });
			}
		});


		new Setting(containerEl)
			.setName('Debug logging')
			.setDesc('Write diagnostic messages to the developer console. Turn on the Verbose level in the console to see them. Errors and warnings are always shown.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.debugLogging)
				.onChange(async (value) => {
					this.plugin.settings.debugLogging = value;
					await this.plugin.saveSettings();
				}));
	}
}