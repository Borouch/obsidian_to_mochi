import {FormatConverter} from "@src/format";
import {FIELDS_DICT, FROZEN_FIELDS_DICT} from "@src/interfaces/IField";
import {CardsFileSettingsData} from "@src/interfaces/ISettings";
import {AnkiConnectNoteAndID} from "@src/interfaces/IAnkiConnectNote";
import {CLOZE_ERROR, noteHasClozes, TAG_PREFIX, TAG_SEP} from "@src/models/BaseCard";
import {debug} from "@src/utils/Logger";

export class RegexCard {

    match: RegExpMatchArray
    cardType: string
    groups: Array<string>
    identifier: string | null
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
        debug({regex_card_match: match})
        this.match = match
        this.cardType = note_type
        this.identifier = id ? this.match.pop() : null
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
                this.cardType.includes("Cloze") && this.curly_cloze,
                this.highlights_to_cloze
            ).trim()
        }
        return fields
    }

    parseToAnkiConnectNote(deck: string, url: string = "", frozen_fields_dict: FROZEN_FIELDS_DICT, data: CardsFileSettingsData, context: string): AnkiConnectNoteAndID {
        let template = JSON.parse(JSON.stringify(data.template))
        template["modelName"] = this.cardType
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
        if (this.cardType.includes("Cloze") && !(noteHasClozes(template))) {
            this.identifier = CLOZE_ERROR //An error code that says "don't add this note!"
        }
        template["tags"].push(...this.tags)
        template["deckName"] = deck
        return {ankiNote: template, identifier: this.identifier}
    }


}