import {FormatConverter} from "@src/format";
import {FIELDS_DICT, FROZEN_FIELDS_DICT} from "@src/interfaces/IField";
import {CardsFileSettingsData} from "@src/interfaces/ISettings";
import {AnkiConnectNoteAndID} from "@src/interfaces/IAnkiConnectNote";
import {NOTE_TYPE_ERROR, OBS_TAG_REGEXP} from "@src/models/BaseCard";

export abstract class AbstractCard {
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

    parseToAnkiConnectNote(deck: string, url: string, frozen_fields_dict: FROZEN_FIELDS_DICT, data: CardsFileSettingsData, context: string): AnkiConnectNoteAndID {
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