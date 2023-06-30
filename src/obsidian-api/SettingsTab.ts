import {Notice, PluginSettingTab, Setting, TFolder} from "obsidian";
import ObsidianToMochiPlugin from "@src/main";

const defaultDescs = {
    Tag: "The tag that the this.mochiPlugin automatically adds to any generated cards.",
    Deck: "The deck the this.mochiPlugin adds cards to if TARGET DECK is not specified in the file.",
    "Scheduling Interval":
        "The time, in minutes, between automatic scans of the vault. Set this to 0 to disable automatic scanning.",
    "Add File Link":
        "Append a link to the file that generated the flashcard on the field specified in the table.",
    "Add Context":
        "Append 'context' for the card, in the form of path > heading > heading etc, to the field specified in the table.",
    CurlyCloze:
        "Convert {cloze deletions} -> {{c1::cloze deletions}} on note types that have a 'Cloze' in their name.",
    "CurlyCloze - Highlights to Clozes":
        "Convert ==highlights== -> {highlights} to be processed by CurlyCloze.",
    "ID Comments": "Wrap note IDs in a HTML comment.",
    "Add Obsidian Tags":
        "Interpret #tags in the fields of a note as Mochitags, removing them from the note text in Anki.",
};

export class SettingsTab extends PluginSettingTab {
    // @ts-ignore
    mochiPlugin = this.plugin as ObsidianToMochiPlugin

    setup_custom_regexp(templateName: string, row_cells: HTMLCollection) {
        let regexp_section = this.mochiPlugin.settings["CUSTOM_REGEXPS"];
        let custom_regexp = new Setting(row_cells[1] as HTMLElement).addText(
            (text) =>
                text
                    .setValue(
                        regexp_section.hasOwnProperty(templateName)
                            ? regexp_section[templateName]
                            : ""
                    )
                    .onChange((value) => {
                        this.mochiPlugin.settings["CUSTOM_REGEXPS"][templateName] = value;
                        this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
                    })
        );
        custom_regexp.settingEl = row_cells[1] as HTMLElement;
        custom_regexp.infoEl.remove();
        custom_regexp.controlEl.className += " anki-center";
    }

    setup_link_field(templateName: string, rowCells: HTMLCollection) {
        let link_fields_section = this.mochiPlugin.settings.FILE_LINK_FIELDS;
        let link_field = new Setting(rowCells[2] as HTMLElement).addDropdown(
            async (dropdown) => {
                const field_names = this.mochiPlugin.cacheData.field_names_by_template_name[templateName] ?? [];
                for (let field of field_names) {
                    dropdown.addOption(field, field);
                }
                dropdown.setValue(
                    link_fields_section.hasOwnProperty(templateName)
                        ? link_fields_section[templateName]
                        : field_names[0]
                );
                dropdown.onChange((value) => {
                    this.mochiPlugin.settings.FILE_LINK_FIELDS[templateName] = value;
                    this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
                });
            }
        );
        link_field.settingEl = rowCells[2] as HTMLElement;
        link_field.infoEl.remove();
        link_field.controlEl.className += " anki-center";
    }

    setupContextField(templateName: string, rowCells: HTMLCollection) {
        let context_fields_section: Record<string, string> =
            this.mochiPlugin.settings.CONTEXT_FIELDS;
        let context_field = new Setting(rowCells[3] as HTMLElement).addDropdown(
            async (dropdown) => {
                const fieldNames = this.mochiPlugin.cacheData.field_names_by_template_name[templateName] ?? [];
                for (let field of fieldNames) {
                    dropdown.addOption(field, field);
                }
                dropdown.setValue(
                    context_fields_section.hasOwnProperty(templateName)
                        ? context_fields_section[templateName]
                        : fieldNames[0]
                );
                dropdown.onChange((value) => {
                    this.mochiPlugin.settings.CONTEXT_FIELDS[templateName] = value;
                    this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
                });
            }
        );
        context_field.settingEl = rowCells[3] as HTMLElement;
        context_field.infoEl.remove();
        context_field.controlEl.className += " anki-center";
    }

