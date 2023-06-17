import {addIcon, Notice, Plugin} from "obsidian";
import {SettingsTab} from "./Settings";
import {debug} from "@src/utils/Logger";

import axios from "axios";
import {pluginSettingsToCardainerFileSettings} from "@src/PluginSettingsToCardainerFileSettings";
import {FileManager} from "@src/FilesManager";
import {CacheData, CardainerFileSettingsData, PluginSettings} from "@src/interfaces/ISettings";
import {MochiSyncService} from "@src/services/MochiSyncService";
import {MochiCardService} from "@src/services/MochiCardService";
import {MochiTemplateService} from "@src/services/MochiTemplateService";
import {ModelNotFoundError} from "@src/exceptions/ModelNotFoundError";
import {ANKI_ICON} from "@src/Constants";
import {generateBasicAuthToken} from "@src/Helpers";

axios.defaults.baseURL = "https://app.mochi.cards/api";
axios.defaults.headers.common["Accept"] = "application/json";

export default class ObsidianToMochiPlugin extends Plugin {
    settings: PluginSettings;
    mochiTemplateNames: Array<string> = [];
    fieldNamesByTemplateName: Record<string, string[]> = {};
    addedAttachmentLinkByGeneratedId: Record<string, string> = {};
    fileHashes: Record<string, string> = {};
    scheduleId: any;

    async getDefaultSettings(): Promise<PluginSettings> {
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
        this.mochiTemplateNames = MochiSyncService.mochiTemplates.map(
            (t) => t.name
        );
        this.fieldNamesByTemplateName =
            await this.generateFieldNamesByTemplateName();
        for (let mochiTemplateName of this.mochiTemplateNames) {
            settings["CUSTOM_REGEXPS"][mochiTemplateName] = "";
            settings["FILE_LINK_FIELDS"][mochiTemplateName] =
                this.fieldNamesByTemplateName[mochiTemplateName][0];
        }
        return settings;
    }

