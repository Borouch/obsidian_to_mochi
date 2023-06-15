import {MochiTemplate} from "@src/models/MochiTemplate";
import {MochiAttachment} from "@src/models/MochiAttachment";

export interface MochiCardField {
    id: string;
    value: string;
}
export interface TempMochiParams {
    deckName?: string,
    attachmentLinksSet?: Set<string>
}

export interface MochiCard {
    tempProps?:TempMochiParams
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
    template?: MochiTemplate
    templateId: string;
    attachments?: MochiAttachment[]
}