    createCollapsible(name: string) {
        let {containerEl} = this;
        let div = containerEl.createEl("div", {cls: "collapsible-item"});
        div.innerHTML = `
			<div class="collapsible-item-self"><div class="collapsible-item-collapse collapse-icon anki-rotated"><svg viewBox="0 0 100 100" width="8" height="8" class="right-triangle"><path fill="currentColor" stroke="currentColor" d="M94.9,20.8c-1.4-2.5-4.1-4.1-7.1-4.1H12.2c-3,0-5.7,1.6-7.1,4.1c-1.3,2.4-1.2,5.2,0.2,7.6L43.1,88c1.5,2.3,4,3.7,6.9,3.7 s5.4-1.4,6.9-3.7l37.8-59.6C96.1,26,96.2,23.2,94.9,20.8L94.9,20.8z"></path></svg></div><div class="collapsible-item-inner"></div><header>${name}</header></div>
		`;
        div.addEventListener("click", function () {
            this.classList.toggle("active");
            let icon = this.firstElementChild.firstElementChild as HTMLElement;
            icon.classList.toggle("anki-rotated");
            let content = this.nextElementSibling as HTMLElement;
            if (content.style.display === "block") {
                content.style.display = "none";
            } else {
                content.style.display = "block";
            }
        });
    }

    setupCardTable() {
        let {containerEl} = this;
        containerEl.createEl("h3", {text: "Note type settings"});
        this.createCollapsible("Template Table");
        let note_type_table = containerEl.createEl("table", {
            cls: "anki-settings-table",
        });
        let head = note_type_table.createTHead();
        let header_row = head.insertRow();
        for (let header of [
            "Template name",
            "Custom Regexp",
            "File Link Field",
            "Context Field",
        ]) {
            let th = document.createElement("th");
            th.appendChild(document.createTextNode(header));
            header_row.appendChild(th);
        }
        let main_body = note_type_table.createTBody();
        if (!this.mochiPlugin.settings.hasOwnProperty("CONTEXT_FIELDS")) {
            this.mochiPlugin.settings.CONTEXT_FIELDS = {};
        }
        for (let note_type of this.mochiPlugin.mochiTemplateNames) {
            let row = main_body.insertRow();

            row.insertCell();
            row.insertCell();
            row.insertCell();
            row.insertCell();

            let row_cells = row.children;

            row_cells[0].innerHTML = note_type;
            this.setup_custom_regexp(note_type, row_cells);
            this.setup_link_field(note_type, row_cells);
            this.setupContextField(note_type, row_cells);
        }
    }

    setupSyntax() {
        let {containerEl} = this;
        let syntax_settings = containerEl.createEl("h3", {
            text: "Syntax Settings",
        });
        for (let key of Object.keys(this.mochiPlugin.settings["Syntax"])) {
            new Setting(syntax_settings).setName(key).addText((text) =>
                text.setValue(this.mochiPlugin.settings["Syntax"][key]).onChange((value) => {
                    this.mochiPlugin.settings["Syntax"][key] = value;
                    this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
                })
            );
        }
    }

