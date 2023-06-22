/*Class for managing a list of files, and their Anki requests.*/
import {CardainerFileSettingsData} from "./interfaces/ISettings";
import {App, arrayBufferToBase64, CachedMetadata, TAbstractFile, TFile, TFolder,} from "obsidian";
import {CardainerFile} from "./CardainerFile";
import {MochiAttachment} from "@src/models/MochiAttachment";
import * as mime from "mime-types";
import {debug} from "@src/utils/Logger";
import {getHash} from "@src/Helpers";

function difference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    let _difference = new Set(setA);
    for (let elem of setB) {
        _difference.delete(elem);
    }
    return _difference;
}

function findAttachmentLinksToAdd(
    toCheckAttachmentsLinkById: Record<string, string>,
    pendingAttachmentsLinkById: Record<string, string>
): Record<string, string> {
    const toAdd: Record<string, string> = {};
    for (const attachmentLink in toCheckAttachmentsLinkById) {
        if (pendingAttachmentsLinkById[attachmentLink]) {
            toAdd[attachmentLink] = toCheckAttachmentsLinkById[attachmentLink];
        }
    }
    return toAdd;
}

function leftExclusiveSetElements<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    let resultSet = new Set<T>();
    for (let elem of set1) {
        if (!set2.has(elem)) {
            resultSet.add(elem);
        }
    }
    return resultSet;
}

export class FileManager {
    app: App;
    data: CardainerFileSettingsData;
    tFiles: TFile[];
    cardainerFiles: Array<CardainerFile>;
    tFileHashes: Record<string, string>;
    requests_1_result: any;
    pendingAttachmentLinkByGeneratedId: Record<string, string> = {};
    persistedAttachmentLinkByGeneratedId: Record<string, string>;

    constructor(
        app: App,
        data: CardainerFileSettingsData,
        tFiles: TFile[],
        file_hashes: Record<string, string>,
        addedAttachmentLinkByGeneratedId: Record<string, string>
    ) {
        this.app = app;
        this.data = data;
        this.tFiles = tFiles;
        this.cardainerFiles = [];
        this.tFileHashes = file_hashes;
        this.persistedAttachmentLinkByGeneratedId =
            addedAttachmentLinkByGeneratedId;
    }

    private static _instance: FileManager | null = null;

    public static get instance() {
        return FileManager._instance;
    }

    public static createSingletonInstance(
        app: App,
        data: CardainerFileSettingsData,
        tFiles: TFile[],
        file_hashes: Record<string, string>,
        addedAttachmentLinkByGeneratedId: Record<string, string>
    ): FileManager {
        if (!FileManager._instance) {
            FileManager._instance = new FileManager(
                app,
                data,
                tFiles,
                file_hashes,
                addedAttachmentLinkByGeneratedId
            );
        }

        return FileManager._instance;
    }

    getUrl(file: TFile): string {
        return (
            "obsidian://open?vault=" +
            encodeURIComponent(this.data.vaultName) +
            String.raw`&file=` +
            encodeURIComponent(file.path)
        );
    }

    getFolderPathList(file: TFile): TFolder[] {
        let result: TFolder[] = [];
        let abstractFile: TAbstractFile = file;
        while (abstractFile && abstractFile.hasOwnProperty("parent")) {
            result.push(abstractFile.parent);
            abstractFile = abstractFile.parent;
        }
        result.pop(); // Removes top-level vault
        return result;
    }

    getDefaultDeck(file: TFile, folder_path_list: TFolder[]): string {
        let folder_decks = this.data.folderDecks;
        for (let folder of folder_path_list) {
            // Loops over them from innermost folder
            if (folder_decks[folder.path]) {
                return folder_decks[folder.path];
            }
        }
        // If no decks specified
        return this.data.defaultDeckName;
    }

    getDefaultTags(file: TFile, folder_path_list: TFolder[]): string[] {
        let folder_tags = this.data.folderTags;
        let tags_list: string[] = [];
        for (let folder of folder_path_list) {
            // Loops over them from innermost folder
            if (folder_tags[folder.path]) {
                tags_list.push(...folder_tags[folder.path].split(" "));
            }
        }
        tags_list.push(...this.data.defaultTags);
        return tags_list;
    }

