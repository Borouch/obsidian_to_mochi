import {MochiTemplate} from "@src/models/MochiTemplate";
import {MochiAttachment} from "@src/models/MochiAttachment";

export interface MochiCardField {
    id: string;
    value: string;
}
export interface TempMochiParams {
    originalHash?:string,
    currentHash?:string,
    deckName?: string,
    attachmentLinkByGeneratedId?:Record<string,string>
}

export interface MochiCard {
    runtimeProps?:TempMochiParams
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


