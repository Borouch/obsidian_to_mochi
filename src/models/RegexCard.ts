import {FormatConverter} from "@src/utils/FormatConverter";
import {FIELDS_DICT, FROZEN_FIELDS_DICT} from "@src/interfaces/IField";
import {CardsFileSettingsData} from "@src/interfaces/ISettings";
import {CLOZE_ERROR, mochiCardHasClozes, TAG_PREFIX, TAG_SEP,} from "@src/models/BeginEndCard";
import {debug} from "@src/utils/Logger";
import {MochiCard} from "@src/models/MochiCard";
import {MochiSyncService} from "@src/services/MochiSyncService";
import {
    findMochiTemplateFieldIdByName,
    findMochiTemplateFromName,
    makeMochiCardFieldById,
} from "@src/models/MochiTemplate";
import {AbstractCard} from "@src/models/AbstractCard";

export class RegexCard extends AbstractCard{

    getIdentifier(): string {
        return this.identifier
    }
    getTags(): string[] {
        return this.tags
    }
    getCardTemplateName(): string {
        return this.cardTemplateName
    }

    match: RegExpMatchArray;
    groups: Array<string>;

    constructor(
        match: RegExpMatchArray,
        cardTemplateName: string,
        fieldsDict: FIELDS_DICT,
        tags: boolean,
        id: boolean,
        curlyCloze: boolean,
        highlightsToCloze: boolean,
        formatter: FormatConverter
    ) {

        super(match[0],fieldsDict,curlyCloze,highlightsToCloze,formatter)
        debug({regex_card_match: match});
        this.match = match;
        this.cardTemplateName = cardTemplateName;
        this.identifier = id ? this.match.pop() : null;
        this.tags = tags
            ? this.match.pop().slice(TAG_PREFIX.length).split(TAG_SEP)
            : [];
        this.fieldNames = fieldsDict[cardTemplateName];
        this.curlyCloze = curlyCloze;
        this.formatter = formatter;
        this.highlightsToCloze = highlightsToCloze;
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
