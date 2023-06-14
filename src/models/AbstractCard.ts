import { FormatConverter } from "@src/format";
import { FIELDS_DICT, FROZEN_FIELDS_DICT } from "@src/interfaces/IField";
import { CardsFileSettingsData } from "@src/interfaces/ISettings";
import { AnkiConnectNoteAndID } from "@src/interfaces/IAnkiConnectNote";
import { NOTE_TYPE_ERROR, OBS_TAG_REGEXP } from "@src/models/BaseCard";
import {MochiSyncService} from "@src/services/MochiSyncService";
import {MochiCard} from "@src/models/MochiCard";

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
    this.contentLines = this.getSplitText();
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

  abstract getSplitText(): string[];

  abstract getIdentifier(): number | null;

  abstract getTags(): string[];

  abstract getCardTemplateName(): string;

  abstract getFields(): Record<string, string>;

  parseToAnkiConnectNote(
    deckName: string,
    url: string,
    frozen_fields_dict: FROZEN_FIELDS_DICT,
    data: CardsFileSettingsData,
    cardContextBreadcrumb: string
  ): MochiCard {

    if (this.no_note_type) {
      this.identifier = NOTE_TYPE_ERROR
    }

    const file_link_fields = data.fileLinkFieldsByCardTemplateName;
    if (url) {
      this.formatter.appendFileSourceLinkToMochiCardField(
          template,
          url,
          file_link_fields[this.cardTemplateName]
      );
    }
    if (Object.keys(frozen_fields_dict).length) {
      this.formatter.appendFrozenFieldToMochiCardField(
          template,
          frozen_fields_dict
      );
    }
    if (cardContextBreadcrumb) {
      const context_field = data.contextFieldByCardTemplateName[this.cardTemplateName];
      template["fields"][context_field] += cardContextBreadcrumb;
    }
    if (data.add_obs_tags) {
      for (let key in template["fields"]) {
        for (let match of template["fields"][key].matchAll(OBS_TAG_REGEXP)) {
          this.tags.push(match[1]);
        }
        template["fields"][key] = template["fields"][key].replace(
            OBS_TAG_REGEXP,
            ""
        );
      }
    }

    const mochiTemplate = MochiSyncService.mochiTemplates.find((t) => t.name === this.cardTemplateName)
    const content = MochiSyncService.makeContentFromMochiFields(this.getFields())
    const mochiCard: MochiCard = {
      id: this.identifier,
      tags: this.tags,
      deckName: deckName,
      templateId: mochiTemplate.id,
      deckId: null,
      content: content
    }

    return mochiCard
  }
}
