import {IMochiDeck, MochiDeck} from "@src/models/IMochiDeck";
import {MochiDeckStoreDTO} from "@src/mappers/MochiDeckMapper";
import {ModelNotFoundError} from "@src/exceptions/ModelNotFoundError";
import {MochiSyncService} from "@src/services/MochiSyncService";

export class MochiDeckService {

    public static async index() {
        const decks = await MochiSyncService.mochiDeckController.index() ?? []
        MochiDeckService.injectParents(decks)
        return decks
    }

    public static async findOrCreateDeck(deckName: string): Promise<IMochiDeck> {
        const deck = MochiDeckService.findMatchingDeck(deckName)
        if (deck) return deck
        return MochiDeckService.createDeck(deck.name)
    }

    public static async createDeck(deckName: string) {
        const newDeckDTO: MochiDeckStoreDTO = {name: deckName}
        const newDeck: IMochiDeck | null = await MochiSyncService.mochiDeckController.store(newDeckDTO)
        if (!newDeck) {
            throw new ModelNotFoundError('New deck failed to be created');
        }
        MochiSyncService.mochiDecks.push(newDeck)
        return newDeck
    }

    public static findMatchingDeck(deckName: string): IMochiDeck {
        return MochiSyncService.mochiDecks.find((deck: IMochiDeck) => deck.name === deckName) ?? null
    }

    public static async getTargetDeckFromExistingOrCreatedDeckHierarchy(nestedDeckNames: string[]) {
        let parentDeck: IMochiDeck | null = null;

        for (const deckName of nestedDeckNames) {
            const existingDeck = MochiDeckService.findMatchingDeckInParent(deckName, parentDeck?.id);
            if (existingDeck) {
                parentDeck = existingDeck;
            } else {
                const newDeck = await MochiDeckService.createDeckWithParent(deckName, parentDeck?.id);
                parentDeck = newDeck;
            }
        }

        // Returns the leaf deck in the created/verified hierarchy
        return parentDeck;
    }

    public static findMatchingDeckInParent(deckName: string, parentId?: string): IMochiDeck | null {
        return MochiSyncService.mochiDecks.find(
            (deck: IMochiDeck) => deck.name === deckName && deck.parentId === parentId
        ) ?? null;
    }

    public static async createDeckWithParent(deckName: string, parentId?: string): Promise<IMochiDeck> {
        const newDeckDTO: MochiDeckStoreDTO = {name: deckName, "parent-id": parentId};
        const newDeck: IMochiDeck | null = await MochiSyncService.mochiDeckController.store(newDeckDTO);

        if (!newDeck) {
            throw new ModelNotFoundError('New deck failed to be created');
        }

        MochiSyncService.mochiDecks.push(newDeck);
        return newDeck;
    }


    private static injectParents(decks: MochiDeck[]) {
        for (const deck of decks) {
            if (!deck.parentId) continue;
            const parentDeck = decks.find((d) => d.parentId === d.id)
            if (!parentDeck) {
                console.warn('Parent deck not found')
                continue;
            }
            deck.parentDeck = deck
        }
    }
}