    setupDefaults() {
        let {containerEl} = this;
        let defaults_settings = containerEl.createEl("h3", {text: "Defaults"});

        // To account for new add context
        if (!this.mochiPlugin.settings["Defaults"].hasOwnProperty("Add Context")) {
            this.mochiPlugin.settings["Defaults"]["Add Context"] = false;
        }
        // To account for new scheduling interval
        if (!this.mochiPlugin.settings["Defaults"].hasOwnProperty("Scheduling Interval")) {
            this.mochiPlugin.settings["Defaults"]["Scheduling Interval"] = 0;
        }
        // To account for new highlights to clozes
        if (
            !this.mochiPlugin.settings["Defaults"].hasOwnProperty(
                "CurlyCloze - Highlights to Clozes"
            )
        ) {
            this.mochiPlugin.settings["Defaults"]["CurlyCloze - Highlights to Clozes"] = false;
        }
        // To account for new add obsidian tags
        if (!this.mochiPlugin.settings["Defaults"].hasOwnProperty("Add Obsidian Tags")) {
            this.mochiPlugin.settings["Defaults"]["Add Obsidian Tags"] = false;
        }
        for (let key of Object.keys(this.mochiPlugin.settings["Defaults"])) {
            // To account for removal of regex setting
            if (key === "Regex") {
                continue;
            }
            if (typeof this.mochiPlugin.settings["Defaults"][key] === "string") {
                new Setting(defaults_settings)
                    .setName(key)
                    .setDesc(defaultDescs[key])
                    .addText((text) =>
                        text
                            .setValue(this.mochiPlugin.settings["Defaults"][key])
                            .onChange((value) => {
                                this.mochiPlugin.settings["Defaults"][key] = value;
                                this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
                            })
                    );
            } else if (typeof this.mochiPlugin.settings["Defaults"][key] === "boolean") {
                new Setting(defaults_settings)
                    .setName(key)
                    .setDesc(defaultDescs[key])
                    .addToggle((toggle) =>
                        toggle
                            .setValue(this.mochiPlugin.settings["Defaults"][key])
                            .onChange((value) => {
                                this.mochiPlugin.settings["Defaults"][key] = value;
                                this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
                            })
                    );
            } else {
                new Setting(defaults_settings)
                    .setName(key)
                    .setDesc(defaultDescs[key])
                    .addSlider((slider) => {
                        slider
                            .setValue(this.mochiPlugin.settings["Defaults"][key])
                            .setLimits(0, 360, 5)
                            .setDynamicTooltip()
                            .onChange(async (value) => {
                                this.mochiPlugin.settings["Defaults"][key] = value;
                                await this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
                                if (this.mochiPlugin.hasOwnProperty("schedule_id")) {
                                    window.clearInterval(this.mochiPlugin.scheduleId);
                                }
                                if (value != 0) {
                                    this.mochiPlugin.scheduleId = window.setInterval(
                                        async () => await this.mochiPlugin.scanVault(),
                                        value * 1000 * 60
                                    );
                                    this.mochiPlugin.registerInterval(this.mochiPlugin.scheduleId);
                                }
                            });
                    });
            }
        }
    }

    getFolders(): TFolder[] {
        const app = this.mochiPlugin.app;
        let folder_list: TFolder[] = [app.vault.getRoot()];
        for (let folder of folder_list) {
            let filtered_list: TFolder[] = folder.children.filter((element) =>
                element.hasOwnProperty("children")
            ) as TFolder[];
            folder_list.push(...filtered_list);
        }
        return folder_list.slice(1); //Removes initial vault folder
    }

    setupFolderDeck(folder: TFolder, row_cells: HTMLCollection) {
        let folder_decks = this.mochiPlugin.settings.FOLDER_DECKS;
        if (!folder_decks.hasOwnProperty(folder.path)) {
            folder_decks[folder.path] = "";
        }
        let folder_deck = new Setting(row_cells[1] as HTMLElement).addText((text) =>
            text.setValue(folder_decks[folder.path]).onChange((value) => {
                this.mochiPlugin.settings.FOLDER_DECKS[folder.path] = value;
                this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
            })
        );
        folder_deck.settingEl = row_cells[1] as HTMLElement;
        folder_deck.infoEl.remove();
        folder_deck.controlEl.className += " anki-center";
    }

    setupFolderTag(folder: TFolder, row_cells: HTMLCollection) {
        let folder_tags = this.mochiPlugin.settings.FOLDER_TAGS;
        if (!folder_tags.hasOwnProperty(folder.path)) {
            folder_tags[folder.path] = "";
        }
        let folder_tag = new Setting(row_cells[2] as HTMLElement).addText((text) =>
            text.setValue(folder_tags[folder.path]).onChange((value) => {
                this.mochiPlugin.settings.FOLDER_TAGS[folder.path] = value;
                this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
            })
        );
        folder_tag.settingEl = row_cells[2] as HTMLElement;
        folder_tag.infoEl.remove();
        folder_tag.controlEl.className += " anki-center";
    }

