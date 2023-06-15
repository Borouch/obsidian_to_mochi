import {addIcon, Notice, Plugin} from 'obsidian'
import {SettingsTab} from './settings'
import {debug} from "@src/utils/logger";

import axios from "axios";
import {settingToData} from "@src/SettingToData";
import {FileManager} from "@src/FilesManager";
import {ParsedSettingsData, PluginSettings} from "@src/interfaces/ISettings";
import {MochiSyncService} from "@src/services/MochiSyncService";
import {MochiCardService} from "@src/services/MochiCardService";
import {MochiTemplateService} from "@src/services/MochiTemplateService";
import {ModelNotFoundError} from "@src/exceptions/ModelNotFoundError";
import {ANKI_ICON} from "@src/Constants";
import {generateBasicAuthToken} from "@src/Helpers";

axios.defaults.baseURL = 'https://app.mochi.cards/api';
axios.defaults.headers.common['Accept'] = 'application/json'

export default class ObsidianToMochiPlugin extends Plugin {

    settings: PluginSettings
    mochiTemplateNames: Array<string>
    fieldNamesByTemplateName: Record<string, string[]>
    addedMedia: string[]
    fileHashes: Record<string, string>
    scheduleId: any

    async getDefaultSettings(): Promise<PluginSettings> {
        let settings: PluginSettings = {
            API_TOKEN: '',
            CUSTOM_REGEXPS: {},
            FILE_LINK_FIELDS: {},
            CONTEXT_FIELDS: {},
            FOLDER_DECKS: {},
            FOLDER_TAGS: {},
            Syntax: {
                "Begin Note": "START",
                "End Note": "END",
                "Begin Inline Note": "STARTI",
                "End Inline Note": "ENDI",
                "Target Deck Line": "TARGET DECK",
                "File Tags Line": "FILE TAGS",
                "Delete Note Line": "DELETE",
                "Frozen Fields Line": "FROZEN"
            },
            Defaults: {
                "Tag": "Obsidian_to_Anki",
                "Deck": "Default",
                "Scheduling Interval": 0,
                "Add File Link": false,
                "Add Context": false,
                "CurlyCloze": false,
                "CurlyCloze - Highlights to Clozes": false,
                "ID Comments": true,
                "Add Obsidian Tags": false,
            }
        }
        /*Making settings from scratch, so need note types*/
        this.mochiTemplateNames = MochiSyncService.mochiTemplates.map((t) => t.name)
        this.fieldNamesByTemplateName = await this.generateFieldNamesByTemplateName()
        for (let mochiTemplateName of this.mochiTemplateNames) {

            settings["CUSTOM_REGEXPS"][mochiTemplateName] = ""
            settings["FILE_LINK_FIELDS"][mochiTemplateName] = this.fieldNamesByTemplateName[mochiTemplateName][0]
        }
        return settings
    }

    async generateFieldNamesByTemplateName(): Promise<Record<string, string[]>> {
        let fieldNamesByTemplateName = {}
        for (let mochiTemplateName of this.mochiTemplateNames) {
            const template = MochiSyncService.mochiTemplates.find((t) => t.name === mochiTemplateName)
            if (!template) {
                new Notice('Something went wrong, check console for details')
                throw new ModelNotFoundError('Template not found')
            }

            fieldNamesByTemplateName[mochiTemplateName] = Object.keys(template.fields).map((k) => template.fields[k].name)
        }
        return fieldNamesByTemplateName
    }

    async saveDefault(): Promise<void> {
        const default_sets = await this.getDefaultSettings()
        this.saveData(
            {
                settings: default_sets,
                "Added Media": [],
                "File Hashes": {},
                fields_dict: {}
            }
        )
    }

    async loadSettings(): Promise<PluginSettings> {
        let currentData = await this.loadData()
        debug({currentData})
        if (currentData == null || Object.keys(currentData).length != 4) {
            new Notice("Need to connect to Mochi generate default settings...")
            const default_sets = await this.getDefaultSettings()
            this.saveData(
                {
                    settings: default_sets,
                    "Added Media": [],
                    "File Hashes": {},
                    fields_dict: {}
                }
            )
            new Notice("Default settings successfully generated!")
            return default_sets
        } else {
            return currentData.settings
        }
    }

    async loadAddedMedia(): Promise<string[]> {
        let currentData = await this.loadData()
        if (currentData == null) {
            await this.saveDefault()
            return []
        } else {
            return currentData["Added Media"]
        }
    }

