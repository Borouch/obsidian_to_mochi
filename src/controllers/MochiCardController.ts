import {MochiCard} from "@src/models/MochiCard";
import {MochiCardDTO, MochiCardMapper} from "@src/mappers/MochiCardMapper";
import {BaseController} from "@src/controllers/BaseController";

export class MochiCardController extends BaseController<MochiCard, MochiCardMapper, MochiCardDTO, MochiCardDTO> {

    constructor(
        public RESOURCE: string = 'cards',
        public ENTITY: string = null,
        public ENTITIES: string = 'docs' // Assign a proper value according to your implementation
    ) {
        super();
    }

    protected mapperFactory(): MochiCardMapper {
        return MochiCardMapper.i;
    }

}