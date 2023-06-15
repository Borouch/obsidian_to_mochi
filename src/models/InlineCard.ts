import {AbstractCard} from "@src/models/AbstractCard";
import {TAG_SEP} from "@src/models/BaseCard";

export class InlineCard extends AbstractCard {

    static TAG_REGEXP: RegExp = /Tags: (.*)/;
    static ID_REGEXP: RegExp = /(?:<!--)?ID: (\d+)/;
    static TYPE_REGEXP: RegExp = /\[(.*?)\]/;

    getContentLines(): string[] {
        return this.text.split(" ")
    }

    getIdentifier(): string | null {
        const result = this.text.match(InlineCard.ID_REGEXP)
        if (result) {
            this.text = this.text.slice(0, result.index).trim()
            return result[1]
        } else {
            return null
        }
    }

    getTags(): string[] {
        const result = this.text.match(InlineCard.TAG_REGEXP)
        if (result) {
            this.text = this.text.slice(0, result.index).trim()
            return result[1].split(TAG_SEP)
        } else {
            return []
        }
    }

    getCardTemplateName(): string {
        const result = this.text.match(InlineCard.TYPE_REGEXP)
        this.text = this.text.slice(result.index + result[0].length)
        return result[1]
    }

    getCardFieldContentByFieldNameDict(): Record<string, string> {
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
            fields[key] = this.formatter.format(this,
                fields[key].trim(),
                this.cardTemplateName.includes("Cloze") && this.curly_cloze,
                this.highlights_to_cloze
            ).trim()
        }
        return fields
    }


}