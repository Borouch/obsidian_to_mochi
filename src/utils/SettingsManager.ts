import {PluginSettings} from "@src/interfaces/ISettings";
import ObsidianToMochiPlugin from "@src/main";
import {MochiTemplate} from "@src/models/MochiTemplate";

export class SettingsManager {

    private constructor(public plugin: ObsidianToMochiPlugin) {
    }

    private static _i: SettingsManager | null = null;

    public static get i() {
        return SettingsManager._i;
    }

    public static createSingletonInstance(
        plugin: ObsidianToMochiPlugin,
    ): SettingsManager {

        SettingsManager._i = new SettingsManager(
            plugin
        );
        return SettingsManager._i;
    }

    public generateFieldNamesByTemplateName(mochiTemplates: MochiTemplate[]): Record<string, string[]> {
        let fieldNamesByTemplateName = {};
        for (let mochiTemplate of mochiTemplates) {

            fieldNamesByTemplateName[mochiTemplate.name] = Object.keys(
                mochiTemplate.fields
            ).map((fieldId) => mochiTemplate.fields[fieldId].name);
        }
        return fieldNamesByTemplateName;
    }

    public async getDefaultSettings(): Promise<PluginSettings> {
        let settings: PluginSettings = {
            API_TOKEN: "",
            CUSTOM_REGEXPS: {},
            FILE_LINK_FIELDS: {},
            CONTEXT_FIELDS: {},
            FOLDER_DECKS: {},
            FOLDER_TAGS: {},
            Syntax: {
                "Begin Card": "START",
                "End Card": "END",
                "Begin Inline Card": "STARTI",
                "End Inline Card": "ENDI",
                "Target Deck Line": "TARGET DECK",
                "File Tags Line": "FILE TAGS",
                "Delete Card Line": "DELETE",
                "Frozen Fields Line": "FROZEN",
            },
            Defaults: {
                Tag: "obsidian-to-mochi",
                DeckName: "Default",
                "Scheduling Interval": 0,
                "Add File Link": false,
                "Add Context": false,
                CurlyCloze: false,
                "CurlyCloze - Highlights to Clozes": false,
                "ID Comments": true,
                "Add Obsidian Tags": false,
            },
        };

        return settings;
    }


    public generateSettingsRegexps(mochiTemplateNames: string[]) {
        const settings = this.plugin.settings
        let regexpSection = settings["CUSTOM_REGEXPS"];
        // For new mochi template names
        for (let mochiTemplateName of mochiTemplateNames) {
            settings["CUSTOM_REGEXPS"][mochiTemplateName] =
                regexpSection.hasOwnProperty(mochiTemplateName)
                    ? regexpSection[mochiTemplateName]
                    : "";
        }
        // Removing old mochi template names
        for (let cardTemplateNames of Object.keys(settings["CUSTOM_REGEXPS"])) {
            if (!mochiTemplateNames.includes(cardTemplateNames)) {
                delete settings["CUSTOM_REGEXPS"][cardTemplateNames];
            }
        }
    }

    public generateFileLinkFields(mochiTemplateNames: string[]) {
        const settings = this.plugin.settings
        for (const name of mochiTemplateNames) {
            settings["FILE_LINK_FIELDS"][name] =
                this.plugin.cacheData.field_names_by_template_name[name][0];
        }

    }

}