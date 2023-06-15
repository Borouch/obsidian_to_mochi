/*Class for managing a list of files, and their Anki requests.*/
import {
  CardsFileSettingsData,
  ParsedSettingsData,
} from "./interfaces/ISettings";
import {
  App,
  arrayBufferToBase64,
  CachedMetadata,
  FileSystemAdapter,
  Notice,
  TAbstractFile,
  TFile,
  TFolder,
} from "obsidian";
import { CardsFile } from "./CardsFile";
import * as AnkiConnect from "./anki";
import { basename } from "path";
import { MochiAttachment } from "@src/models/MochiAttachment";
import * as mime from "mime-types";
import { debug } from "@src/utils/Logger";
import { generateRandomId } from "@src/Helpers";

interface addNoteResponse {
  result: number;
  error: string | null;
}

interface notesInfoResponse {
  result: Array<{
    noteId: number;
    modelName: string;
    tags: string[];
    fields: Record<
      string,
      {
        order: number;
        value: string;
      }
    >;
    cards: number[];
  }>;
  error: string | null;
}

interface Requests1Result {
  0: {
    error: string | null;
    result: Array<{
      result: addNoteResponse[];
      error: string | null;
    }>;
  };
  1: {
    error: string | null;
    result: notesInfoResponse[];
  };
  2: any;
  3: any;
  4: any;
}

function difference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  let _difference = new Set(setA);
  for (let elem of setB) {
    _difference.delete(elem);
  }
  return _difference;
}

