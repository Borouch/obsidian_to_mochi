/*Performing plugin operations on markdown file contents*/

import {FROZEN_FIELDS_DICT} from './interfaces/IField'
import {AnkiConnectNote, AnkiConnectNoteAndID} from './interfaces/IAnkiConnectNote'
import {BaseCard, CLOZE_ERROR, ID_REGEXP_STR, NOTE_TYPE_ERROR, TAG_REGEXP_STR, TAG_SEP} from './models/BaseCard'
import {Md5} from 'ts-md5/dist/md5';
import * as AnkiConnect from './anki'
import * as c from './Constants'
import {FormatConverter} from './format'
import {CachedMetadata, HeadingCache} from 'obsidian'
import {CardsFileSettingsData} from "@src/interfaces/ISettings";
import {RegexCard} from "@src/models/RegexCard";
import {InlineCard} from "@src/modeI/InlineCard.ts";
import {debug} from "@src/utils/Logger";
import {ArrayUtil} from "@src/utils/ArrayUtil";

const double_regexp: RegExp = /(?:\r\n|\r|\n)((?:\r\n|\r|\n)(?:<!--)?ID: \d+)/g

function id_to_str(identifier: number, inline: boolean = false, comment: boolean = false): string {
    let result = "ID: " + identifier.toString()
    if (comment) {
        result = "<!--" + result + "-->"
    }
    if (inline) {
        result += " "
    } else {
        result += "\n"
    }
    return result
}

function string_insert(text: string, position_inserts: Array<[number, string]>): string {
    /*Insert strings in position_inserts into text, at indices.

    position_inserts will look like:
    [(0, "hi"), (3, "hello"), (5, "beep")]*/
    let offset = 0
    let sorted_inserts: Array<[number, string]> = position_inserts.sort((a, b): number => a[0] - b[0])
    for (let insertion of sorted_inserts) {
        let position = insertion[0]
        let insert_str = insertion[1]
        text = text.slice(0, position + offset) + insert_str + text.slice(position + offset)
        offset += insert_str.length
    }
    return text
}

function spans(pattern: RegExp, text: string): Array<[number, number]> {
    /*Return a list of span-tuples for matches of pattern in text.*/
    let output: Array<[number, number]> = []
    let matches = text.matchAll(pattern)
    for (let match of matches) {
        output.push(
            [match.index, match.index + match[0].length]
        )
    }
    return output
}

function contained_in(span: [number, number], spans: Array<[number, number]>): boolean {
    /*Return whether span is contained in spans (+- 1 leeway)*/
    return spans.some(
        (element) => span[0] >= element[0] - 1 && span[1] <= element[1] + 1
    )
}

function* findMatchNotIgnored(pattern: RegExp, text: string, ignore_spans: Array<[number, number]>): IterableIterator<RegExpMatchArray> {
    let matches = text.matchAll(pattern)
    for (let match of matches) {
        const matchSpan: [number, number] = [match.index, match.index + match[0].length]
        if (!(contained_in(matchSpan, ignore_spans))) {
            yield match
        }
    }
}

abstract class AbstractCardsFile {
    contents: string
    path: string
    url: string
    originalContents: string
    data: CardsFileSettingsData
    tFileCache: CachedMetadata

    frozenFieldDict: FROZEN_FIELDS_DICT
    targetDeckName: string
    globalTags: string

    mochiCardsToAdd: AnkiConnectNote[]
    mochiCardsToEdit: AnkiConnectNoteAndID[]
    mochiCardIdsToDelete: string[]

    idIndexes: number[]
    allTypeMochiCardsToAdd: AnkiConnectNote[]

    mochiCardIds: Array<string | null> = []
    cardIds: number[]
    ankiTags: string[]

    formatter: FormatConverter

    constructor(file_contents: string, path: string, url: string, data: CardsFileSettingsData, file_cache: CachedMetadata) {
        this.data = data
        this.contents = file_contents
        this.path = path
        this.url = url
        this.originalContents = this.contents
        this.tFileCache = file_cache
        this.formatter = new FormatConverter(file_cache, this.data.vault_name)
    }

    setup_frozen_fields_dict() {
        let frozen_fields_dict: FROZEN_FIELDS_DICT = {}
        for (let note_type in this.data.fields_dict) {
            let fields: string[] = this.data.fields_dict[note_type]
            let temp_dict: Record<string, string> = {}
            for (let field of fields) {
                temp_dict[field] = ""
            }
            frozen_fields_dict[note_type] = temp_dict
        }
        for (let match of this.contents.matchAll(this.data.FROZEN_REGEXP)) {
            const [note_type, fields]: [string, string] = [match[1], match[2]]
            const virtual_note = note_type + "\n" + fields
            const parsed_fields: Record<string, string> = new BaseCard(
                virtual_note,
                this.data.fields_dict,
                this.data.curly_cloze,
                this.data.highlights_to_cloze,
                this.formatter
            ).getFields()
            frozen_fields_dict[note_type] = parsed_fields
        }
        this.frozenFieldDict = frozen_fields_dict
    }

