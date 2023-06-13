import {FileManager} from "@src/FilesManager";
import {MochiCardController} from "@src/controllers/MochiCardController";
import {MochiDeckController} from "@src/controllers/MochiDeckController";
import {MochiDeck} from "@src/models/MochiDeck";
import {MochiCard} from "@src/models/MochiCard";
import {debug} from "@src/utils/Logger";
import {MochiCardService} from "@src/services/MochiCardService";

export class MochiSyncService {
    public static mochiDecks: MochiDeck[] = []
    public static mochiCards: MochiCard[] = []
    public static mochiDeckController = new MochiDeckController()
    public static mochiCardController = new MochiCardController()

    public static async syncFileManagerWithRemote(manager: FileManager) {
        MochiSyncService.mochiDecks = await MochiSyncService.mochiDeckController.index() ?? []
        for (const cardFile of manager.cardsFiles) {

            await MochiCardService.destroyCards(cardFile.mochiCardIdsToDelete)
            const storedCards: MochiCard[] = await MochiCardService.storeCards(cardFile.allTypeMochiCardsToAdd)
            const updatedCards: MochiCard[] = await MochiCardService.updateCards(cardFile.mochiCardsToEdit)
            const syncedCards = [...storedCards, ...updatedCards]
            cardFile.mochiCardIds.push(...syncedCards.map((c) => c.id))
            debug({storedCards, updatedCards, syncedCards})
        }
    }

    public static async syncChangesToCardsFiles(manager: FileManager) {

        for (let idx in manager.cardsFiles) {
            let i: number = parseInt(idx)
            const cardsFile = manager.cardsFiles[i]
            const tFile = manager.tFiles[i]
            cardsFile.writeIDs()
            cardsFile.performDelete()
            if (cardsFile.contents !== cardsFile.originalContents) {
                await manager.app.vault.modify(tFile, cardsFile.contents)
            }
        }

    }


    public static getGeneratedContentFromFields(fields: Record<string, string>) {
        return `${fields['Front']}\n---\n${fields['Back']}`
    }


}