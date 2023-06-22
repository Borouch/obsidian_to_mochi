import {FormatConverter} from "@src/utils/FormatConverter";
import {FIELDS_BY_TEMPALTE_NAME} from "@src/interfaces/IField";
import {TAG_PREFIX, TAG_SEP,} from "@src/models/BeginEndCard";
import {debug} from "@src/utils/Logger";
import {AbstractCard} from "@src/models/AbstractCard";

export class RegexCard extends AbstractCard {

    match: RegExpMatchArray;
    groups: Array<string>;

    constructor(
        match: RegExpMatchArray,
        cardTemplateName: string,
        fieldsByTemplateName: FIELDS_BY_TEMPALTE_NAME,
        tags: boolean,
        id: boolean,
        curlyCloze: boolean,
        highlightsToCloze: boolean,
        formatter: FormatConverter
    ) {

        super()
        this.match = match;
        this.cardTemplateName = cardTemplateName;
        this.identifier = id ? this.match.pop() : null;
        this.tags = tags
            ? this.match.pop().slice(TAG_PREFIX.length).split(TAG_SEP)
            : [];
        this.fieldNames = fieldsByTemplateName[cardTemplateName];
        this.curlyCloze = curlyCloze;
        this.formatter = formatter;
        this.highlightsToCloze = highlightsToCloze;

        this.init(match[0], fieldsByTemplateName, curlyCloze, highlightsToCloze, formatter)
    }

    getIdentifier(): string {
        return this.identifier
    }

    getTags(): string[] {
        return this.tags
    }

    getCardTemplateName(): string {
        return this.cardTemplateName
    }

    getCardFieldContentByFieldNameDict(): Record<string, string> {
        let fields: Record<string, string> = {};
        for (let fieldName of this.fieldNames) {
            fields[fieldName] = "";
        }
        for (let index in this.match.slice(1)) {
            fields[this.fieldNames[index]] = this.match.slice(1)[index]
                ? this.match.slice(1)[index]
                : "";
        }
        for (let key in fields) {
            fields[key] = this.formatter
                .format(this,
                    fields[key].trim(),
                    this.cardTemplateName.includes("Cloze") && this.curlyCloze,
                    this.highlightsToCloze
                )
                .trim();
        }
        return fields;
    }

}
