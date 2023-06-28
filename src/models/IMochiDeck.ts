export interface IMochiDeck {
    id?: string
    name: string;
    parentId?: string;
    sort?: number;
    trashedAt?: Date;
    archived?: boolean;
    sortBy?: ':none' | ':lexigraphically' | ':lexicographically' | ':created-at' | ':updated-at' | ':retention-rate-asc' | ':interval-length';
    cardsView?: ':list' | ':grid' | ':note' | ':column';
    showSides?: boolean;
    sortByDirection?: boolean;
    reviewReverse?: boolean;
}

export class MochiDeck implements IMochiDeck {
    public id?: string;
    public name: string;
    public parentId?: string;
    public sort?: number;
    public trashedAt?: Date;
    public archived?: boolean;
    public sortBy?: ':none' | ':lexigraphically' | ':lexicographically' | ':created-at' | ':updated-at' | ':retention-rate-asc' | ':interval-length';
    public cardsView?: ':list' | ':grid' | ':note' | ':column';
    public showSides?: boolean;
    public sortByDirection?: boolean;
    public reviewReverse?: boolean;
    public parentDeck:MochiDeck
    constructor(param: IMochiDeck) {
        this.id = param.id;
        this.name = param.name;
        this.parentId = param.parentId;
        this.sort = param.sort;
        this.trashedAt = param.trashedAt;
        this.archived = param.archived;
        this.sortBy = param.sortBy;
        this.cardsView = param.cardsView;
        this.showSides = param.showSides;
        this.sortByDirection = param.sortByDirection;
        this.reviewReverse = param.reviewReverse;
    }
}
