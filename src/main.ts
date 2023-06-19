import {addIcon, Notice, Plugin} from "obsidian";
import {debug} from "@src/utils/Logger";

import axios from "axios";
import {pluginSettingsToCardainerFileSettings} from "@src/PluginSettingsToCardainerFileSettings";
import {FileManager} from "@src/FilesManager";
import {CacheData, CardainerFileSettingsData, PluginSettings,} from "@src/interfaces/ISettings";
import {MochiSyncService} from "@src/services/MochiSyncService";
import {MochiCardService} from "@src/services/MochiCardService";
import {ANKI_ICON} from "@src/Constants";
import {generateBasicAuthToken} from "@src/Helpers";
import {SettingsManager} from "@src/utils/SettingsManager";
import {CacheDataManager} from "@src/utils/CacheDataManager";
import {SettingsTab} from "@src/obsidian-api/SettingsTab";

axios.defaults.baseURL = "https://app.mochi.cards/api";
axios.defaults.headers.common["Accept"] = "application/json";

export default class ObsidianToMochiPlugin extends Plugin {
    settings: PluginSettings;
    mochiTemplateNames: Array<string> = [];
    fieldNamesByTemplateName: Record<string, string[]> = {};
    persistedAttachmentLinkByGeneratedId: Record<string, string> = {};
    fileHashesByPath: Record<string, string> = {};
    scheduleId: any;
    settingsManager: SettingsManager;
    cacheDataManager: CacheDataManager

    cacheData: CacheData

    async onload() {
        console.log("loading Obsidian_to_Mochi...");

        addIcon("flash_card_icon", ANKI_ICON);


        this.settingsManager = SettingsManager.createSingletonInstance(this);

        this.cacheDataManager = await CacheDataManager.createSingletonInstance(this).init();
        this.cacheData = this.cacheDataManager.cacheData
        this.settings = this.cacheData.settings;

        if (this.settings.API_TOKEN) {
            const basicAuthToken = generateBasicAuthToken(this.settings.API_TOKEN);
            this.setBasicAuthHeader(basicAuthToken);
            await this.cacheDataManager.generateMochiConnectionDependentSettings()
        }


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
        await CacheDataManager.i.saveAllData(this.cacheData);
        console.log("unloading Obsidian_to_mochi...");
    }


    async scanVault() {
        if (!this.settings.API_TOKEN) {
            new Notice("Provide Mochi API key in order to start sync...");

            return;
        }
        new Notice("Scanning vault, check console for details...");

        MochiSyncService.mochiCards = await MochiCardService.indexCards();

        const cardainerFileSettingsData: CardainerFileSettingsData =
            await pluginSettingsToCardainerFileSettings(
                this.app,
                this.settings,
                this.fieldNamesByTemplateName
            );
        const manager = FileManager.createSingletonInstance(
            this.app,
            cardainerFileSettingsData,
            this.app.vault.getMarkdownFiles(),
            this.fileHashesByPath,
            this.persistedAttachmentLinkByGeneratedId
        );
        await manager.detectFilesChanges();
        await manager.createAttachmentsForMochiCards();
        debug({after_file_changes_detect_manager: manager});

        await MochiSyncService.syncFileManagerWithRemote(manager);
        await MochiSyncService.syncChangesToCardsFiles(manager);

        // await manager.requests_1()
        this.cacheDataManager.cacheData.persisted_attachment_links_by_id =
            manager.persistedAttachmentLinkByGeneratedId;

        const hashes = manager.getFileHashes();
        for (let key in hashes) {
            this.cacheDataManager.cacheData.file_hashes_by_path[key] = hashes[key];
        }
        new Notice("All done! Saving file hashes and added media now...");
        await this.cacheDataManager.saveAllData(this.cacheData);
    }

    setBasicAuthHeader(basicAuthToken: string) {
        axios.defaults.headers.common["Authorization"] = `Basic ${basicAuthToken}`;
    }
}
