import {FIELDS_DICT} from "@src/interfaces/IField";

export interface PluginSettings {
    API_TOKEN: string
    CUSTOM_REGEXPS: Record<string, string>,
    FILE_LINK_FIELDS: Record<string, string>,
    CONTEXT_FIELDS: Record<string, string>,
    FOLDER_DECKS: Record<string, string>,
    FOLDER_TAGS: Record<string, string>,
    Syntax: {
        "Begin Card": string,
        "End Card": string,
        "Begin Inline Card": string,
        "End Inline Card": string,
        "Target Deck Line": string,
        "File Tags Line": string,
        "Delete Card Line": string,
        "Frozen Fields Line": string
    },
    Defaults: {
        "Tag": string,
        "DeckName": string,
        "Scheduling Interval": number
        "Add File Link": boolean,
        "Add Context": boolean,
        "CurlyCloze": boolean,
        "CurlyCloze - Highlights to Clozes": boolean,
        "ID Comments": boolean,
        "Add Obsidian Tags": boolean
    }
}

export interface CardainerFileSettingsData {
    //All the data that a file would need.

    fieldsDict: FIELDS_DICT
    customRegexps: Record<string, string>
    fileLinkFieldsByCardTemplateName: Record<string, string>
    contextFieldByCardTemplateName: Record<string, string>
    existingMochiCardIds: string[]
    vaultName: string

    FROZEN_REGEXP: RegExp
    DECK_REGEXP: RegExp
    TAG_REGEXP: RegExp
    BEGIN_END_CARD: RegExp
    INLINE_REGEXP: RegExp
    DELETE_REGEXP: RegExp

    isCurlyCloze: boolean
    isHighlightsToCloze: boolean
    comment: boolean
    addContextBreadcrumb: boolean
    shouldAddObsTags: boolean
    addFileLink: boolean
    folderDecks: Record<string, string>
    folderTags: Record<string, string>
    defaultTags: string[]
    defaultDeckName: string
}


export interface CacheData {
    settings: PluginSettings,
    persisted_attachment_links_by_id: Record<string, string>
    file_hashes_by_path: Record<string, string>,
    card_hashes_by_id: Record<string, string>,
    field_names_by_template_name: Record<string, string[]>
}