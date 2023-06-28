import {MochiAttachmentDTO} from "@src/models/MochiAttachment";
import {Mapper} from "@src/interfaces/Mapper";
import {IMochiCard} from "@src/models/IMochiCard";
import {MochiAttachmentMapper} from "@src/mappers/MochiAttachmentMapper";

export interface MochiCardField {
    id: string;
    value: string;
}

export interface MochiCardDTO {
    content: string;
    "deck-id": string;
    "template-id"?: string;
    "archived?"?: boolean;
    "review-reverse?"?: boolean;
    pos?: string;
    fields?: {
        [fieldId: string]: MochiCardField;
    };
    attachments?: MochiAttachmentDTO[];
    id?: string;
    reviews?: any[];
    "created-at"?: {
        date: string;
    };
}


export class MochiCardMapper implements Mapper<IMochiCard, MochiCardDTO, MochiCardDTO> {
    public static i = new MochiCardMapper()
    private constructor() {
    }

    mapFromDTO(dto: MochiCardDTO): IMochiCard {
        return {
            tags: [], // Tags field is not available in MochiCardDTO, defaulting to empty array
            content: dto.content,
            name: "", // Name field is not available in MochiCardDTO, defaulting to empty string
            deckId: dto["deck-id"],
            fieldById: dto.fields,
            clozeIndexes: [],
            pos: dto.pos,
            references: [],
            id: dto.id,
            reviews: dto.reviews,
            attachments: [],
            createdAt: {
                date: dto["created-at"].date
            },
            templateId: dto["template-id"],
            runtimeProps:{}
        };
    }

    mapToDTO(model: IMochiCard): MochiCardDTO {
        return {
            content: model.content,
            "deck-id": model.deckId,
            "template-id": model.templateId,
            pos: model.pos,
            fields: model.fieldById,
            attachments: model.attachments ? model.attachments.map((m) => MochiAttachmentMapper.i.mapToDTO(m)) : [],
            "archived?": false,
            "review-reverse?": false
        };
    }
}