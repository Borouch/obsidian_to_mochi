import {App} from 'obsidian'
import {ID_REGEXP_STR} from '../models/BeginEndCard'
import {escapeRegex} from '../Constants'
import {CardainerFileSettingsData, PluginSettings} from "@src/interfaces/ISettings";
import {MochiSyncService} from "@src/services/MochiSyncService";

export async function pluginSettingsToCardainerFileSettings(app: App, settings: PluginSettings, fieldsByTemplateName: Record<string, string[]>): Promise<CardainerFileSettingsData> {
    let cardainerSettings: CardainerFileSettingsData = <CardainerFileSettingsData>{}

    //Some processing required
    cardainerSettings.vaultName = app.vault.getName()
    cardainerSettings.fieldsByTemplateName = fieldsByTemplateName
    cardainerSettings.customRegexps = settings.CUSTOM_REGEXPS
    cardainerSettings.fileLinkFieldsByCardTemplateName = settings.FILE_LINK_FIELDS
    cardainerSettings.contextFieldByCardTemplateName = settings.CONTEXT_FIELDS
    cardainerSettings.folderDecks = settings.FOLDER_DECKS
    cardainerSettings.folderTags = settings.FOLDER_TAGS
    cardainerSettings.defaultTags=[settings.Defaults.Tag]
    cardainerSettings.defaultDeckName=settings.Defaults.DeckName

    cardainerSettings.existingMochiCardIds = MochiSyncService.mochiCards.map((c) => c.id)

    //RegExp section
    cardainerSettings.FROZEN_REGEXP = new RegExp(escapeRegex(settings.Syntax["Frozen Fields Line"]) + String.raw` - (.*?):\n((?:[^\n][\n]?)+)`, "g")
    cardainerSettings.DECK_REGEXP = new RegExp(String.raw`^` + escapeRegex(settings.Syntax["Target Deck Line"]) + String.raw`(?:\n|: )(.*)`, "m")
    cardainerSettings.TAG_REGEXP = new RegExp(String.raw`^` + escapeRegex(settings.Syntax["File Tags Line"]) + String.raw`(?:\n|: )(.*)`, "m")
    cardainerSettings.BEGIN_END_CARD = new RegExp(String.raw`^` + escapeRegex(settings.Syntax["Begin Card"]) + String.raw`\n([\s\S]*?\n)` + escapeRegex(settings.Syntax["End Card"]), "gm")
    cardainerSettings.INLINE_REGEXP = new RegExp(escapeRegex(settings.Syntax["Begin Inline Card"]) + String.raw`(.*?)` + escapeRegex(settings.Syntax["End Inline Card"]), "g")
    cardainerSettings.DELETE_REGEXP = new RegExp(escapeRegex(settings.Syntax["Delete Card Line"]) + ID_REGEXP_STR, "g")

    //Just a simple transfer
    cardainerSettings.isCurlyCloze = settings.Defaults.CurlyCloze
    cardainerSettings.isHighlightsToCloze = settings.Defaults["CurlyCloze - Highlights to Clozes"]
    cardainerSettings.addFileLink = settings.Defaults["Add File Link"]
    cardainerSettings.comment = settings.Defaults["ID Comments"]
    cardainerSettings.addContextBreadcrumb = settings.Defaults["Add Context"]
    cardainerSettings.shouldAddObsTags = settings.Defaults["Add Obsidian Tags"]
    cardainerSettings.defaultNestedDeckNameSeparator = '::';

    return cardainerSettings
}
