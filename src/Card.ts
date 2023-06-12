/*Manages parsing notes into a dictionary formatted for AnkiConnect.

Input must be the note text.
Does NOT deal with finding the note in the file.*/

import { FormatConverter } from './format'
import {AnkiConnectNote, AnkiConnectNoteAndID} from "@src/interfaces/IAnkiConnectNote";
import {FIELDS_DICT, FROZEN_FIELDS_DICT} from "@src/interfaces/IField";
import {CardsFileSettingsData} from "@src/interfaces/ISettings";


const TAG_PREFIX:string = "Tags: "
export const TAG_SEP:string = " "
export const ID_REGEXP_STR: string = String.raw`\n?(?:<!--)?(?:ID: (\d+).*)`
export const TAG_REGEXP_STR: string = String.raw`(Tags: .*)`
const OBS_TAG_REGEXP: RegExp = /#(\w+)/g

const ANKI_CLOZE_REGEXP: RegExp = /{{c\d+::[\s\S]+?}}/
export const CLOZE_ERROR: number = 42
export const NOTE_TYPE_ERROR: number = 69

function has_clozes(text: string): boolean {
	/*Checks whether text actually has cloze deletions.*/
	return ANKI_CLOZE_REGEXP.test(text)
}

function note_has_clozes(note: AnkiConnectNote): boolean {
	/*Checks whether a note has cloze deletions in any of its fields.*/
	for (let i in note.fields) {
		if (has_clozes(note.fields[i])) {
			return true
		}
	}
	return false
}

abstract class AbstractCard {
    text: string
    contentLines: string[]
    current_field_num: number
    delete: boolean
    identifier: number | null
    tags: string[]
    cardType: string
    field_names: string[]
    currentField: string
    ID_REGEXP: RegExp = /(?:<!--)?ID: (\d+)/
    formatter: FormatConverter
    curly_cloze: boolean
	highlights_to_cloze: boolean
	no_note_type: boolean

    constructor(cardContent: string, fieldsDict: FIELDS_DICT, curlyCloze: boolean, highlightsToCloze: boolean, formatter: FormatConverter) {
        this.text = cardContent.trim()
        this.current_field_num = 0
        this.delete = false
		this.no_note_type = false
        this.contentLines = this.getSplitText()
        this.identifier = this.getIdentifier()
        this.tags = this.getTags()
        this.cardType = this.getNoteType()
		if (!(fieldsDict.hasOwnProperty(this.cardType))) {
			this.no_note_type = true
			return
		}
        this.field_names = fieldsDict[this.cardType]
        this.currentField = this.field_names[0]
        this.formatter = formatter
        this.curly_cloze = curlyCloze
		this.highlights_to_cloze = highlightsToCloze
    }

    abstract getSplitText(): string[]

    abstract getIdentifier(): number | null

    abstract getTags(): string[]

    abstract getNoteType(): string

    abstract getFields(): Record<string, string>

    parse(deck:string, url:string, frozen_fields_dict: FROZEN_FIELDS_DICT, data: CardsFileSettingsData, context:string): AnkiConnectNoteAndID {
        let template = JSON.parse(JSON.stringify(data.template))
		template["modelName"] = this.cardType
		if (this.no_note_type) {
			return {ankiNote: template, identifier: NOTE_TYPE_ERROR}
		}
        template["fields"] = this.getFields()
		const file_link_fields = data.file_link_fields
        if (url) {
            this.formatter.format_note_with_url(template, url, file_link_fields[this.cardType])
        }
        if (Object.keys(frozen_fields_dict).length) {
            this.formatter.format_note_with_frozen_fields(template, frozen_fields_dict)
        }
		if (context) {
			const context_field = data.context_fields[this.cardType]
			template["fields"][context_field] += context
		}
		if (data.add_obs_tags) {
			for (let key in template["fields"]) {
				for (let match of template["fields"][key].matchAll(OBS_TAG_REGEXP)) {
					this.tags.push(match[1])
				}
				template["fields"][key] = template["fields"][key].replace(OBS_TAG_REGEXP, "")
	        }
		}
        template["tags"].push(...this.tags)
        template["deckName"] = deck
        return {ankiNote: template, identifier: this.identifier}
    }

}

export class Card extends AbstractCard {

    getSplitText(): string[] {
        return this.text.split("\n")
    }

    getIdentifier(): number | null {
        if (this.ID_REGEXP.test(this.contentLines[this.contentLines.length-1])) {
            return parseInt(this.ID_REGEXP.exec(this.contentLines.pop())[1])
        } else {
            return null
        }
    }

    getTags(): string[] {
        if (this.contentLines[this.contentLines.length-1].startsWith(TAG_PREFIX)) {
            return this.contentLines.pop().slice(TAG_PREFIX.length).split(TAG_SEP)
        } else {
            return []
        }
    }

    getNoteType(): string {
        return this.contentLines[0]
    }

