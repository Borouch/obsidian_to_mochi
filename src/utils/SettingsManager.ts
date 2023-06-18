import {CacheData, PluginSettings} from "@src/interfaces/ISettings";
import {MochiSyncService} from "@src/services/MochiSyncService";
import {Notice} from "obsidian";
import {ModelNotFoundError} from "@src/exceptions/ModelNotFoundError";
import {debug} from "@src/utils/Logger";
import ObsidianToMochiPlugin from "@src/main";
import {CacheDataManager} from "@src/utils/CacheDataManager";

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
        if (!SettingsManager._i) {
            SettingsManager._i = new SettingsManager(
                plugin
            );
        }

        return SettingsManager._i;
    }

    public async generateFieldNamesByTemplateName(mochiTemplateNames: string[]): Promise<Record<string, string[]>> {
        let fieldNamesByTemplateName = {};
        for (let mochiTemplateName of mochiTemplateNames) {
            const template = MochiSyncService.mochiTemplates.find(
                (t) => t.name === mochiTemplateName
            );
            if (!template) {
                new Notice("Something went wrong, check console for details");
                throw new ModelNotFoundError("Template not found");
            }

            fieldNamesByTemplateName[mochiTemplateName] = Object.keys(
                template.fields
            ).map((k) => template.fields[k].name);
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
        /*Making settings from scratch, so need note types*/
        this.plugin.mochiTemplateNames = MochiSyncService.mochiTemplates.map(
            (t) => t.name
        );
        this.plugin.cacheData.field_names_by_template_name =
            await this.generateFieldNamesByTemplateName();

        for (let mochiTemplateName of this.plugin.mochiTemplateNames) {
            settings["CUSTOM_REGEXPS"][mochiTemplateName] = "";
            settings["FILE_LINK_FIELDS"][mochiTemplateName] =
                this.fieldNamesByTemplateName[mochiTemplateName][0];
        }
        return settings;
    }

    public async loadSettingsOrGenerateDefault(): Promise<PluginSettings> {
        let loadedCacheData: CacheData = await this.plugin.loadData();
        debug({currCacheData: loadedCacheData});
        if (loadedCacheData == null || Object.keys(loadedCacheData).length != 4) {
            new Notice("Need to connect to Mochi generate default settings...");
            const defaultCacheData = await CacheDataManager.i.saveDefaultCacheData()
            new Notice("Default settings successfully generated!");
            return defaultCacheData.settings;
        } else {
            return loadedCacheData.settings;
        }
    }


    public regenerateSettingsRegexps() {
        const settings = this.plugin.settings
        const mochiTemplateNames = this.plugin.mochiTemplateNames
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

}