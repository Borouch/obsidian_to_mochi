import {FormatConverter} from "@src/format";
import {FIELDS_DICT, FROZEN_FIELDS_DICT} from "@src/interfaces/IField";
import {CardsFileSettingsData} from "@src/interfaces/ISettings";
import {AnkiConnectNoteAndID} from "@src/interfaces/IAnkiConnectNote";
import {CLOZE_ERROR, noteHasClozes, TAG_PREFIX, TAG_SEP} from "@src/models/BaseCard";

export class RegexCard {

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
        if (this.note_type.includes("Cloze") && !(noteHasClozes(template))) {
            this.identifier = CLOZE_ERROR //An error code that says "don't add this note!"
        }
        template["tags"].push(...this.tags)
        template["deckName"] = deck
        return {ankiNote: template, identifier: this.identifier}
    }
}