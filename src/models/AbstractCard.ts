import {FormatConverter} from "@src/utils/FormatConverter";
import {FIELDS_DICT, FROZEN_FIELDS_DICT} from "@src/interfaces/IField";
import {CardainerFileSettingsData} from "@src/interfaces/ISettings";
import {CLOZE_ERROR, mochiCardHasClozes, NOTE_TYPE_ERROR, OBS_TAG_REGEXP} from "@src/models/BeginEndCard";
import {MochiSyncService} from "@src/services/MochiSyncService";
import {MochiCard} from "@src/models/MochiCard";
import {
    findMochiTemplateFieldIdByName,
    findMochiTemplateFromName,
    makeMochiCardFieldById
} from "@src/models/MochiTemplate";

export abstract class AbstractCard {
    content: string;
    contentLines: string[];
    current_field_num: number;
    delete: boolean;
    identifier: string | null;
    tags: string[];
    cardTemplateName: string;
    fieldNames: string[];
    currentField: string;
    ID_REGEXP: RegExp = /(?:<!--)?ID: (\d+)/;
    formatter: FormatConverter;
    curlyCloze: boolean;
    highlightsToCloze: boolean;
    noMochiTemplateType: boolean;
    mochiAttachmentLinksById : Record<string, string>={}

    constructor(
        cardContent: string,
        fieldsDict: FIELDS_DICT,
        curlyCloze: boolean,
        highlightsToCloze: boolean,
        formatter: FormatConverter
    ) {
        this.content = cardContent.trim();
        this.current_field_num = 0;
        this.delete = false;
        this.noMochiTemplateType = false;
        this.contentLines = this.getContentLines();
        this.identifier = this.getIdentifier();
        this.tags = this.getTags();
        this.cardTemplateName = this.getCardTemplateName();
        if (!fieldsDict.hasOwnProperty(this.cardTemplateName)) {
            this.noMochiTemplateType = true;
            return;
        }
        this.fieldNames = fieldsDict[this.cardTemplateName];
        this.currentField = this.fieldNames[0];
        this.formatter = formatter;
        this.curlyCloze = curlyCloze;
        this.highlightsToCloze = highlightsToCloze;
    }


    abstract getIdentifier(): string | null;

    abstract getTags(): string[];

    abstract getCardTemplateName(): string;

    abstract getCardFieldContentByFieldNameDict(): Record<string, string>;
    getContentLines(): string[] {
        return this.content.split(" ")
    }
    parseToMochiCard(
        deckName: string,
        url: string,
        frozenFieldByCardTemplateNameDict: FROZEN_FIELDS_DICT,
        data: CardainerFileSettingsData,
        cardContextBreadcrumbText: string
    ): MochiCard | null {

        if (this.noMochiTemplateType) {
            this.identifier = NOTE_TYPE_ERROR
        }

        const mochiTemplate = findMochiTemplateFromName(this.cardTemplateName);
        if(!mochiTemplate) return null
        const mochiCardFieldById = makeMochiCardFieldById(
            this.getCardFieldContentByFieldNameDict(),
            mochiTemplate
        );

        const mochiCard: MochiCard = {
            id: this.identifier,
            tags: this.tags,
            runtimeProps: {deckName: deckName, attachmentLinkByGeneratedId: this.mochiAttachmentLinksById},
            template: mochiTemplate,
            templateId: mochiTemplate.id,
            fieldById: mochiCardFieldById,
            deckId: null,
            content: "",
        };

        if (url) {
            const fileLinkFieldsByCardTemplateNameDict =
                data.fileLinkFieldsByCardTemplateName;
            const fileLinkFieldName =
                fileLinkFieldsByCardTemplateNameDict[this.cardTemplateName];
            const fileLinkFieldId = findMochiTemplateFieldIdByName(
                fileLinkFieldName,
                mochiTemplate
            );
            this.formatter.appendFileSourceLinkToMochiCardField(
                mochiCard,
                url,
                fileLinkFieldId
            );
        }

        if (Object.keys(frozenFieldByCardTemplateNameDict).length) {
            this.formatter.appendFrozenFieldToMochiCardField(
                mochiCard,
                frozenFieldByCardTemplateNameDict
            );
        }
        if (cardContextBreadcrumbText) {
            this.formatter.appendContextFieldToMochiCardField(
                mochiCard,
                cardContextBreadcrumbText,
                data.contextFieldByCardTemplateName
            );
        }
        if (data.shouldAddObsTags) {
            for (let id in mochiCard.fieldById) {
                for (let match of mochiCard.fieldById[id].value.matchAll(OBS_TAG_REGEXP)) {
                    this.tags.push(match[1]);
                }
                mochiCard.fieldById[id].value = mochiCard.fieldById[id].value.replace(
                    OBS_TAG_REGEXP,
                    ""
                );
            }
        }

        if (
            this.cardTemplateName.includes("Cloze") &&
            !mochiCardHasClozes(mochiCard)
        ) {
            this.identifier = CLOZE_ERROR; //An error code that says "don't add this note!"
        }

        mochiCard.content = MochiSyncService.makeContentFromMochiFields(
            mochiCard.fieldById
        );

        return mochiCard
    }
}
