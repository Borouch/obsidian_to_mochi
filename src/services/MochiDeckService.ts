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

    public static async findOrCreateDeck(deckName: string): Promise<IMochiDeck> {
        const deck = MochiDeckService.findMatchingDeck(deckName)
        if (deck) return deck
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

    public static async findOrCreateNestedDecks(nestedDeckNames: string[]) {
        for (const deckName of nestedDeckNames) {
            MochiDeckService.findOrCreateDeck()
        }

    }
}