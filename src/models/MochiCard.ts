import {MochiAttachmentDTO} from "@src/models/MochiAttachment";
import {Mapper} from "@src/interfaces/mapper";

export interface MochiCard {
    tags: string[];
    content: string;
    name: string;
    deckId: string;
    fields?: {
        [fieldId: string]: {
            id: string;
            value: string;
        };
    };
    clozeIndexes?: any[];
    pos?: string;
    references?: any[];
    id: string;
    reviews?: any[];
    createdAt: {
        date: string;
    };
    templateId: string;
}