    setupFolderTable() {
        let {containerEl} = this;
        const folder_list = this.getFolders();
        containerEl.createEl("h3", {text: "Folder settings"});
        this.createCollapsible("Folder Table");
        let folder_table = containerEl.createEl("table", {
            cls: "anki-settings-table",
        });
        let head = folder_table.createTHead();
        let header_row = head.insertRow();
        for (let header of ["Folder", "Folder Deck", "Folder Tags"]) {
            let th = document.createElement("th");
            th.appendChild(document.createTextNode(header));
            header_row.appendChild(th);
        }
        let main_body = folder_table.createTBody();
        if (!this.mochiPlugin.settings.hasOwnProperty("FOLDER_DECKS")) {
            this.mochiPlugin.settings.FOLDER_DECKS = {};
        }
        if (!this.mochiPlugin.settings.hasOwnProperty("FOLDER_TAGS")) {
            this.mochiPlugin.settings.FOLDER_TAGS = {};
        }
        for (let folder of folder_list) {
            let row = main_body.insertRow();

            row.insertCell();
            row.insertCell();
            row.insertCell();

            let row_cells = row.children;

            row_cells[0].innerHTML = folder.path;
            this.setupFolderDeck(folder, row_cells);
            this.setupFolderTag(folder, row_cells);
        }
    }

    setupButtons() {
        let {containerEl} = this;
        let action_buttons = containerEl.createEl("h3", {text: "Actions"});
        new Setting(action_buttons)
            .setName("Regenerate Note Type Table")
            .setDesc(
                "Connect to Mochi to regenerate the table with new templates, or get rid of deleted templates."
            )
            .addButton((button) => {
                button
                    .setButtonText("Regenerate")
                    .setClass("mod-cta")
                    .onClick(async () => {
                        new Notice("Need to connect to Mochi to update note types...");
                        try {

                            await this.mochiPlugin.cacheDataManager.generateMochiConnectionDependentSettings()

                            this.setupDisplay();
                            new Notice("Template names updated!");
                        } catch (e) {
                            new Notice(
                                "Couldn't connect to mochi! Check console for details."
                            );
                        }
                    });
            });
        new Setting(action_buttons)
            .setName("Clear Media Cache")
            .setDesc(
                `Clear the cached list of media filenames that have been added to Anki.

			The this.mochiPlugin will skip over adding a media file if it's added a file with the same name before, so clear this if e.g. you've updated the media file with the same name.`
            )
            .addButton((button) => {
                button
                    .setButtonText("Clear")
                    .setClass("mod-cta")
                    .onClick(async () => {
                        this.mochiPlugin.cacheData.persisted_attachment_links_by_id = {};
                        await this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
                        new Notice("Media Cache cleared successfully!");
                    });
            });
        new Setting(action_buttons)
            .setName("Clear File Hash Cache")
            .setDesc(
                `Clear the cached dictionary of file hashes that the this.mochiPlugin has scanned before.

			The this.mochiPlugin will skip over a file if the file path and the hash is unaltered.`
            )
            .addButton((button) => {
                button
                    .setButtonText("Clear")
                    .setClass("mod-cta")
                    .onClick(async () => {
                        this.mochiPlugin.cacheData.file_hashes_by_path = {};
                        await this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
                        new Notice("File Hash Cache cleared successfully!");
                    });
            });
        new Setting(action_buttons)
            .setName("Clear Cards Hash Cache")
            .setDesc(
                `Clear the cached dictionary of cards hashes that the this.mochiPlugin has scanned before.`
            )
            .addButton((button) => {
                button
                    .setButtonText("Clear")
                    .setClass("mod-cta")
                    .onClick(async () => {
                        this.mochiPlugin.cacheData.card_hashes_by_id = {};
                        await this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
                        new Notice("Card Hash Cache cleared successfully!");
                    });
            });
    }

    setupApiField() {
        let {containerEl} = this;

        const h = containerEl.createEl("h2", {text: "API key"});
        const apiField = containerEl.createEl("div");
        new Setting(apiField).setName("Mochi API key").addText((t) =>
            t.setValue(this.mochiPlugin.settings.API_TOKEN).onChange(async (value) => {
                this.mochiPlugin.settings.API_TOKEN = value
                await this.mochiPlugin.cacheDataManager.saveAllData(this.mochiPlugin.cacheData);
            })
        );
    }

    setupDisplay() {
        let {containerEl} = this;

        containerEl.empty();
        containerEl.createEl("h2", {text: "Obsidian_to_Mochisettings"});
        containerEl.createEl("a", {
            text: "For more information check the wiki",
            href: "https://github.com/Pseudonium/Obsidian_to_Anki/wiki",
        });
        this.setupApiField()
        this.setupCardTable();
        this.setupFolderTable();
        this.setupSyntax();
        this.setupDefaults();
        this.setupButtons();
    }

    async display() {
        this.setupDisplay();
    }
}
