import {MochiDeck} from "@src/models/MochiDeck";
import {MochiDeckStoreDTO} from "@src/mappers/MochiDeckMapper";
import {ModelNotFoundError} from "@src/exceptions/ModelNotFoundError";
import {MochiSyncService} from "@src/services/MochiSyncService";

export class MochiDeckService {
    public static async findOrCreateDeck(deckName: string): Promise<MochiDeck> {
        const deck =  MochiDeckService.findMatchingDeck(deckName)
        if (deck) return deck
        const newDeckDTO: MochiDeckStoreDTO = {name: deckName}
        const newDeck: MochiDeck | null = await MochiSyncService.mochiDeckController.store(newDeckDTO)
        if (!newDeck) {
            throw new ModelNotFoundError('New deck failed to be created');
        }
        MochiSyncService.mochiDecks.push(newDeck)
        return newDeck
    }

    public static findMatchingDeck(deckName: string): MochiDeck {
        return MochiSyncService.mochiDecks.find((deck: MochiDeck) => deck.name === deckName) ?? null
    }
}