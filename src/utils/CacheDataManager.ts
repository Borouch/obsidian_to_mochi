import ObsidianToMochiPlugin from "@src/main";
import {SettingsManager} from "@src/utils/SettingsManager";
import {CacheData} from "@src/interfaces/ISettings";
import {MochiTemplateService} from "@src/services/MochiTemplateService";
import {MochiSyncService} from "@src/services/MochiSyncService";

export class CacheDataManager {
    public cacheData: CacheData

    private constructor(public plugin: ObsidianToMochiPlugin) {

    }

    private static _i: CacheDataManager | null = null;

    public static get i(): CacheDataManager {
        return CacheDataManager._i;
    }

    public static createSingletonInstanceReplacement(
        plugin: ObsidianToMochiPlugin
    ): CacheDataManager {

        CacheDataManager._i = new CacheDataManager(plugin);


        return CacheDataManager._i;
    }

    public async init() {
        this.cacheData = await this.loadOrGenerateDefaultDataCache()
        this.plugin.settings = this.cacheData.settings
        this.plugin.cacheData = this.cacheData
        return this
    }

    public async saveAllData(cacheData: CacheData): Promise<void> {
        await this.plugin.saveData(cacheData);
    }

    public async loadOrGenerateDefaultDataCache() {
        const cache: CacheData = await this.plugin.loadData();
        if (!cache) {
            return await this.saveDefaultCacheData();
        }
        return cache;
    }

    public async saveDefaultCacheData(): Promise<CacheData> {
        const defaultCacheData = await this.getDefaultCacheData();
        await this.plugin.saveData(defaultCacheData);
        return defaultCacheData;
    }

    public async generateMochiConnectionDependentSettings() {
        await MochiTemplateService.index();
        this.plugin.mochiTemplateNames = MochiSyncService.mochiTemplates.map(
            (t) => t.name
        );
        this.cacheData.field_names_by_template_name = await SettingsManager.i.generateFieldNamesByTemplateName(
            MochiSyncService.mochiTemplates
        );
        SettingsManager.i.generateSettingsRegexps(this.plugin.mochiTemplateNames);
        SettingsManager.i.generateFileLinkFields(this.plugin.mochiTemplateNames)
        await this.saveAllData(this.cacheData);
    }

    private async getDefaultCacheData() {
        const defaultSettings = await SettingsManager.i.getDefaultSettings();
        const cacheData: CacheData = {
            settings: defaultSettings,
            card_hashes_by_id: {},
            persisted_attachment_links_by_id: {},
            field_names_by_template_name: {},
            file_hashes_by_path: {},
        };
        return cacheData;
    }

}
