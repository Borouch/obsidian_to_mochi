import {addIcon, Notice, Plugin} from "obsidian";
import {debug} from "@src/utils/Logger";

import axios from "axios";
import {pluginSettingsToCardainerFileSettings} from "@src/utils/PluginSettingsToCardainerFileSettings";
import {FileManager} from "@src/utils/FilesManager";
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
    scheduleId: any;
    settingsManager: SettingsManager;
    cacheDataManager: CacheDataManager

    cacheData: CacheData

    async onload() {
        console.log("loading Obsidian_to_Mochi...");

        addIcon("flash_card_icon", ANKI_ICON);


        this.settingsManager = SettingsManager.createSingletonInstance(this);

        this.cacheDataManager = await CacheDataManager.createSingletonInstanceReplacement(this).init();

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
        try {

            if (!this.settings.API_TOKEN) {
                new Notice("Provide Mochi API key in order to start sync...", 3000);

                return;
            }

            new Notice("Scanning vault, check console for details...");

            MochiSyncService.mochiCards = await MochiCardService.indexCards();
            debug({fetchedMochiCards: MochiSyncService.mochiCards})
            const cardainerFileSettingsData: CardainerFileSettingsData =
                await pluginSettingsToCardainerFileSettings(
                    this.app,
                    this.settings,
                    this.cacheData.field_names_by_template_name
                );
            const manager = FileManager.createSingletonInstanceReplacement(
                this.app,
                cardainerFileSettingsData,
                this.app.vault.getMarkdownFiles(),
                this.cacheData.file_hashes_by_path,
                this.cacheData.persisted_attachment_links_by_id
            );
            await manager.detectFilesChanges();
            await manager.createAttachmentsForMochiCards();
            debug({after_file_changes_detect_manager: manager});

            await MochiSyncService.syncFileManagerWithRemote(manager);
            await MochiSyncService.syncChangesToCardainerFiles(manager);

            this.cacheData.persisted_attachment_links_by_id =
                manager.persistedAttachmentLinkByGeneratedId;

            const hashes = manager.getFileHashes();
            for (let key in hashes) {
                this.cacheDataManager.cacheData.file_hashes_by_path[key] = hashes[key];
            }
            this.cacheData.card_hashes_by_id = MochiSyncService.getMochiCardHashesById()
            new Notice("All done! Saving cache data");
            await this.cacheDataManager.saveAllData(this.cacheData);
            const stats = manager.stats
            new Notice(`UPDATED: ${stats.updated}, DELETED: ${stats.deleted}, CREATED: ${stats.created}`, 3000)
        } catch (e) {
            console.error({e})
            new Notice('Something went wrong! Check console for details')
        }
    }

    setBasicAuthHeader(basicAuthToken: string) {
        axios.defaults.headers.common["Authorization"] = `Basic ${basicAuthToken}`;
    }
}
