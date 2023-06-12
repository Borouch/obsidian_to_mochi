import {FileManager} from "@src/FilesManager";
import {MochiCardController} from "@src/controllers/MochiCardController";
import {MochiDeckController} from "@src/controllers/MochiDeckController";
import {MochiDeck} from "@src/models/MochiDeck";
import {AnkiConnectNote} from "@src/interfaces/IAnkiConnectNote";
import {MochiDeckStoreDTO} from "@src/mappers/MochiDeckMapper";
import {ModelNotFoundError} from "@src/exceptions/ModelNotFoundError";

export class MochiSyncService {
    public static mochiDecks: MochiDeck[] = []
    public static mochiDeckController = new MochiDeckController()
    public static mochiCardController = new MochiCardController()

    public static async syncFileManagerWithRemote(manager: FileManager) {
        const res = await new MochiCardController().store({
            "content": "Hello world",
            "deck-id": "JCsrDijL"
        })
        MochiSyncService.mochiDecks = await MochiSyncService.mochiDeckController.index() ?? []
        for (const cardFile of manager.cardsFiles) {

        }
    }

    private static async storeCards(cards: AnkiConnectNote) {

    }

    private static async findOrCreateDeck(deckName: string) {
        const deck = MochiSyncService.findMatchingDeck(deckName)
        if (deckName) return
        const newDeckDTO: MochiDeckStoreDTO = {name: deckName}
        const newDeck: MochiDeck | null = await MochiSyncService.mochiDeckController.store(newDeckDTO)
        if (!newDeck){
            throw new ModelNotFoundError('New deck failed to be created');
        }
    }

    private static findMatchingDeck(deckName: string): MochiDeck {
        return MochiSyncService.mochiDecks.find((deck: MochiDeck) => deck.name === deckName) ?? null
    }


}