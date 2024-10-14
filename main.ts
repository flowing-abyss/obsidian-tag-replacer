import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { join } from "path";

interface TagIconPair {
	tag: string;
	icon: string;
}

interface CssGeneratorSettings {
	tagIconPairs: TagIconPair[];
}

const DEFAULT_SETTINGS: CssGeneratorSettings = {
	tagIconPairs: [],
};

export default class CssGeneratorPlugin extends Plugin {
	settings: CssGeneratorSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new CssGeneratorSettingTab(this.app, this));

		this.addCommand({
			id: "generate-css",
			name: "Replace tag display (generate CSS)",
			callback: () => this.generateCss(),
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async generateCss() {
		let css = "";

		// First part: Hide original tag text
		for (const pair of this.settings.tagIconPairs) {
			const [category, name] = pair.tag.split("/");
			const cleanTag = `${category}${name}`;

			css += `.tag[href="#${pair.tag}"],\n`;
			css += `.cm-tag-${cleanTag},\n`;

			if (name.includes("_")) {
				css += `.cm-tag-${cleanTag} + span.cm-hashtag,\n`;
				css += `.cm-tag-${cleanTag} + span.cm-hashtag + .cm-hashtag,\n`;
			}
		}

		css = css.slice(0, -2); // Remove last comma and newline
		css += ` {
  font-size: 0px;
  padding: 0;
}\n\n`;

		// Second part: Set font size for active tags
		for (const pair of this.settings.tagIconPairs) {
			const [category, name] = pair.tag.split("/");
			const cleanTag = `${category}${name}`;

			css += `.tag[href="#${pair.tag}"]:after,\n`;
			css += `.cm-tag-${cleanTag}:after,\n`;

			if (name.includes("_")) {
				css += `.cm-tag-${cleanTag} + span.cm-hashtag:after,\n`;
				css += `.cm-tag-${cleanTag} + span.cm-hashtag + .cm-hashtag:after,\n`;
			}
		}

		css = css.slice(0, -2); // Remove last comma and newline
		css += ` {
  font-size: var(--font-text-size);
}\n\n`;

		// Third part: Set font size for active tags in editor
		for (const pair of this.settings.tagIconPairs) {
			const [category, name] = pair.tag.split("/");
			const cleanTag = `${category}${name}`;

			css += `.cm-active .tag[href="#${pair.tag}"],\n`;
			css += `.cm-active .cm-tag-${cleanTag},\n`;

			if (name.includes("_")) {
				css += `.cm-active .cm-tag-${cleanTag} + span.cm-hashtag,\n`;
				css += `.cm-active .cm-tag-${cleanTag} + span.cm-hashtag + .cm-hashtag,\n`;
			}
		}

		css = css.slice(0, -2); // Remove last comma and newline
		css += ` {
  font-size: var(--font-text-size);
}\n\n`;

		// Fourth part: Set icon for each tag
		for (const pair of this.settings.tagIconPairs) {
			const [category, name] = pair.tag.split("/");
			const cleanTag = `${category}${name}`;

			css += `.tag[href="#${pair.tag}"]:after,\n`;
			css += `.cm-hashtag-begin.cm-tag-${cleanTag}:after {\n`;
			css += `  background-color: rgba(162, 93, 53, 0.1);\n`;
			css += `  border: solid 1px rgba(209, 209, 209, 0.1);\n`;
			css += `  border-radius: 3px;\n`;
			css += `  content: "${pair.icon}";\n`;
			css += `}\n\n`;
		}

		// Create the full path for the tags.css file in the .obsidian/snippets folder
		const snippetsFolder = join(this.app.vault.configDir, "snippets");
		const cssPath = join(snippetsFolder, "tags.css");

		try {
			// Ensure the snippets folder exists
			await this.app.vault.adapter.mkdir(snippetsFolder);

			// Write the CSS to the file
			await this.app.vault.adapter.write(cssPath, css);
			console.log(
				"CSS has been written to tags.css in the snippets folder"
			);
		} catch (error) {
			console.error("Error writing CSS file:", error);
		}
	}
}

class CssGeneratorSettingTab extends PluginSettingTab {
	plugin: CssGeneratorPlugin;

	constructor(app: App, plugin: CssGeneratorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		//containerEl.createEl("h2", { text: "Tag Replacer Settings" });

		new Setting(containerEl)
			.setName("Tag-Icon Pairs")
			.setDesc(
				"Add tags and their replacement icons (e.g. task/inbox -> 📥)"
			)
			.addButton((button) =>
				button.setButtonText("+").onClick(() => {
					this.plugin.settings.tagIconPairs.push({
						tag: "",
						icon: "",
					});
					this.plugin.saveSettings();
					this.display();
				})
			);

		this.plugin.settings.tagIconPairs.forEach((pair, index) => {
			const setting = new Setting(containerEl)
				.addText((text) =>
					text
						.setPlaceholder("tag/tag")
						.setValue(pair.tag)
						.onChange(async (value) => {
							this.plugin.settings.tagIconPairs[index].tag =
								value;
							await this.plugin.saveSettings();
						})
				)
				.addText((text) =>
					text
						.setPlaceholder("icon")
						.setValue(pair.icon)
						.onChange(async (value) => {
							this.plugin.settings.tagIconPairs[index].icon =
								value;
							await this.plugin.saveSettings();
						})
				)
				.addButton((button) =>
					button
						.setButtonText("↑")
						.setTooltip("Move up")
						.onClick(async () => {
							if (index > 0) {
								const temp =
									this.plugin.settings.tagIconPairs[
										index - 1
									];
								this.plugin.settings.tagIconPairs[index - 1] =
									this.plugin.settings.tagIconPairs[index];
								this.plugin.settings.tagIconPairs[index] = temp;
								await this.plugin.saveSettings();
								this.display();
							}
						})
				)
				.addButton((button) =>
					button
						.setButtonText("↓")
						.setTooltip("Move down")
						.onClick(async () => {
							if (
								index <
								this.plugin.settings.tagIconPairs.length - 1
							) {
								const temp =
									this.plugin.settings.tagIconPairs[
										index + 1
									];
								this.plugin.settings.tagIconPairs[index + 1] =
									this.plugin.settings.tagIconPairs[index];
								this.plugin.settings.tagIconPairs[index] = temp;
								await this.plugin.saveSettings();
								this.display();
							}
						})
				)
				.addButton((button) =>
					button
						.setButtonText("X")
						.setTooltip("Remove")
						.onClick(async () => {
							this.plugin.settings.tagIconPairs.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						})
				);
			setting.infoEl.remove();
		});

		new Setting(containerEl).addButton((button) =>
			button.setButtonText("+").onClick(() => {
				this.plugin.settings.tagIconPairs.push({
					tag: "",
					icon: "",
				});
				this.plugin.saveSettings();
				this.display();
			})
		);

		new Setting(containerEl)
			.setName("Generate CSS")
			.setDesc("Generate and apply CSS based on current settings")
			.addButton((button) =>
				button
					.setButtonText("Generate CSS")
					.onClick(() => this.plugin.generateCss())
			);
	}
}