    dataToCardsFileSettingsData(file: TFile): CardainerFileSettingsData {
        const folderPathList: TFolder[] = this.getFolderPathList(file);
        let result: CardainerFileSettingsData = JSON.parse(JSON.stringify(this.data));
        //Lost regexp, so have to get them back
        result.FROZEN_REGEXP = this.data.FROZEN_REGEXP;
        result.DECK_REGEXP = this.data.DECK_REGEXP;
        result.TAG_REGEXP = this.data.TAG_REGEXP;
        result.BEGIN_END_CARD = this.data.BEGIN_END_CARD;
        result.INLINE_REGEXP = this.data.INLINE_REGEXP;
        result.DELETE_REGEXP = this.data.DELETE_REGEXP;
        result.defaultDeckName = this.getDefaultDeck(file, folderPathList);
        result.defaultTags = this.getDefaultTags(file, folderPathList);
        return result;
    }

    async genCardsFiles() {
        for (let file of this.tFiles) {
            const content: string = await this.app.vault.read(file);
            const cache: CachedMetadata = this.app.metadataCache.getCache(file.path);
            const file_data = this.dataToCardsFileSettingsData(file);
            this.cardainerFiles.push(
                new CardainerFile(
                    content,
                    file.path,
                    this.data.addFileLink ? this.getUrl(file) : "",
                    file_data,
                    cache
                )
            );
        }
    }

    async detectFilesChanges() {
        await this.genCardsFiles();
        let changedCardFiles: Array<CardainerFile> = [];
        let changedTFiles: TFile[] = [];
        for (let index in this.cardainerFiles) {
            const i = parseInt(index);
            let cardainerFile = this.cardainerFiles[i];
            if (
                !(
                    this.tFileHashes.hasOwnProperty(cardainerFile.path) &&
                    getHash(cardainerFile.contents) === this.tFileHashes[cardainerFile.path]
                )
            ) {
                //Indicates it's changed or new
                console.info("Scanning ", cardainerFile.path, "as it's changed or new.");
                cardainerFile.scanFileForCardsCRUD();
                changedCardFiles.push(cardainerFile);
                changedTFiles.push(this.tFiles[i]);
            }
        }
        this.cardainerFiles = changedCardFiles;
        this.tFiles = changedTFiles;
    }

    // TODO: When attachment is renamed, you should also rename it in cache
    async createAttachmentsForMochiCards() {
        for (let cardsFile of this.cardainerFiles) {
            for (const mochiCard of [
                ...cardsFile.mochiCardsToEdit,
                ...cardsFile.allTypeMochiCardsToAdd,
            ]) {

                const toAddAttachmentLinksById: Record<string, string> =
                    findAttachmentLinksToAdd(
                        mochiCard.runtimeProps.attachmentLinkByGeneratedId,
                        this.pendingAttachmentLinkByGeneratedId
                    );
                for (const attachmentLink in toAddAttachmentLinksById) {
                    const dataFile: TFile = this.app.metadataCache.getFirstLinkpathDest(
                        attachmentLink,
                        cardsFile.path
                    );
                    if (!dataFile) {
                        console.warn("Couldn't locate media file ", attachmentLink);
                    } else {
                        const binary = await this.app.vault.readBinary(dataFile);
                        const base64 = arrayBufferToBase64(binary);
                        const mimeType = mime.lookup(dataFile.extension);
                        const attachment: MochiAttachment = {
                            data: base64,
                            fileName: toAddAttachmentLinksById[attachmentLink],
                            contentType: mimeType,
                        };
                        mochiCard.attachments = [
                            ...(mochiCard.attachments || []),
                            attachment,
                        ];
                        debug({mochiCardAttachments: mochiCard.attachments});

                    }
                }
            }
        }
        for (const attachmentLink in this.pendingAttachmentLinkByGeneratedId) {
            this.persistedAttachmentLinkByGeneratedId[attachmentLink] =
                this.pendingAttachmentLinkByGeneratedId[attachmentLink];
        }
    }

    addAttachmentLinkByIdRecordToPending(attachmentLink: string, id: string) {
        if (
            !this.persistedAttachmentLinkByGeneratedId[attachmentLink] &&
            !this.pendingAttachmentLinkByGeneratedId[attachmentLink]
        ) {
            this.pendingAttachmentLinkByGeneratedId[attachmentLink] = id
        }
    }

    getPersistedOrPendingAttachmentLinkId(attachmentLink: string) {
        return this.persistedAttachmentLinkByGeneratedId[attachmentLink] ??
            this.pendingAttachmentLinkByGeneratedId[attachmentLink]
    }

    getFileHashes(): Record<string, string> {
        let result: Record<string, string> = {};
        for (let file of this.cardainerFiles) {
            result[file.path] = getHash(file.contents);
        }
        return result;
    }


}
