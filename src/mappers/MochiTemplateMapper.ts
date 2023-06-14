import {MochiTemplateFieldDTO} from "@src/mappers/MochiTemplateFieldMapper";
import {MochiTemplate} from "@src/models/MochiTemplate";
import {Mapper} from "@src/interfaces/Mapper";

export interface MochiTemplateIndexDTO {
    id: string;
    pos: string;
    name: string;
    content: string;
    "cloze?": boolean | null;
    "anki-id": string;
    fields: Record<string, MochiTemplateFieldDTO>;
}

export interface MochiTemplateStoreDTO extends MochiTemplateIndexDTO {
}

export class MochiTemplateMapper implements Mapper<MochiTemplate, MochiTemplateIndexDTO, MochiTemplateStoreDTO> {

    private static _instance = new MochiTemplateMapper()
    public static i = this._instance

    private constructor() {
    }

    mapFromDTO(dto: MochiTemplateIndexDTO): MochiTemplate {
        return {
            id: dto.id,
            pos: dto.pos,
            name: dto.name,
            content: dto.content,
            'cloze?': dto["cloze?"],
            'anki/id': dto["anki-id"],
            fields: Object.fromEntries(Object.entries(dto.fields).map(([key, value]) => [key, {
                id: value.id,
                pos: value.pos,
                name: value.name,
                type: value.type
            }]))
        };
    }

    mapToDTO(model: MochiTemplate): MochiTemplateStoreDTO {
        return {
            id: model.id,
            pos: model.pos,
            name: model.name,
            content: model.content,
            "cloze?": model['cloze?'],
            "anki-id": model['anki/id'],
            fields: Object.fromEntries(Object.entries(model.fields).map(([key, value]) => [key, {
                id: value.id,
                pos: value.pos,
                name: value.name,
                type: value.type
            }]))
        };
    }
}