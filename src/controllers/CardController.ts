import {BaseController} from "@src/controllers/base-controller";
import {MochiCard, MochiCardDTO, MochiCardMapper} from "@src/models/MochiCard";

export class CardController extends BaseController<MochiCard, MochiCardMapper, MochiCardDTO, MochiCardDTO> {
    ENTITIES: 'docs';
    ENTITY: string;
    RESOURCE: 'cards';

    protected mapperFactory(): MochiCardMapper {
        return new MochiCardMapper();
    }

}