    setup_target_deck() {
        const result = this.contents.match(this.data.DECK_REGEXP)
        this.targetDeckName = result ? result[1] : this.data.template["deckName"]
    }

    setup_global_tags() {
        const result = this.contents.match(this.data.TAG_REGEXP)
        this.globalTags = result ? result[1] : ""
    }

    getHash(): string {
        return Md5.hashStr(this.contents) as string
    }

    abstract scanFileForCardsCRUD(): void

    scanCardDeletions() {
        for (let match of this.contents.matchAll(this.data.DELETE_REGEXP)) {
            const mochiCardId = match[1]
            this.mochiCardIdsToDelete.push(mochiCardId)
            ArrayUtil.removeArrayItem(
                mochiCardId, this.mochiCardsToEdit,
                (mochiCard: AnkiConnectNoteAndID, id: string) => id === mochiCard.identifier)
        }

    }

    getContextAtIndex(position: number): string {
        let result: string = this.path
        let currentContext: HeadingCache[] = []
        if (!(this.tFileCache.hasOwnProperty('headings'))) {
            return result
        }
        for (let currentHeading of this.tFileCache.headings) {
            if (position < currentHeading.position.start.offset) {
                //We've gone past position now with headings, so let's return!
                break
            }
            let insert_index: number = 0
            for (let contextHeading of currentContext) {
                if (currentHeading.level > contextHeading.level) {
                    insert_index += 1
                    continue
                }
                break
            }
            currentContext = currentContext.slice(0, insert_index)
            currentContext.push(currentHeading)
        }
        let heading_strs: string[] = []
        for (let contextHeading of currentContext) {
            heading_strs.push(contextHeading.heading)
        }
        let result_arr: string[] = [result]
        result_arr.push(...heading_strs)
        return result_arr.join(" > ")
    }

    abstract writeIDs(): void

    performDelete() {
        this.contents = this.contents.replace(this.data.DELETE_REGEXP, "")
    }

    getAddNotes(): AnkiConnect.AnkiConnectRequest {
        let actions: AnkiConnect.AnkiConnectRequest[] = []
        for (let note of this.allTypeMochiCardsToAdd) {
            actions.push(AnkiConnect.addNote(note))
        }
        return AnkiConnect.multi(actions)
    }

    getDeleteNotes(): AnkiConnect.AnkiConnectRequest {
        return AnkiConnect.deleteNotes(this.mochiCardIdsToDelete)
    }

    getUpdateFields(): AnkiConnect.AnkiConnectRequest {
        let actions: AnkiConnect.AnkiConnectRequest[] = []
        for (let parsed of this.mochiCardsToEdit) {
            actions.push(
                AnkiConnect.updateNoteFields(
                    parsed.identifier, parsed.ankiNote.fields
                )
            )
        }
        return AnkiConnect.multi(actions)
    }

    getNoteInfo(): AnkiConnect.AnkiConnectRequest {
        let IDs: number[] = []
        for (let parsed of this.mochiCardsToEdit) {
            IDs.push(parsed.identifier)
        }
        return AnkiConnect.notesInfo(IDs)
    }

    getChangeDecks(): AnkiConnect.AnkiConnectRequest {
        return AnkiConnect.changeDeck(this.cardIds, this.targetDeckName)
    }

    getClearTags(): AnkiConnect.AnkiConnectRequest {
        let IDs: number[] = []
        for (let parsed of this.mochiCardsToEdit) {
            IDs.push(parsed.identifier)
        }
        return AnkiConnect.removeTags(IDs, this.ankiTags.join(" "))
    }

    getAddTags(): AnkiConnect.AnkiConnectRequest {
        let actions: AnkiConnect.AnkiConnectRequest[] = []
        for (let parsed of this.mochiCardsToEdit) {
            actions.push(
                AnkiConnect.addTags([parsed.identifier], parsed.ankiNote.tags.join(" ") + " " + this.globalTags)
            )
        }
        return AnkiConnect.multi(actions)
    }

}

export class CardsFile extends AbstractCardsFile {
    ignore_spans: [number, number][]
    custom_note_type_regexps: Record<string, string>
    inlineCardsToAdd: AnkiConnectNote[]
    inlineIdIndexes: number[]
    regexCardsToAdd: AnkiConnectNote[]
    regexIdIndexes: number[]

