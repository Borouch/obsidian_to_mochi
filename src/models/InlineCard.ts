import {AbstractCard} from "@src/models/AbstractCard";
import {TAG_SEP} from "@src/models/BeginEndCard";

export class InlineCard extends AbstractCard {

    static TAG_REGEXP: RegExp = /Tags: (.*)/;
    static ID_REGEXP: RegExp = /(?:<!--)?ID: (\d+)/;
    static TYPE_REGEXP: RegExp = /\[(.*?)\]/;



    getIdentifier(): string | null {
        const result = this.content.match(InlineCard.ID_REGEXP)
        if (result) {
            this.content = this.content.slice(0, result.index).trim()
            return result[1]
        } else {
            return null
        }
    }

    getTags(): string[] {
        const result = this.content.match(InlineCard.TAG_REGEXP)
        if (result) {
            this.content = this.content.slice(0, result.index).trim()
            return result[1].split(TAG_SEP)
        } else {
            return []
        }
    }

    getCardTemplateName(): string {
        const result = this.content.match(InlineCard.TYPE_REGEXP)
        this.content = this.content.slice(result.index + result[0].length)
        return result[1]
    }

    getCardFieldContentByFieldNameDict(): Record<string, string> {
        let fields: Record<string, string> = {}
        for (let field of this.fieldNames) {
            fields[field] = ""
        }
        for (let word of this.content.split(" ")) {
            for (let field of this.fieldNames) {
                if (word === field + ":") {
                    this.currentField = field
                    word = ""
                }
            }
            fields[this.currentField] += word + " "
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