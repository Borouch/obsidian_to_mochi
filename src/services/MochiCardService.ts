import {MochiCard} from "@src/models/MochiCard";
import {MochiCardDTO, MochiCardMapper} from "@src/mappers/MochiCardMapper";
import {ModelNotFoundError} from "@src/exceptions/ModelNotFoundError";
import {MochiSyncService} from "@src/services/MochiSyncService";
import {MochiDeckService} from "@src/services/MochiDeckService";

export class MochiCardService {
    public static async indexCards() {
        return await MochiSyncService.mochiCardController.index()
    }

    public static async storeCards(cards: MochiCard[]): Promise<MochiCard[]> {
        if (cards.length <= 0) return []
        const mochiCards: MochiCard[] = []
        for (const card of cards) {
            const deck = await MochiDeckService.findOrCreateDeck(card.runtimeProps.deckName)
            card.deckId = deck.id
            const dto: MochiCardDTO = MochiCardMapper.i.mapToDTO(card)
            const mochiCard: MochiCard | null = await MochiSyncService.mochiCardController.store(dto)
            if (!mochiCard) {
                throw new ModelNotFoundError('mochi card failed to be created');
            }
            mochiCards.push(mochiCard)
        }
        return mochiCards
    }

    public static async updateCards(cards: MochiCard[]) {
        if (cards.length <= 0) return []

        const mochiCards: MochiCard[] = []
        for (const card of cards) {
            const deck = await MochiDeckService.findOrCreateDeck(card.runtimeProps.deckName)
            card.deckId = deck.id
            const dto: MochiCardDTO = MochiCardMapper.i.mapToDTO(card)
            const mochiCard: MochiCard | null = await MochiSyncService.mochiCardController.store(dto, card.id)
            if (!mochiCard) {
                throw new ModelNotFoundError('mochi card failed to be created');
            }
            mochiCards.push(mochiCard)
        }
        return mochiCards
    }

    public static async destroyCards(ids: string[]) {
        if (ids.length <= 0) return []

        for (const id of ids) {
            await MochiSyncService.mochiCardController.destroy(id)
        }
    }
}