    async loadFileHashes(): Promise<Record<string, string>> {
        let currentData = await this.loadData()
        if (currentData == null) {
            await this.saveDefault()
            return {}
        } else {
            return currentData["File Hashes"]
        }
    }

    async loadFieldsDict(): Promise<Record<string, string[]>> {
        let currentData = await this.loadData()
        if (currentData == null) {
            await this.saveDefault()
            const fields_dict = await this.generateFieldNamesByTemplateName()
            return fields_dict
        }
        return currentData.fields_dict
    }

    async saveAllData(): Promise<void> {
        this.saveData(
            {
                settings: this.settings,
                "Added Media": this.addedMedia,
                "File Hashes": this.fileHashes,
                fields_dict: this.fieldNamesByTemplateName
            }
        )
    }

    regenerateSettingsRegexps() {
        let regexp_section = this.settings["CUSTOM_REGEXPS"]
        // For new note types
        for (let note_type of this.mochiTemplateNames) {
            this.settings["CUSTOM_REGEXPS"][note_type] = regexp_section.hasOwnProperty(note_type) ? regexp_section[note_type] : ""
        }
        // Removing old note types
        for (let note_type of Object.keys(this.settings["CUSTOM_REGEXPS"])) {
            if (!this.mochiTemplateNames.includes(note_type)) {
                delete this.settings["CUSTOM_REGEXPS"][note_type]
            }
        }
    }

    async scanVault() {
        if (!this.settings.API_TOKEN) {
            new Notice('Provide Mochi API key in order to start sync...');

            return
        }
        new Notice('Scanning vault, check console for details...');

        MochiSyncService.mochiCards = await MochiCardService.indexCards()
        const data: ParsedSettingsData = await settingToData(this.app, this.settings, this.fieldNamesByTemplateName)
        const manager = new FileManager(this.app, data, this.app.vault.getMarkdownFiles(), this.fileHashes, this.addedMedia)
        await manager.detectFilesChanges()
        debug({after_file_changes_detect_manager: manager})

        await MochiSyncService.syncFileManagerWithRemote(manager)
        await MochiSyncService.syncChangesToCardsFiles(manager)

        // await manager.requests_1()
        this.addedMedia = Array.from(manager.added_media_set)
        const hashes = manager.getHashes()
        for (let key in hashes) {
            this.fileHashes[key] = hashes[key]
        }
        new Notice("All done! Saving file hashes and added media now...")
        await this.saveAllData()
    }

    async onload() {
        console.log('loading Obsidian_to_Mochi...');

        addIcon('flash_card_icon', ANKI_ICON)

        try {
            this.settings = await this.loadSettings()
            debug({API_TOKEN: this.settings.API_TOKEN})
            const basicAuthToken = generateBasicAuthToken(this.settings.API_TOKEN)
            axios.defaults.headers.common['Authorization'] = `Basic ${basicAuthToken}`;

        } catch (e) {
            new Notice("Couldn't connect to Mochi! Check console for error message.")
            return
        }
        await MochiTemplateService.index()
        this.mochiTemplateNames = Object.keys(this.settings["CUSTOM_REGEXPS"])
        this.fieldNamesByTemplateName = await this.loadFieldsDict()
        if (Object.keys(this.fieldNamesByTemplateName).length == 0) {
            new Notice('Need to connect Mochi to generate fields dictionary...')
            try {
                this.fieldNamesByTemplateName = await this.generateFieldNamesByTemplateName()
                new Notice("Fields dictionary successfully generated!")
            } catch (e) {
                new Notice("Couldn't connect to Mochi! Check console for error message.")
                return
            }
        }
        this.addedMedia = await this.loadAddedMedia()
        this.fileHashes = await this.loadFileHashes()

        this.addSettingTab(new SettingsTab(this.app, this));

        this.addRibbonIcon('flash_card_icon', 'Obsidian_to_mochi - Scan Vault', async () => {
            await this.scanVault()
        })

        this.addCommand({
            id: 'mochi-scan-vault',
            name: 'Scan Vault',
            callback: async () => {
                await this.scanVault()
            }
        })
    }

    async onunload() {
        console.log("Saving settings for Obsidian_to_mochi...")
        this.saveAllData()
        console.log('unloading Obsidian_to_mochi...');
    }
}
