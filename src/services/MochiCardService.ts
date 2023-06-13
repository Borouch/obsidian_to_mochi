import {AnkiConnectNote, AnkiConnectNoteAndID} from "@src/interfaces/IAnkiConnectNote";
import {MochiCard} from "@src/models/MochiCard";
import {MochiCardDTO} from "@src/mappers/MochiCardMapper";
import {ModelNotFoundError} from "@src/exceptions/ModelNotFoundError";
import {MochiSyncService} from "@src/services/MochiSyncService";
import {MochiDeckService} from "@src/services/MochiDeckService";

export class MochiCardService {
    public static async indexCards() {
        return await MochiSyncService.mochiCardController.index()
    }

    public static async storeCards(cards: AnkiConnectNote[]): Promise<MochiCard[]> {
        const mochiCards: MochiCard[] = []
        for (const card of cards) {
            const deck = await MochiDeckService.findOrCreateDeck(card.deckName)
            const content = MochiSyncService.getGeneratedContentFromFields(card.fields)

            const dto: MochiCardDTO = {"deck-id": deck.id, content: content}
            const mochiCard: MochiCard | null = await MochiSyncService.mochiCardController.store(dto)
            if (!mochiCard) {
                throw new ModelNotFoundError('mochi card failed to be created');
            }
            mochiCards.push(mochiCard)
        }
        return mochiCards
    }

    public static async updateCards(cards: AnkiConnectNoteAndID[]) {
        const mochiCards: MochiCard[] = []
        for (const card of cards) {
            const deck = await MochiDeckService.findOrCreateDeck(card.ankiNote.deckName)
            const content = MochiSyncService.getGeneratedContentFromFields(card.ankiNote.fields)
            const dto: MochiCardDTO = {"deck-id": deck.id, content: content}
            const mochiCard: MochiCard | null = await MochiSyncService.mochiCardController.store(dto,card.identifier)
            if (!mochiCard) {
                throw new ModelNotFoundError('mochi card failed to be created');
            }
            mochiCards.push(mochiCard)
        }
        return mochiCards
    }
}