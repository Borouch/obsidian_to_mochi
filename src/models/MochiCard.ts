import {MochiTemplate} from "@src/models/MochiTemplate";

export interface MochiCardField {
    id: string;
    value: string;
}

export interface MochiCard {
    tags: string[];
    content: string;
    name?: string;
    deckName?: string,
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
}


