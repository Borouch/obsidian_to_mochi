import {FIELDS_DICT} from "@src/interfaces/IField";
import {AnkiConnectNote} from "@src/interfaces/IAnkiConnectNote";

export interface PluginSettings {
	API_TOKEN:string
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
		"Deck": string,
		"Scheduling Interval": number
		"Add File Link": boolean,
		"Add Context": boolean,
		"CurlyCloze": boolean,
		"CurlyCloze - Highlights to Clozes": boolean,
		"ID Comments": boolean,
		"Add Obsidian Tags": boolean
	}
}

export interface CardsFileSettingsData {
	//All the data that a file would need.
	fields_dict: FIELDS_DICT
	custom_regexps: Record<string, string>
	fileLinkFieldsByCardTemplateName: Record<string, string>
	contextFieldByCardTemplateName: Record<string, string>
	template: AnkiConnectNote
	EXISTING_MOCHI_CARD_IDS: string[]
	vault_name: string

	FROZEN_REGEXP: RegExp
	DECK_REGEXP: RegExp
	TAG_REGEXP: RegExp
	BEGIN_END_CARD: RegExp
	INLINE_REGEXP: RegExp
	DELETE_REGEXP: RegExp

	curly_cloze: boolean
	highlights_to_cloze: boolean
	comment: boolean
	addContextBreadcrumb: boolean
	add_obs_tags: boolean
}

export interface ParsedSettingsData extends CardsFileSettingsData {
    add_file_link: boolean
	folder_decks: Record<string, string>
	folder_tags: Record<string, string>
}
