import {FormatConverter} from "@src/format";
import {FIELDS_DICT, FROZEN_FIELDS_DICT} from "@src/interfaces/IField";
import {CardsFileSettingsData} from "@src/interfaces/ISettings";
import {NOTE_TYPE_ERROR, OBS_TAG_REGEXP} from "@src/models/BaseCard";
import {MochiSyncService} from "@src/services/MochiSyncService";
import {MochiCard} from "@src/models/MochiCard";
import {
    findMochiTemplateFieldIdByName,
    findMochiTemplateFromName,
    makeMochiCardFieldById
} from "@src/models/MochiTemplate";

export abstract class AbstractCard {
    text: string;
    contentLines: string[];
    current_field_num: number;
    delete: boolean;
    identifier: string | null;
    tags: string[];
    cardTemplateName: string;
    field_names: string[];
    currentField: string;
    ID_REGEXP: RegExp = /(?:<!--)?ID: (\d+)/;
    formatter: FormatConverter;
    curly_cloze: boolean;
    highlights_to_cloze: boolean;
    no_note_type: boolean;
    mochiAttachmentLinksById : Record<string, string>={}

    constructor(
        cardContent: string,
        fieldsDict: FIELDS_DICT,
        curlyCloze: boolean,
        highlightsToCloze: boolean,
        formatter: FormatConverter
    ) {
        this.text = cardContent.trim();
        this.current_field_num = 0;
        this.delete = false;
        this.no_note_type = false;
        this.contentLines = this.getContentLines();
        this.identifier = this.getIdentifier();
        this.tags = this.getTags();
        this.cardTemplateName = this.getCardTemplateName();
        if (!fieldsDict.hasOwnProperty(this.cardTemplateName)) {
            this.no_note_type = true;
            return;
        }
        this.field_names = fieldsDict[this.cardTemplateName];
        this.currentField = this.field_names[0];
        this.formatter = formatter;
        this.curly_cloze = curlyCloze;
        this.highlights_to_cloze = highlightsToCloze;
    }

    abstract getContentLines(): string[];

    abstract getIdentifier(): string | null;

    abstract getTags(): string[];

    abstract getCardTemplateName(): string;

    abstract getCardFieldContentByFieldNameDict(): Record<string, string>;

    parseToMochiCard(
        deckName: string,
        url: string,
        frozenFieldByCardTemplateNameDict: FROZEN_FIELDS_DICT,
        data: CardsFileSettingsData,
        cardContextBreadcrumbText: string
    ): MochiCard {

        if (this.no_note_type) {
            this.identifier = NOTE_TYPE_ERROR
        }

        const mochiTemplate = findMochiTemplateFromName(this.cardTemplateName);
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
        if (data.add_obs_tags) {
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

        mochiCard.content = MochiSyncService.makeContentFromMochiFields(
            mochiCard.fieldById
        );

        return mochiCard
    }
}