function findAttachmentLinksToAdd(
  toCheckAttachmentsLinkById: Record<string, string>,
  existingAttachmentsLinkById: Record<string, string>
): Record<string, string> {
  const toAdd: Record<string, string> = {};
  for (const attachmentLink in toCheckAttachmentsLinkById) {
    if (!existingAttachmentsLinkById[attachmentLink]) {
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
  data: ParsedSettingsData;
  tFiles: TFile[];
  cardsFiles: Array<CardsFile>;
  tFileHashes: Record<string, string>;
  requests_1_result: any;
  addedAttachmentLinkByGeneratedId: Record<string, string>;

  constructor(
    app: App,
    data: ParsedSettingsData,
    tFiles: TFile[],
    file_hashes: Record<string, string>,
    addedAttachmentLinkByGeneratedId: Record<string, string>
  ) {
    this.app = app;
    this.data = data;
    this.tFiles = tFiles;
    this.cardsFiles = [];
    this.tFileHashes = file_hashes;
    this.addedAttachmentLinkByGeneratedId = addedAttachmentLinkByGeneratedId;
  }

  getUrl(file: TFile): string {
    return (
      "obsidian://open?vault=" +
      encodeURIComponent(this.data.vault_name) +
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
    let folder_decks = this.data.folder_decks;
    for (let folder of folder_path_list) {
      // Loops over them from innermost folder
      if (folder_decks[folder.path]) {
        return folder_decks[folder.path];
      }
    }
    // If no decks specified
    return this.data.template.deckName;
  }

  getDefaultTags(file: TFile, folder_path_list: TFolder[]): string[] {
    let folder_tags = this.data.folder_tags;
    let tags_list: string[] = [];
    for (let folder of folder_path_list) {
      // Loops over them from innermost folder
      if (folder_tags[folder.path]) {
        tags_list.push(...folder_tags[folder.path].split(" "));
      }
    }
    tags_list.push(...this.data.template.tags);
    return tags_list;
  }

  dataToCardsFileSettingsData(file: TFile): CardsFileSettingsData {
    const folderPathList: TFolder[] = this.getFolderPathList(file);
    let result: CardsFileSettingsData = JSON.parse(JSON.stringify(this.data));
    //Lost regexp, so have to get them back
    result.FROZEN_REGEXP = this.data.FROZEN_REGEXP;
    result.DECK_REGEXP = this.data.DECK_REGEXP;
    result.TAG_REGEXP = this.data.TAG_REGEXP;
    result.CARD_REGEXP = this.data.CARD_REGEXP;
    result.INLINE_REGEXP = this.data.INLINE_REGEXP;
    result.DELETE_REGEXP = this.data.DELETE_REGEXP;
    result.template.deckName = this.getDefaultDeck(file, folderPathList);
    result.template.tags = this.getDefaultTags(file, folderPathList);
    return result;
  }

  async genCardsFiles() {
    for (let file of this.tFiles) {
      const content: string = await this.app.vault.read(file);
      const cache: CachedMetadata = this.app.metadataCache.getCache(file.path);
      const file_data = this.dataToCardsFileSettingsData(file);
      this.cardsFiles.push(
        new CardsFile(
          content,
          file.path,
          this.data.add_file_link ? this.getUrl(file) : "",
          file_data,
          cache
        )
      );
    }
  }

  async detectFilesChanges() {
    await this.genCardsFiles();
    let changedCardFiles: Array<CardsFile> = [];
    let changedTFiles: TFile[] = [];
    for (let index in this.cardsFiles) {
      const i = parseInt(index);
      let cardsFile = this.cardsFiles[i];
      if (
        !(
          this.tFileHashes.hasOwnProperty(cardsFile.path) &&
          cardsFile.getHash() === this.tFileHashes[cardsFile.path]
        )
      ) {
        //Indicates it's changed or new
        console.info("Scanning ", cardsFile.path, "as it's changed or new.");
        cardsFile.scanFileForCardsCRUD();
        changedCardFiles.push(cardsFile);
        changedTFiles.push(this.tFiles[i]);
      }
    }
    this.cardsFiles = changedCardFiles;
    this.tFiles = changedTFiles;
  }

  async requests_1() {
    let requests: AnkiConnect.AnkiConnectRequest[] = [];
    let temp: AnkiConnect.AnkiConnectRequest[] = [];
    console.info("Requesting addition of notes into Anki...");
    for (let file of this.cardsFiles) {
      temp.push(file.getAddNotes());
    }
    requests.push(AnkiConnect.multi(temp));
    temp = [];
    console.info("Requesting card IDs of notes to be edited...");
    for (let file of this.cardsFiles) {
      temp.push(file.getNoteInfo());
    }
    requests.push(AnkiConnect.multi(temp));
    temp = [];
    console.info("Requesting tag list...");
    requests.push(AnkiConnect.getTags());
    console.info("Requesting update of fields of existing notes");
    for (let file of this.cardsFiles) {
      temp.push(file.getUpdateFields());
    }
    requests.push(AnkiConnect.multi(temp));
    temp = [];
    console.info("Requesting deletion of notes..");
    for (let file of this.cardsFiles) {
      temp.push(file.getDeleteNotes());
    }
    requests.push(AnkiConnect.multi(temp));
    temp = [];
    console.info("Requesting addition of media...");
    for (let file of this.cardsFiles) {
      const mediaLinks = difference(
        file.formatter.detectedMedia,
        this.addedAttachmentLinkByGeneratedId
      );
      for (let mediaLink of mediaLinks) {
        console.log("Adding media file: ", mediaLink);
        const dataFile = this.app.metadataCache.getFirstLinkpathDest(
          mediaLink,
          file.path
        );
        if (!dataFile) {
          console.warn("Couldn't locate media file ", mediaLink);
        } else {
          // Located successfully, so treat as if we've added the media
          this.addedAttachmentLinkByGeneratedId.add(mediaLink);
          const realPath = (
            this.app.vault.adapter as FileSystemAdapter
          ).getFullPath(dataFile.path);
          temp.push(
            AnkiConnect.storeMediaFileByPath(basename(mediaLink), realPath)
          );
        }
      }
    }
    requests.push(AnkiConnect.multi(temp));
    temp = [];
    this.requests_1_result = await AnkiConnect.invoke("multi", {
      actions: requests,
    });
    await this.parse_requests_1();
  }

  async createAttachmentsForMochiCards() {
    for (let cardsFile of this.cardsFiles) {
      for (const mochiCard of [
        ...cardsFile.mochiCardsToEdit,
        ...cardsFile.allTypeMochiCardsToAdd,
      ]) {
        const toAddAttachmentLinksById: Record<string,string> = findAttachmentLinksToAdd(
          mochiCard.runtimeProps.attachmentLinkByGeneratedId,
          this.addedAttachmentLinkByGeneratedId
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
            debug({ mochiCardAttachments: mochiCard.attachments });

            this.addedAttachmentLinkByGeneratedId[attachmentLink] = toAddAttachmentLinksById[attachmentLink];
          }
        }
      }
    }
  }

  async parse_requests_1() {
    const response = this.requests_1_result as Requests1Result;
    if (response[5].result.length >= 1 && response[5].result[0].error != null) {
      new Notice(
        "Please update AnkiConnect! The way the script has added media files has changed."
      );
      console.warn(
        "Please update AnkiConnect! The way the script has added media files has changed."
      );
    }
    let note_ids_array_by_file: Requests1Result[0]["result"];
    try {
      note_ids_array_by_file = AnkiConnect.parse(response[0]);
    } catch (error) {
      console.error("Error: ", error);
      note_ids_array_by_file = response[0].result;
    }
    const note_info_array_by_file = AnkiConnect.parse(response[1]);
    const ankiTags: string[] = AnkiConnect.parse(response[2]);
    for (let index in note_ids_array_by_file) {
      let i: number = parseInt(index);
      let file = this.cardsFiles[i];
      let file_response: addNoteResponse[];
      try {
        file_response = AnkiConnect.parse(note_ids_array_by_file[i]);
      } catch (error) {
        console.error("Error: ", error);
        file_response = note_ids_array_by_file[i].result;
      }
      file.mochiCardIds = [];
      for (let index in file_response) {
        let i = parseInt(index);
        let response = file_response[i];
        try {
          file.mochiCardIds.push(AnkiConnect.parse(response));
        } catch (error) {
          console.warn(
            "Failed to add note ",
            file.allTypeMochiCardsToAdd[i],
            " in file",
            file.path,
            " due to error ",
            error
          );
          file.mochiCardIds.push(response.result);
        }
      }
    }
    for (let index in note_info_array_by_file) {
      let i: number = parseInt(index);
      let file = this.cardsFiles[i];
      const file_response = AnkiConnect.parse(note_info_array_by_file[i]);
      let temp: number[] = [];
      for (let note_response of file_response) {
        temp.push(...note_response.cards);
      }
      file.cardIds = temp;
    }
    for (let index in this.cardsFiles) {
      let i: number = parseInt(index);
      let cardsFile = this.cardsFiles[i];
      let tFile = this.tFiles[i];
      cardsFile.ankiTags = ankiTags;
      cardsFile.writeIDs();
      cardsFile.performDelete();
      if (cardsFile.contents !== cardsFile.originalContents) {
        await this.app.vault.modify(tFile, cardsFile.contents);
      }
    }
    await this.requests_2();
  }

  getHashes(): Record<string, string> {
    let result: Record<string, string> = {};
    for (let file of this.cardsFiles) {
      result[file.path] = file.getHash();
    }
    return result;
  }

  async requests_2(): Promise<void> {
    let requests: AnkiConnect.AnkiConnectRequest[] = [];
    let temp: AnkiConnect.AnkiConnectRequest[] = [];
    console.info("Requesting cards to be moved to target deck...");
    for (let file of this.cardsFiles) {
      temp.push(file.getChangeDecks());
    }
    requests.push(AnkiConnect.multi(temp));
    temp = [];
    console.info("Requesting tags to be replaced...");
    for (let file of this.cardsFiles) {
      temp.push(file.getClearTags());
    }
    requests.push(AnkiConnect.multi(temp));
    temp = [];
    for (let file of this.cardsFiles) {
      temp.push(file.getAddTags());
    }
    requests.push(AnkiConnect.multi(temp));
    temp = [];
    await AnkiConnect.invoke("multi", { actions: requests });
    console.info("All done!");
  }
}
