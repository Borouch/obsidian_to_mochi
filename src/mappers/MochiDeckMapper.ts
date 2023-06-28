import {Mapper} from "@src/interfaces/Mapper";
import {IMochiDeck, MochiDeck} from "@src/models/IMochiDeck";

export interface MochiDeckIndexDTO {
    id?: string
    name: string;
    "parent-id"?: string;
    sort?: number;
    "trashed-at"?: string;
    archived?: boolean;
    "sort-by"?: ':none' | ':lexigraphically' | ':lexicographically' | ':created-at' | ':updated-at' | ':retention-rate-asc' | ':interval-length';
    "cards-view"?: ':list' | ':grid' | ':note' | ':column';
    "show-sides"?: boolean;
    "sort-by-direction"?: boolean;
    "review-reverse"?: boolean;
}

export interface MochiDeckStoreDTO extends MochiDeckIndexDTO {
}

export class MochiDeckMapper implements Mapper<MochiDeck, MochiDeckIndexDTO, MochiDeckStoreDTO> {
    mapFromDTO(dto: MochiDeckIndexDTO): MochiDeck {
        return new MochiDeck({
            id: dto.id,
            name: dto.name,
            parentId: dto['parent-id'],
            sort: dto.sort,
            trashedAt: dto['trashed-at'] ? new Date(dto['trashed-at']) : undefined,
            archived: dto.archived,
            sortBy: dto['sort-by'],
            cardsView: dto['cards-view'],
            showSides: dto['show-sides'],
            sortByDirection: dto['sort-by-direction'],
            reviewReverse: dto['review-reverse'],
        });
    }

    mapToDTO(model: IMochiDeck): MochiDeckStoreDTO {
        return {
            name: model.name,
            ...(!!model.id ? {id: model.id} : {}),
            ...(!!model.parentId ? {'parent-id': model.parentId} : {}),
            ...(!!model.sort ? {sort: model.sort} : {}),
            ...(!!model.trashedAt ? {'trashed-at': model.trashedAt?.toISOString()} : {}),
            ...(!!model.archived ? {archived: model.archived} : {}),
            ...(!!model.sortBy ? {'sort-by': model.sortBy} : {}),
            ...(!!model.cardsView ? {'cards-view': model.cardsView} : {}),
            ...(!!model.showSides ? {'show-sides': model.showSides} : {}),
            ...(!!model.sortByDirection ? {'sort-by-direction': model.sortByDirection} : {}),
            ...(!!model.reviewReverse ? {'review-reverse': model.reviewReverse} : {}),
        };
    }
}
