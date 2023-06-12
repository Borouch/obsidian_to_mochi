export interface MochiDeck {
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