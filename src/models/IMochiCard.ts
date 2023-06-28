import { MochiTemplate } from "@src/models/MochiTemplate";
import { MochiAttachment } from "@src/models/MochiAttachment";
import { CacheDataManager } from "@src/utils/CacheDataManager";

export interface MochiCardField {
  id: string;
  value: string;
}

export interface RuntimeMochiProps {
  originalHash?: string;
  currentHash?: string;
  nestedDeckNames?: string[];
  attachmentLinkByGeneratedId?: Record<string, string>;
}

export interface IMochiCard {
  runtimeProps?: RuntimeMochiProps;
  tags: string[];
  content: string;
  name?: string;
  deckId: string | null;
  fieldById?: {
    [mochiCardFieldId: string]: MochiCardField;
  };
  clozeIndexes?: any[];
  pos?: string;
  references?: any[];
  id: string;
  reviews?: any[];
  createdAt?: {
    date: string;
  };
  template?: MochiTemplate;
  templateId: string;
  attachments?: MochiAttachment[];
}

export class MochiCard implements IMochiCard {
  public runtimeProps?: RuntimeMochiProps;
  public tags: string[];
  public content: string;
  public name?: string;
  public deckId: string | null;
  public fieldById?: {
    [mochiCardFieldId: string]: MochiCardField;
  };
  public clozeIndexes?: any[];
  public pos?: string;
  public references?: any[];
  public id: string;
  public reviews?: any[];
  public createdAt?: {
    date: string;
  };
  public template?: MochiTemplate;
  public templateId: string;
  public attachments?: MochiAttachment[];

  constructor(param: IMochiCard) {
    this.runtimeProps = param.runtimeProps;
    this.tags = param.tags;
    this.content = param.content;
    this.name = param.name;
    this.deckId = param.deckId;
    this.fieldById = param.fieldById;
    this.clozeIndexes = param.clozeIndexes;
    this.pos = param.pos;
    this.references = param.references;
    this.id = param.id;
    this.reviews = param.reviews;
    this.createdAt = param.createdAt;
    this.template = param.template;
    this.templateId = param.templateId;
    this.attachments = param.attachments;
  }

  get targetDeckName() {
    const length = this.runtimeProps.nestedDeckNames.length;
    if (length <= 0) {
      console.warn("nested deck names length is 0");
      this.runtimeProps.nestedDeckNames.push(
        CacheDataManager.i.cacheData.settings.Defaults.DeckName
      );
    }
    return this.runtimeProps.nestedDeckNames[length - 1];
  }
}