    async generateFieldNamesByTemplateName(): Promise<Record<string, string[]>> {
        let fieldNamesByTemplateName = {};
        for (let mochiTemplateName of this.mochiTemplateNames) {
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

    async saveDefault(): Promise<void> {
        const defaultSettings = await this.getDefaultSettings();
        const cacheData: CacheData = {
            settings: defaultSettings,
            persisted_attachments: {},
            fields_dict: {},
            file_hashes: {}
        }
        await this.saveData(cacheData);
    }

    async loadSettings(): Promise<PluginSettings> {
        let currCacheData: CacheData = await this.loadData();
        debug({currCacheData: currCacheData});
        if (currCacheData == null || Object.keys(currCacheData).length != 4) {
            new Notice("Need to connect to Mochi generate default settings...");
            const defaultSettings = await this.getDefaultSettings();
            const cacheData: CacheData = {
                settings: defaultSettings,
                persisted_attachments: {},
                fields_dict: {},
                file_hashes: {}
            }
            await this.saveData(cacheData);
            new Notice("Default settings successfully generated!");
            return defaultSettings;
        } else {
            return currCacheData.settings;
        }
    }

    async loadAddedMedia(): Promise<Record<string, string>> {
        const currCacheData: CacheData = await this.loadData();
        if (currCacheData == null) {
            await this.saveDefault();
            return {};
        } else {
            return currCacheData.persisted_attachments;
        }
    }

    async loadFileHashes(): Promise<Record<string, string>> {
        const currCacheData: CacheData = await this.loadData();
        if (currCacheData == null) {
            await this.saveDefault();
            return {};
        } else {
            return currCacheData.file_hashes;
        }
    }

    async loadFieldsDict(): Promise<Record<string, string[]>> {
        const currCacheData: CacheData = await this.loadData();
        if (currCacheData == null) {
            await this.saveDefault();
            return await this.generateFieldNamesByTemplateName();
        }
        return currCacheData.fields_dict;
    }

    async saveAllData(): Promise<void> {
        const currCacheData: CacheData = {
            settings: this.settings,
            fields_dict: this.fieldNamesByTemplateName,
            file_hashes: this.fileHashes,
            persisted_attachments: this.addedAttachmentLinkByGeneratedId
        }
        await this.saveData(currCacheData);
    }

    regenerateSettingsRegexps() {
        let regexp_section = this.settings["CUSTOM_REGEXPS"];
        // For new note types
        for (let note_type of this.mochiTemplateNames) {
            this.settings["CUSTOM_REGEXPS"][note_type] =
                regexp_section.hasOwnProperty(note_type)
                    ? regexp_section[note_type]
                    : "";
        }
        // Removing old note types
        for (let note_type of Object.keys(this.settings["CUSTOM_REGEXPS"])) {
            if (!this.mochiTemplateNames.includes(note_type)) {
                delete this.settings["CUSTOM_REGEXPS"][note_type];
            }
        }
    }

    async scanVault() {
        if (!this.settings.API_TOKEN) {
            new Notice("Provide Mochi API key in order to start sync...");

            return;
        }
        new Notice("Scanning vault, check console for details...");

        MochiSyncService.mochiCards = await MochiCardService.indexCards();
        const data: CardainerFileSettingsData = await pluginSettingsToCardainerFileSettings(
            this.app,
            this.settings,
            this.fieldNamesByTemplateName
        );
        const manager = FileManager.createSingletonInstance(
            this.app,
            data,
            this.app.vault.getMarkdownFiles(),
            this.fileHashes,
            this.addedAttachmentLinkByGeneratedId
        );
        await manager.detectFilesChanges();
        await manager.createAttachmentsForMochiCards();
        debug({after_file_changes_detect_manager: manager});

        await MochiSyncService.syncFileManagerWithRemote(manager);
        await MochiSyncService.syncChangesToCardsFiles(manager);

        // await manager.requests_1()
        this.addedAttachmentLinkByGeneratedId =
            manager.persistedAttachmentLinkByGeneratedId;
        const hashes = manager.getFileHashes();
        for (let key in hashes) {
            this.fileHashes[key] = hashes[key];
        }
        new Notice("All done! Saving file hashes and added media now...");
        await this.saveAllData();
    }

    async onload() {
        console.log("loading Obsidian_to_Mochi...");

        addIcon("flash_card_icon", ANKI_ICON);

        try {
            this.settings = await this.loadSettings();
            debug({API_TOKEN: this.settings.API_TOKEN});
            const basicAuthToken = generateBasicAuthToken(this.settings.API_TOKEN);
            axios.defaults.headers.common[
                "Authorization"
                ] = `Basic ${basicAuthToken}`;
        } catch (e) {
            new Notice("Couldn't connect to Mochi! Check console for error message.");
            return;
        }
        await MochiTemplateService.index();
        this.mochiTemplateNames = Object.keys(this.settings["CUSTOM_REGEXPS"]);
        this.fieldNamesByTemplateName = await this.loadFieldsDict();
        if (Object.keys(this.fieldNamesByTemplateName).length == 0) {
            new Notice("Need to connect Mochi to generate fields dictionary...");
            try {
                this.fieldNamesByTemplateName =
                    await this.generateFieldNamesByTemplateName();
                new Notice("Fields dictionary successfully generated!");
            } catch (e) {
                new Notice(
                    "Couldn't connect to Mochi! Check console for error message."
                );
                return;
            }
        }
        this.addedAttachmentLinkByGeneratedId = await this.loadAddedMedia();
        this.fileHashes = await this.loadFileHashes();

        this.addSettingTab(new SettingsTab(this.app, this));

        this.addRibbonIcon(
            "flash_card_icon",
            "Obsidian_to_mochi - Scan Vault",
            async () => {
                await this.scanVault();
            }
        );

        this.addCommand({
            id: "mochi-scan-vault",
            name: "Scan Vault",
            callback: async () => {
                await this.scanVault();
            },
        });
    }

    async onunload() {
        console.log("Saving settings for Obsidian_to_mochi...");
        await this.saveAllData();
        console.log("unloading Obsidian_to_mochi...");
    }
}