    constructor(file_contents: string, path: string, url: string, data: CardsFileSettingsData, file_cache: CachedMetadata) {
        super(file_contents, path, url, data, file_cache)
        this.custom_note_type_regexps = data.custom_regexps
    }

    add_spans_to_ignore() {
        this.ignore_spans = []
        this.ignore_spans.push(...spans(this.data.FROZEN_REGEXP, this.contents))
        const deck_result = this.contents.match(this.data.DECK_REGEXP)
        if (deck_result) {
            this.ignore_spans.push([deck_result.index, deck_result.index + deck_result[0].length])
        }
        const tag_result = this.contents.match(this.data.TAG_REGEXP)
        if (tag_result) {
            this.ignore_spans.push([tag_result.index, tag_result.index + tag_result[0].length])
        }
        this.ignore_spans.push(...spans(this.data.CARD_REGEXP, this.contents))
        this.ignore_spans.push(...spans(this.data.INLINE_REGEXP, this.contents))
        this.ignore_spans.push(...spans(c.OBS_INLINE_MATH_REGEXP, this.contents))
        this.ignore_spans.push(...spans(c.OBS_DISPLAY_MATH_REGEXP, this.contents))
        this.ignore_spans.push(...spans(c.OBS_CODE_REGEXP, this.contents))
        this.ignore_spans.push(...spans(c.OBS_DISPLAY_CODE_REGEXP, this.contents))
    }

    setupScan() {
        this.setup_frozen_fields_dict()
        this.setup_target_deck()
        this.setup_global_tags()
        this.add_spans_to_ignore()
        this.mochiCardsToAdd = []
        this.inlineCardsToAdd = []
        this.regexCardsToAdd = []
        this.idIndexes = []
        this.inlineIdIndexes = []
        this.regexIdIndexes = []
        this.mochiCardsToEdit = []
        this.mochiCardIdsToDelete = []
    }

    /*
    * 1. Parses file content to AnkiConnectNoteAndId
    * 2. Determines if it needs to be added or edited to anki notes
    * */
    scanCards() {
        for (let card_match of this.contents.matchAll(this.data.CARD_REGEXP)) {
            // That second thing essentially gets the index of the end of the first capture group.
            let [cardContent, position]: [string, number] = [card_match[1], card_match.index + card_match[0].indexOf(card_match[1]) + card_match[1].length]
            let parsed: AnkiConnectNoteAndID = new BaseCard(
                cardContent,
                this.data.fields_dict,
                this.data.curly_cloze,
                this.data.highlights_to_cloze,
                this.formatter
            ).parseToAnkiConnectNote(
                this.targetDeckName,
                this.url,
                this.frozenFieldDict,
                this.data,
                this.data.add_context ? this.getContextAtIndex(card_match.index) : ""
            )
            const doesNotHaveIdWrittenInCard = parsed.identifier == null

            if (doesNotHaveIdWrittenInCard) {
                // Need to make sure global_tags get added
                parsed.ankiNote.tags.push(...this.globalTags.split(TAG_SEP))
                this.mochiCardsToAdd.push(parsed.ankiNote)
                this.idIndexes.push(position)
            } else if (!this.data.EXISTING_MOCHI_CARD_IDS.includes(parsed.identifier)) {
                if (parsed.identifier == CLOZE_ERROR) {
                    continue
                }
                // Need to show an error otherwise
                else if (parsed.identifier == NOTE_TYPE_ERROR) {
                    console.warn("Did not recognise note type ", parsed.ankiNote.modelName, " in file ", this.path)
                } else {
                    console.warn("Note with id", parsed.identifier, " in file ", this.path, " does not exist in Anki!")
                }
            } else {
                this.mochiCardsToEdit.push(parsed)
            }
        }
    }

    scanInlineCards() {
        for (let note_match of this.contents.matchAll(this.data.INLINE_REGEXP)) {
            let [note, position]: [string, number] = [note_match[1], note_match.index + note_match[0].indexOf(note_match[1]) + note_match[1].length]
            // That second thing essentially gets the index of the end of the first capture group.
            let parsed = new InlineCard(
                note,
                this.data.fields_dict,
                this.data.curly_cloze,
                this.data.highlights_to_cloze,
                this.formatter
            ).parseToAnkiConnectNote(
                this.targetDeckName,
                this.url,
                this.frozenFieldDict,
                this.data,
                this.data.add_context ? this.getContextAtIndex(note_match.index) : ""
            )
            if (parsed.identifier == null) {
                // Need to make sure global_tags get added
                parsed.ankiNote.tags.push(...this.globalTags.split(TAG_SEP))
                this.inlineCardsToAdd.push(parsed.ankiNote)
                this.inlineIdIndexes.push(position)
            } else if (!this.data.EXISTING_MOCHI_CARD_IDS.includes(parsed.identifier)) {
                // Need to show an error
                if (parsed.identifier == CLOZE_ERROR) {
                    continue
                }
                console.warn("Note with id", parsed.identifier, " in file ", this.path, " does not exist in Anki!")
            } else {
                this.mochiCardsToEdit.push(parsed)
            }
        }
    }