    fieldFromLine(line: string): [string, string] {
        /*From a given line, determine the next field to add text into.

        Then, return the stripped line, and the field.*/
        for (let field of this.field_names) {
            if (line.startsWith(field + ":")) {
                return [line.slice((field + ":").length), field]
            }
        }
        return [line,this.currentField]
    }

    getFields(): Record<string, string> {
        let fields: Record<string, string> = {}
        for (let field of this.field_names) {
            fields[field] = ""
        }
        for (let line of this.contentLines.slice(1)) {
            [line, this.currentField] = this.fieldFromLine(line)
            fields[this.currentField] += line + "\n"
        }
        for (let key in fields) {
            fields[key] = this.formatter.format(
                fields[key].trim(),
                this.cardType.includes("Cloze") && this.curly_cloze,
				this.highlights_to_cloze
            ).trim()
        }
        return fields
    }

}

export class InlineNote extends AbstractCard {

    static TAG_REGEXP: RegExp = /Tags: (.*)/;
    static ID_REGEXP: RegExp = /(?:<!--)?ID: (\d+)/;
    static TYPE_REGEXP: RegExp = /\[(.*?)\]/;

    getSplitText(): string[] {
        return this.text.split(" ")
    }

    getIdentifier(): number | null {
        const result = this.text.match(InlineNote.ID_REGEXP)
        if (result) {
            this.text = this.text.slice(0,result.index).trim()
            return parseInt(result[1])
        } else {
            return null
        }
    }

    getTags(): string[] {
        const result = this.text.match(InlineNote.TAG_REGEXP)
        if (result) {
            this.text = this.text.slice(0, result.index).trim()
            return result[1].split(TAG_SEP)
        } else {
            return []
        }
    }

    getNoteType(): string {
        const result = this.text.match(InlineNote.TYPE_REGEXP)
        this.text = this.text.slice(result.index + result[0].length)
        return result[1]
    }

    getFields(): Record<string, string> {
        let fields: Record<string, string> = {}
        for (let field of this.field_names) {
            fields[field] = ""
        }
        for (let word of this.text.split(" ")) {
            for (let field of this.field_names) {
                if (word === field + ":") {
                    this.currentField = field
                    word = ""
                }
            }
            fields[this.currentField] += word + " "
        }
        for (let key in fields) {
            fields[key] = this.formatter.format(
                fields[key].trim(),
                this.cardType.includes("Cloze") && this.curly_cloze,
				this.highlights_to_cloze
            ).trim()
        }
        return fields
    }


}

export class RegexNote {

	match: RegExpMatchArray
	note_type: string
	groups: Array<string>
	identifier: number | null
	tags: string[]
    field_names: string[]
	curly_cloze: boolean
	highlights_to_cloze: boolean
	formatter: FormatConverter

	constructor(
			match: RegExpMatchArray,
			note_type: string,
			fields_dict: FIELDS_DICT,
			tags: boolean,
			id: boolean,
			curly_cloze: boolean,
			highlights_to_cloze: boolean,
			formatter: FormatConverter
	) {
		this.match = match
		this.note_type = note_type
		this.identifier = id ? parseInt(this.match.pop()) : null
		this.tags = tags ? this.match.pop().slice(TAG_PREFIX.length).split(TAG_SEP) : []
		this.field_names = fields_dict[note_type]
		this.curly_cloze = curly_cloze
		this.formatter = formatter
		this.highlights_to_cloze = highlights_to_cloze
	}

	getFields(): Record<string, string> {
		let fields: Record<string, string> = {}
        for (let field of this.field_names) {
            fields[field] = ""
        }
		for (let index in this.match.slice(1)) {
			fields[this.field_names[index]] = this.match.slice(1)[index] ? this.match.slice(1)[index] : ""
		}
		for (let key in fields) {
            fields[key] = this.formatter.format(
                fields[key].trim(),
                this.note_type.includes("Cloze") && this.curly_cloze,
				this.highlights_to_cloze
            ).trim()
        }
        return fields
	}

	parse(deck: string, url: string = "", frozen_fields_dict: FROZEN_FIELDS_DICT, data: CardsFileSettingsData, context: string): AnkiConnectNoteAndID {
		let template = JSON.parse(JSON.stringify(data.template))
		template["modelName"] = this.note_type
		template["fields"] = this.getFields()
		const file_link_fields = data.file_link_fields
		if (url) {
            this.formatter.format_note_with_url(template, url, file_link_fields[this.note_type])
        }
        if (Object.keys(frozen_fields_dict).length) {
            this.formatter.format_note_with_frozen_fields(template, frozen_fields_dict)
        }
		if (context) {
			const context_field = data.context_fields[this.note_type]
			template["fields"][context_field] += context
		}
		if (this.note_type.includes("Cloze") && !(note_has_clozes(template))) {
			this.identifier = CLOZE_ERROR //An error code that says "don't add this note!"
		}
		template["tags"].push(...this.tags)
        template["deckName"] = deck
		return {ankiNote: template, identifier: this.identifier}
	}
}
