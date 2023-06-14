import {BaseController} from "@src/controllers/BaseController";
import {MochiTemplate} from "@src/models/MochiTemplate";
import {MochiTemplateIndexDTO, MochiTemplateMapper} from "@src/mappers/MochiTemplateMapper";
import {MochiDeckMapper} from "@src/mappers/MochiDeckMapper";

export class MochiTemplatesController extends BaseController<MochiTemplate, MochiTemplateMapper, MochiTemplateIndexDTO, MochiTemplateIndexDTO> {
    private static _instance = new MochiTemplatesController()
    public static i = this._instance


    private constructor(
        public RESOURCE: string = 'templates',
        public ENTITY: string = null,
        public ENTITIES: string = 'docs' // Assign a proper value according to your implementation
    ) {
        super();
    }

    protected mapperFactory(): MochiTemplateMapper {
        return MochiTemplateMapper.i;
    }
}