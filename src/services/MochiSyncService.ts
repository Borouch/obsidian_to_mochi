import {FileManager} from "@src/FilesManager";
import {MochiCardController} from "@src/controllers/MochiCardController";
import {MochiDeckController} from "@src/controllers/MochiDeckController";
import {MochiDeck} from "@src/models/MochiDeck";
import {MochiCard, MochiCardField} from "@src/models/MochiCard";
import {debug} from "@src/utils/Logger";
import {MochiCardService} from "@src/services/MochiCardService";
import {MochiTemplate} from "@src/models/MochiTemplate";
import {getHash} from "@src/Helpers";

export class MochiSyncService {
    public static mochiDecks: MochiDeck[] = []
    public static mochiCards: MochiCard[] = []
    public static mochiTemplates: MochiTemplate[] = []
    public static mochiDeckController = new MochiDeckController()
    public static mochiCardController = new MochiCardController()

    public static async syncFileManagerWithRemote(manager: FileManager) {
        MochiSyncService.mochiDecks = await MochiSyncService.mochiDeckController.index() ?? []
        for (const cardFile of manager.cardainerFiles) {

            await MochiCardService.destroyCards(cardFile.mochiCardIdsToDelete)
            for (const deletedCardId of cardFile.mochiCardIdsToDelete) {
                const idx = this.mochiCards.findIndex((c) => deletedCardId === c.id)
                if (idx < 0) {
                    console.warn('Removed mochi card cannot be removed because it is not found')
                    continue
                }
                this.mochiCards.splice(idx, 1)
            }

            const storedCards: MochiCard[] = await MochiCardService.storeCards(cardFile.allTypeMochiCardsToAdd)
            this.mochiCards.push(...storedCards)
            const updatedCards: MochiCard[] = await MochiCardService.updateCards(cardFile.mochiCardsToEdit)
            for (const uc of updatedCards) {
                const idx = this.mochiCards.findIndex((c) => uc.id === c.id)
                if (idx < 0) {
                    console.warn('Updated mochi card cannot be replaced because it is not found')
                    continue
                }
                this.mochiCards[idx] = uc
            }
            const syncedCards = [...storedCards, ...updatedCards]
            cardFile.mochiCardIds.push(...syncedCards.map((c) => c.id))
            debug({storedCards, updatedCards, syncedCards})
        }
    }

    public static async syncChangesToCardainerFiles(manager: FileManager) {

        for (let idx in manager.cardainerFiles) {
            let i: number = parseInt(idx)
            const cardsFile = manager.cardainerFiles[i]
            const tFile = manager.tFiles[i]
            cardsFile.writeIDs()
            //TODO: clean added media if deleted
            cardsFile.performDelete()
            if (cardsFile.contents !== cardsFile.originalContents) {
                await manager.app.vault.modify(tFile, cardsFile.contents)
            }
        }

    }

    public static getMochiCardHashesById() {
        const hashesById = {}
        for (const mochiCard of this.mochiCards) {
            mochiCard.content = this.makeContentFromMochiFields(mochiCard.fieldById)

            mochiCard.runtimeProps.currentHash = getHash(mochiCard.content)
            hashesById[mochiCard.id] = mochiCard.runtimeProps.currentHash
        }
        return hashesById
    }

    public static makeContentFromMochiFields(fields: Record<string, MochiCardField>) {
        let content = ''
        let i = 0;
        for (const id in fields) {
            content += i === 0 ? `${fields[id].value}` : `\n---\n${fields[id].value}`
            i++;
        }
        return content
    }


}