import {Mapper} from "@src/interfaces/Mapper";
import {MochiAttachment, MochiAttachmentDTO} from "@src/models/MochiAttachment";

export class MochiAttachmentMapper implements Mapper<MochiAttachment, MochiAttachmentDTO, MochiAttachmentDTO> {
    private static _i = new MochiAttachmentMapper()
    public static i = this._i

    private constructor() {
    }

    mapFromDTO(dto: MochiAttachmentDTO): MochiAttachment {
        return {
            fileName: dto["file-name"],
            contentType: dto["content-type"],
            data: dto.data
        };
    }

    mapToDTO(model: MochiAttachment): MochiAttachmentDTO {
        return {
            "file-name": model.fileName,
            "content-type": model.contentType,
            data: model.data
        };
    }
}
