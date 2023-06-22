/*Manages parsing notes into a dictionary formatted for AnkiConnect.

Input must be the note text.
Does NOT deal with finding the note in the file.*/

import {AbstractCard} from "@src/models/AbstractCard";
import {MochiCard} from "@src/models/MochiCard";
import {FIELDS_BY_TEMPALTE_NAME} from "@src/interfaces/IField";
import {FormatConverter} from "@src/utils/FormatConverter";


export const TAG_PREFIX: string = "Tags: "
export const TAG_SEP: string = " "
export const ID_REGEXP_STR: string = String.raw`\n?(?:<!--)?(?:ID: ([\w]+).*)`
export const TAG_REGEXP_STR: string = String.raw`(Tags: .*)`
export const OBS_TAG_REGEXP: RegExp = /#(\w+)/g

export const ANKI_CLOZE_REGEXP: RegExp = /{{c\d+::[\s\S]+?}}/
export const CLOZE_ERROR = '42'
export const NOTE_TYPE_ERROR = '69'

export function hasClozes(text: string): boolean {
    /*Checks whether text actually has cloze deletions.*/
    return ANKI_CLOZE_REGEXP.test(text)
}

export function mochiCardHasClozes(mochiCard: MochiCard): boolean {
    /*Checks whether a note has cloze deletions in any of its fields.*/
    for (let id in mochiCard.fieldById) {
        if (hasClozes(mochiCard.fieldById[id].value)) {
            return true
        }
    }
    return false
}

export class BeginEndCard extends AbstractCard {

    constructor(cardContent: string,
                fieldsByTemplateName: FIELDS_BY_TEMPALTE_NAME,
                curlyCloze: boolean,
                highlightsToCloze: boolean,
                formatter: FormatConverter,) {
        super();
        this.init(cardContent,
            fieldsByTemplateName,
            curlyCloze,
            highlightsToCloze,
            formatter)
    }

    getIdentifier(): string | null {
        if (this.ID_REGEXP.test(this.contentLines[this.contentLines.length - 1])) {
            return this.ID_REGEXP.exec(this.contentLines.pop())[1]
        } else {
            return null
        }
    }

    getTags(): string[] {
        if (this.contentLines[this.contentLines.length - 1].startsWith(TAG_PREFIX)) {
            return this.contentLines.pop().slice(TAG_PREFIX.length).split(TAG_SEP)
        } else {
            return []
        }
    }

    getCardTemplateName(): string {
        return this.contentLines[0]
    }

    fieldFromLine(line: string): [string, string] {
        /*From a given line, determine the next field to add text into.

        Then, return the stripped line, and the field.*/
        for (let field of this.fieldNames) {
            if (line.startsWith(field + ":")) {
                return [line.slice((field + ":").length), field]
            }
        }
        return [line, this.currentField]
    }

    getCardFieldContentByFieldNameDict(): Record<string, string> {
        let fields: Record<string, string> = {}
        for (let field of this.fieldNames) {
            fields[field] = ""
        }
        for (let line of this.contentLines.slice(1)) {
            [line, this.currentField] = this.fieldFromLine(line)
            fields[this.currentField] += line + "\n"
        }
        for (let key in fields) {
            fields[key] = this.formatter.format(this,
                fields[key].trim(),
                this.cardTemplateName.includes("Cloze") && this.curlyCloze,
                this.highlightsToCloze
            ).trim()
        }
        return fields
    }

}

