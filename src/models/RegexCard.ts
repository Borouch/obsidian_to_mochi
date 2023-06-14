import { FormatConverter } from "@src/format";
import { FIELDS_DICT, FROZEN_FIELDS_DICT } from "@src/interfaces/IField";
import { CardsFileSettingsData } from "@src/interfaces/ISettings";
import { AnkiConnectNoteAndID } from "@src/interfaces/IAnkiConnectNote";
import {
  CLOZE_ERROR,
  mochiCardHasClozes,
  TAG_PREFIX,
  TAG_SEP,
} from "@src/models/BaseCard";
import { debug } from "@src/utils/Logger";
import { MochiCard } from "@src/models/MochiCard";
import { MochiSyncService } from "@src/services/MochiSyncService";
import {
  findMochiTemplateFieldIdByName,
  findMochiTemplateFromName,
  makeMochiCardFieldById,
} from "@src/models/MochiTemplate";

export class RegexCard {
  match: RegExpMatchArray;
  cardTemplateName: string;
  groups: Array<string>;
  identifier: string | null;
  tags: string[];
  fieldNames: string[];
  curly_cloze: boolean;
  highlights_to_cloze: boolean;
  formatter: FormatConverter;

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
    debug({ regex_card_match: match });
    this.match = match;
    this.cardTemplateName = note_type;
    this.identifier = id ? this.match.pop() : null;
    this.tags = tags
      ? this.match.pop().slice(TAG_PREFIX.length).split(TAG_SEP)
      : [];
    this.fieldNames = fields_dict[note_type];
    this.curly_cloze = curly_cloze;
    this.formatter = formatter;
    this.highlights_to_cloze = highlights_to_cloze;
  }

  getCardFieldContentByFieldName(): Record<string, string> {
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
        .format(
          fields[key].trim(),
          this.cardTemplateName.includes("Cloze") && this.curly_cloze,
          this.highlights_to_cloze
        )
        .trim();
    }
    return fields;
  }

  parseToMochiCard(
    deckName: string,
    url: string = "",
    frozen_fields_dict: FROZEN_FIELDS_DICT,
    data: CardsFileSettingsData,
    context: string
  ): MochiCard {
    const mochiTemplate = findMochiTemplateFromName(this.cardTemplateName);
    const mochiCardFieldById = makeMochiCardFieldById(
      this.getCardFieldContentByFieldName(),
      mochiTemplate
    );
    const mochiCard: MochiCard = {
      id: this.identifier,
      tags: this.tags,
      deckName: deckName,
      template: mochiTemplate,
      templateId: mochiTemplate.id,
      fieldById: mochiCardFieldById,
      deckId: null,
      content: "",
    };

    if (url) {
      const fileLinkFieldsByCardTemplateName =
        data.fileLinkFieldsByCardTemplateName;
      const fileLinkFieldName =
        fileLinkFieldsByCardTemplateName[this.cardTemplateName];
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

    if (Object.keys(frozen_fields_dict).length) {
      this.formatter.appendFrozenFieldToMochiCardField(
        mochiCard,
        frozen_fields_dict
      );
    }

    if (context) {
      this.formatter.appendContextFieldToMochiCardField(
        mochiCard,
        context,
        data.contextFieldByCardTemplateName
      );
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

    return mochiCard;
  }
}
