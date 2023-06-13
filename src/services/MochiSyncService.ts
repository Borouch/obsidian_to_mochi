import {FileManager} from "@src/FilesManager";
import {MochiCardController} from "@src/controllers/MochiCardController";
import {MochiDeckController} from "@src/controllers/MochiDeckController";
import {MochiDeck} from "@src/models/MochiDeck";
import {AnkiConnectNote, AnkiConnectNoteAndID} from "@src/interfaces/IAnkiConnectNote";
import {MochiDeckStoreDTO} from "@src/mappers/MochiDeckMapper";
import {ModelNotFoundError} from "@src/exceptions/ModelNotFoundError";
import {MochiCard} from "@src/models/MochiCard";
import {MochiCardDTO} from "@src/mappers/MochiCardMapper";
import {debug} from "@src/utils/Logger";

export class MochiSyncService {
    public static mochiDecks: MochiDeck[] = []
    public static mochiCards: MochiCard[] = []
    public static mochiDeckController = new MochiDeckController()
    public static mochiCardController = new MochiCardController()

    public static async syncFileManagerWithRemote(manager: FileManager) {
        MochiSyncService.mochiDecks = await MochiSyncService.mochiDeckController.index() ?? []
        for (const cardFile of manager.cardsFiles) {
            const storedCards: MochiCard[] = await MochiSyncService.storeCards(cardFile.allTypeMochiCardsToAdd)
            const updatedCards: MochiCard[] = await MochiSyncService.updateCards(cardFile.mochiCardsToEdit)
            const syncedCards = [...storedCards, ...updatedCards]
            cardFile.mochiCardIds.push(...syncedCards.map((c) => c.id as number))
            debug({storedCards, updatedCards, syncedCards})
        }
    }

    public static async syncChangesToCardsFiles(manager: FileManager) {

        for (let idx in manager.cardsFiles) {
            let i: number = parseInt(idx)
            const cardsFile = manager.cardsFiles[i]
            const tFile = manager.tFiles[i]
            cardsFile.writeIDs()
            cardsFile.removeEmpties()
            if (cardsFile.contents !== cardsFile.originalContents) {
                await manager.app.vault.modify(tFile, cardsFile.contents)
            }
        }

    }

    private static async storeCards(cards: AnkiConnectNote[]): Promise<MochiCard[]> {
        const mochiCards: MochiCard[] = []
        for (const card of cards) {
            const deck = await MochiSyncService.findOrCreateDeck(card.deckName)
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

    private static async updateCards(cards: AnkiConnectNoteAndID[]) {
        const mochiCards: MochiCard[] = []
        for (const card of cards) {
            const deck = await MochiSyncService.findOrCreateDeck(card.ankiNote.deckName)
            const content = MochiSyncService.getGeneratedContentFromFields(card.ankiNote.fields)
            const dto: MochiCardDTO = {"deck-id": deck.id, content: content}
            const mochiCard: MochiCard | null = await MochiSyncService.mochiCardController.update(card.identifier, dto)
            if (!mochiCard) {
                throw new ModelNotFoundError('mochi card failed to be created');
            }
            mochiCards.push(mochiCard)
        }
        return mochiCards
    }

    public static async indexCards() {
        const cards = await MochiSyncService.mochiCardController.index()
        MochiSyncService.mochiCards = cards;
        return cards
    }

    private static getGeneratedContentFromFields(fields: Record<string, string>) {
        return `${fields['Front']}\n---\n${fields['Back']}`
    }

    private static async findOrCreateDeck(deckName: string): Promise<MochiDeck> {
        const deck = MochiSyncService.findMatchingDeck(deckName)
        if (deck) return deck
        const newDeckDTO: MochiDeckStoreDTO = {name: deckName}
        const newDeck: MochiDeck | null = await MochiSyncService.mochiDeckController.store(newDeckDTO)
        if (!newDeck) {
            throw new ModelNotFoundError('New deck failed to be created');
        }
        MochiSyncService.mochiDecks.push(newDeck)
        return newDeck
    }

    private static findMatchingDeck(deckName: string): MochiDeck {
        return MochiSyncService.mochiDecks.find((deck: MochiDeck) => deck.name === deckName) ?? null
    }


}