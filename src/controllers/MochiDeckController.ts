import {BaseController} from "@src/controllers/BaseController";
import {MochiDeck} from "@src/models/MochiDeck";
import {MochiDeckIndexDTO, MochiDeckMapper, MochiDeckStoreDTO} from "@src/mappers/MochiDeckMapper";

export class MochiDeckController extends BaseController<MochiDeck, MochiDeckMapper, MochiDeckIndexDTO, MochiDeckStoreDTO> {
    constructor(
        public RESOURCE: string = 'decks',
        public ENTITY: string = null,
        public ENTITIES: string = 'docs' // Assign a proper value according to your implementation
    ) {
        super();
    }

    protected mapperFactory(): MochiDeckMapper {
        return new MochiDeckMapper();
    }

}