    searchContentRegexpMatch(note_type: string, regexp_str: string) {
        //Search the file for regex matches
        //ignoring matches inside ignore_spans,
        //and adding any matches to ignore_spans.

        for (let search_id of [true, false]) {
            debug({search_id})
            for (let search_tags of [true, false]) {
                let id_str = search_id ? ID_REGEXP_STR : ""
                let tag_str = search_tags ? TAG_REGEXP_STR : ""
                let regexp: RegExp = new RegExp(regexp_str + tag_str + id_str, 'gm')
                for (let match of findMatchNotIgnored(regexp, this.contents, this.ignore_spans)) {
                    this.ignore_spans.push([match.index, match.index + match[0].length])
                    const parsed: AnkiConnectNoteAndID = new RegexCard(
                        match, note_type, this.data.fields_dict,
                        search_tags, search_id, this.data.curly_cloze, this.data.highlights_to_cloze, this.formatter
                    ).parseToAnkiConnectNote(
                        this.targetDeckName,
                        this.url,
                        this.frozenFieldDict,
                        this.data,
                        this.data.add_context ? this.getContextAtIndex(match.index) : ""
                    )

                    if (search_id) {
                        if (!(this.data.EXISTING_MOCHI_CARD_IDS.includes(parsed.identifier))) {
                            if (parsed.identifier == CLOZE_ERROR) {
                                // This means it wasn't actually a card! So we should remove it from ignore_spans
                                this.ignore_spans.pop()
                                continue
                            }
                            console.warn("Note with id", parsed.identifier, " in file ", this.path, " does not exist in Anki!")
                        } else {
                            this.mochiCardsToEdit.push(parsed)
                        }
                    } else {
                        if (parsed.identifier == CLOZE_ERROR) {
                            // This means it wasn't actually a card! So we should remove it from ignore_spans
                            this.ignore_spans.pop()
                            continue
                        }
                        parsed.ankiNote.tags.push(...this.globalTags.split(TAG_SEP))
                        this.regexCardsToAdd.push(parsed.ankiNote)
                        this.regexIdIndexes.push(match.index + match[0].length)
                    }
                }
            }
        }
    }

    /*
    * Figures out what cards need to be added, deleted, updated
    * */
    scanFileForCardsCRUD() {
        this.setupScan()
        this.scanCards()
        this.scanInlineCards()
        for (let note_type in this.custom_note_type_regexps) {
            const regexp_str: string = this.custom_note_type_regexps[note_type]
            if (regexp_str) {
                this.searchContentRegexpMatch(note_type, regexp_str)
            }
        }
        this.allTypeMochiCardsToAdd = this.mochiCardsToAdd.concat(this.inlineCardsToAdd).concat(this.regexCardsToAdd)
        this.scanCardDeletions()
    }

    fixNewLineIds() {
        this.contents = this.contents.replace(double_regexp, "$1")
    }

    writeIDs() {
        let normal_inserts: [number, string][] = []
        this.idIndexes.forEach(
            (id_position: number, index: number) => {
                const identifier: string | null = this.mochiCardIds[index]
                if (identifier) {
                    normal_inserts.push([id_position, id_to_str(identifier, false, this.data.comment)])
                }
            }
        )
        let inline_inserts: [number, string][] = []
        this.inlineIdIndexes.forEach(
            (id_position: number, index: number) => {
                const identifier: string | null = this.mochiCardIds[index + this.mochiCardsToAdd.length] //Since regular then inline
                if (identifier) {
                    inline_inserts.push([id_position, id_to_str(identifier, true, this.data.comment)])
                }
            }
        )

        let regex_inserts: [number, string][] = []
        this.regexIdIndexes.forEach(
            (id_position: number, index: number) => {
                const identifier: string | null = this.mochiCardIds[index + this.mochiCardsToAdd.length + this.inlineCardsToAdd.length] // Since regular then inline then regex
                if (identifier) {
                    regex_inserts.push([id_position, "\n" + id_to_str(identifier, false, this.data.comment)])
                }
            }
        )

        this.contents = string_insert(this.contents, normal_inserts.concat(inline_inserts).concat(regex_inserts))
        this.fixNewLineIds()
    }
}
