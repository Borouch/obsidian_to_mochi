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


export interface MochiCardDTO {
    content: string;
    "deck-id": string;
    "template-id"?: string;
    "archived?"?: boolean;
    "review-reverse?"?: boolean;
    pos?: string;
    fields?: {
        [fieldId: string]: {
            id: string;
            value: string;
        };
    };
    attachments?: MochiAttachmentDTO[];
    id: string;
    reviews?: any[];
    "created-at": {
        date: string;
    };
}




export class MochiCardMapper implements Mapper<MochiCard, MochiCardDTO, MochiCardDTO> {
    mapFromDTO(dto: MochiCardDTO): MochiCard {
        return {
            tags: [], // Tags field is not available in MochiCardDTO, defaulting to empty array
            content: dto.content,
            name: "", // Name field is not available in MochiCardDTO, defaulting to empty string
            deckId: dto["deck-id"],
            fields: dto.fields,
            clozeIndexes: [], // clozeIndexes field is not available in MochiCardDTO, defaulting to empty array
            pos: dto.pos,
            references: [], // references field is not available in MochiCardDTO, defaulting to empty array
            id: dto.id,
            reviews: dto.reviews,
            createdAt: {
                date: dto["created-at"].date
            },
            templateId: dto["template-id"]
        };
    }

    mapToDTO(model: MochiCard): MochiCardDTO {
        return {
            content: model.content,
            "deck-id": model.deckId,
            "template-id": model.templateId,
            pos: model.pos,
            fields: model.fields,
            id: model.id,
            reviews: model.reviews,
            "created-at": {
                date: model.createdAt.date
            },
            attachments: [] ,// Attachments field is not available in MochiCard, defaulting to empty array
            // fill in the boolean fields according to your business logic, defaulting to false
            "archived?": false,
            "review-reverse?": false
        };
    }
}