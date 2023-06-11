import {addIcon, Notice, Plugin} from 'obsidian'
import * as AnkiConnect from './anki'
import {ParsedSettingsData, PluginSettings} from './interfaces/settings-interface'
import {SettingsTab} from './settings'
import {ANKI_ICON} from './constants'
import {debug} from "@src/utils/logger";

import axios from "axios";
import {settingToData} from "@src/SettingToData";
import {FileManager} from "@src/FilesManager";
axios.defaults.baseURL = 'http://app.mochi.cards/api';
axios.defaults.headers.common['Accept']='application/json'
export default class MyPlugin extends Plugin {

    settings: PluginSettings
    noteTypes: Array<string>
    fieldsDict: Record<string, string[]>
    addedMedia: string[]
    fileHashes: Record<string, string>

    async getDefaultSettings(): Promise<PluginSettings> {
        let settings: PluginSettings = {
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
        this.noteTypes = await AnkiConnect.invoke('modelNames') as Array<string>
        this.fieldsDict = await this.generateFieldsDict()
        for (let note_type of this.noteTypes) {
            settings["CUSTOM_REGEXPS"][note_type] = ""
            const field_names: string[] = await AnkiConnect.invoke(
                'modelFieldNames', {modelName: note_type}
            ) as string[]
            this.fieldsDict[note_type] = field_names
            settings["FILE_LINK_FIELDS"][note_type] = field_names[0]
        }
        return settings
    }

    async generateFieldsDict(): Promise<Record<string, string[]>> {
        let fields_dict = {}
        for (let note_type of this.noteTypes) {
            const field_names: string[] = await AnkiConnect.invoke(
                'modelFieldNames', {modelName: note_type}
            ) as string[]
            fields_dict[note_type] = field_names
        }
        return fields_dict
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
            new Notice("Need to connect to Anki generate default settings...")
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
            const fields_dict = await this.generateFieldsDict()
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
                fields_dict: this.fieldsDict
            }
        )
    }

    regenerateSettingsRegexps() {
        let regexp_section = this.settings["CUSTOM_REGEXPS"]
        // For new note types
        for (let note_type of this.noteTypes) {
            this.settings["CUSTOM_REGEXPS"][note_type] = regexp_section.hasOwnProperty(note_type) ? regexp_section[note_type] : ""
        }
        // Removing old note types
        for (let note_type of Object.keys(this.settings["CUSTOM_REGEXPS"])) {
            if (!this.noteTypes.includes(note_type)) {
                delete this.settings["CUSTOM_REGEXPS"][note_type]
            }
        }
    }

    async scanVault() {
        new Notice('Scanning vault, check console for details...');
        console.info("Checking connection to Anki...")

        try {
            await AnkiConnect.invoke('modelNames')
        } catch (e) {
            new Notice("Error, couldn't connect to Anki! Check console for error message.")
            return
        }

        new Notice("Successfully connected to Anki! This could take a few minutes - please don't close Anki until the plugin is finished")
        const data: ParsedSettingsData = await settingToData(this.app, this.settings, this.fieldsDict)
        const manager = new FileManager(this.app, data, this.app.vault.getMarkdownFiles(), this.fileHashes, this.addedMedia)
        debug((manager))
        await manager.initialiseFiles()
        debug((manager))
        await manager.requests_1()
        this.addedMedia = Array.from(manager.added_media_set)
        const hashes = manager.getHashes()
        for (let key in hashes) {
            this.fileHashes[key] = hashes[key]
        }
        new Notice("All done! Saving file hashes and added media now...")
        await this.saveAllData()
    }

    async onload() {
        console.log('loading Obsidian_to_Anki...');
        addIcon('anki', ANKI_ICON)

        try {
            this.settings = await this.loadSettings()
        } catch (e) {
            new Notice("Couldn't connect to Anki! Check console for error message.")
            return
        }

        this.noteTypes = Object.keys(this.settings["CUSTOM_REGEXPS"])
        this.fieldsDict = await this.loadFieldsDict()
        if (Object.keys(this.fieldsDict).length == 0) {
            new Notice('Need to connect to Anki to generate fields dictionary...')
            try {
                this.fieldsDict = await this.generateFieldsDict()
                new Notice("Fields dictionary successfully generated!")
            } catch (e) {
                new Notice("Couldn't connect to Anki! Check console for error message.")
                return
            }
        }
        this.addedMedia = await this.loadAddedMedia()
        this.fileHashes = await this.loadFileHashes()

        this.addSettingTab(new SettingsTab(this.app, this));

        this.addRibbonIcon('anki', 'Obsidian_to_Anki - Scan Vault', async () => {
            await this.scanVault()
        })

        this.addCommand({
            id: 'anki-scan-vault',
            name: 'Scan Vault',
            callback: async () => {
                await this.scanVault()
            }
        })
    }

    async onunload() {
        console.log("Saving settings for Obsidian_to_Anki...")
        this.saveAllData()
        console.log('unloading Obsidian_to_Anki...');
    }
}
