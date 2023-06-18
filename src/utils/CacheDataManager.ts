import ObsidianToMochiPlugin from "@src/main";
import {SettingsManager} from "@src/utils/SettingsManager";
import {CacheData} from "@src/interfaces/ISettings";

export class CacheDataManager {
    public cacheData: CacheData

    private constructor(public plugin: ObsidianToMochiPlugin) {
        this.cacheData = this.getDefaultCacheData()
    }

    private static _i: CacheDataManager | null = null;

    public static get i():CacheDataManager {
        return CacheDataManager._i;
    }

    public static createSingletonInstance(
        plugin: ObsidianToMochiPlugin,
    ): CacheDataManager {
        if (!CacheDataManager._i) {
            CacheDataManager._i = new CacheDataManager(
                plugin
            );
        }

        return CacheDataManager._i;
    }

    public async loadPersistedAttachmentLinksById(): Promise<Record<string, string>> {
        const currCacheData: CacheData = await this.plugin.loadData();
        if (currCacheData == null) {
            await this.saveDefaultCacheData();
            return {};
        } else {
            return currCacheData.persisted_attachment_links_by_id;
        }
    }

    public async loadFileHashesByPath(): Promise<Record<string, string>> {
        const cacheData: CacheData = await this.plugin.loadData();
        if (cacheData == null) {
            await this.saveDefaultCacheData();
            return {};
        } else {
            return cacheData.file_hashes_by_path;
        }
    }

    public async loadFieldNamesByTemplateName(): Promise<Record<string, string[]>> {
        const currCacheData: CacheData = await this.plugin.loadData();
        if (currCacheData == null) {
            await this.saveDefaultCacheData();
            return await SettingsManager.i.generateFieldNamesByTemplateName();
        }
        return currCacheData.field_names_by_template_name;
    }

    public async saveAllData(cacheData: CacheData): Promise<void> {
        // const currCacheData: CacheData = {
        //     settings: this.settings,
        //     fields_by_template_name: this.plugin.fieldNamesByTemplateName,
        //     file_hashes_by_path: this.plugin.fileHashesByPath,
        //     persisted_attachment_links_by_id: this.plugin.persistedAttachmentLinkByGeneratedId
        // }
        await this.plugin.saveData(cacheData);
    }

    public async saveDefaultCacheData(): Promise<CacheData> {
        const defaultCacheData = await this.getDefaultCacheData()
        await this.plugin.saveData(defaultCacheData);
        return defaultCacheData
    }

    private async getDefaultCacheData() {
        const defaultSettings = await SettingsManager.i.getDefaultSettings();
        const cacheData: CacheData = {
            settings: defaultSettings,
            card_hashes_by_id: {},
            persisted_attachment_links_by_id: {},
            field_names_by_template_name: {},
            file_hashes_by_path: {}
        }
        return cacheData
    }
}