import {App} from 'obsidian'
import {ID_REGEXP_STR} from './models/BeginEndCard'
import {escapeRegex} from './Constants'
import {ParsedSettingsData, PluginSettings} from "@src/interfaces/ISettings";
import {MochiSyncService} from "@src/services/MochiSyncService";

export async function settingToData(app: App, settings: PluginSettings, fields_dict: Record<string, string[]>): Promise<ParsedSettingsData> {
    let result: ParsedSettingsData = <ParsedSettingsData>{}

    //Some processing required
    result.vault_name = app.vault.getName()
    result.fields_dict = fields_dict
    result.custom_regexps = settings.CUSTOM_REGEXPS
    result.fileLinkFieldsByCardTemplateName = settings.FILE_LINK_FIELDS
    result.contextFieldByCardTemplateName = settings.CONTEXT_FIELDS
    result.folder_decks = settings.FOLDER_DECKS
    result.folder_tags = settings.FOLDER_TAGS
    result.template = {
        deckName: settings.Defaults.Deck,
        modelName: "",
        fields: {},
        options: {
            allowDuplicate: false,
            duplicateScope: "deck"
        },
        tags: [settings.Defaults.Tag]
    }

    result.EXISTING_MOCHI_CARD_IDS = MochiSyncService.mochiCards.map((c) => c.id)

    //RegExp section
    result.FROZEN_REGEXP = new RegExp(escapeRegex(settings.Syntax["Frozen Fields Line"]) + String.raw` - (.*?):\n((?:[^\n][\n]?)+)`, "g")
    result.DECK_REGEXP = new RegExp(String.raw`^` + escapeRegex(settings.Syntax["Target Deck Line"]) + String.raw`(?:\n|: )(.*)`, "m")
    result.TAG_REGEXP = new RegExp(String.raw`^` + escapeRegex(settings.Syntax["File Tags Line"]) + String.raw`(?:\n|: )(.*)`, "m")
    result.BEGIN_END_CARD = new RegExp(String.raw`^` + escapeRegex(settings.Syntax["Begin Card"]) + String.raw`\n([\s\S]*?\n)` + escapeRegex(settings.Syntax["End Card"]), "gm")
    result.INLINE_REGEXP = new RegExp(escapeRegex(settings.Syntax["Begin Inline Card"]) + String.raw`(.*?)` + escapeRegex(settings.Syntax["End Inline Card"]), "g")
    result.DELETE_REGEXP = new RegExp(escapeRegex(settings.Syntax["Delete Card Line"]) + ID_REGEXP_STR, "g")

    //Just a simple transfer
    result.curly_cloze = settings.Defaults.CurlyCloze
    result.highlights_to_cloze = settings.Defaults["CurlyCloze - Highlights to Clozes"]
    result.add_file_link = settings.Defaults["Add File Link"]
    result.comment = settings.Defaults["ID Comments"]
    result.addContextBreadcrumb = settings.Defaults["Add Context"]
    result.add_obs_tags = settings.Defaults["Add Obsidian Tags"]

    return result
}
