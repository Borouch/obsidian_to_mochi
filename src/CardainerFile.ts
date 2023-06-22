/*Performing plugin operations on markdown file contents*/

import {FROZEN_FIELDS_DICT} from './interfaces/IField'
import {BeginEndCard, CLOZE_ERROR, ID_REGEXP_STR, NOTE_TYPE_ERROR, TAG_REGEXP_STR, TAG_SEP} from './models/BeginEndCard'
import * as c from './Constants'
import {FormatConverter} from './utils/FormatConverter'
import {CachedMetadata, HeadingCache} from 'obsidian'
import {CardainerFileSettingsData} from "@src/interfaces/ISettings";
import {RegexCard} from "@src/models/RegexCard";
import {debug} from "@src/utils/Logger";
import {ArrayUtil} from "@src/utils/ArrayUtil";
import {MochiCard} from "@src/models/MochiCard";
import {InlineCard} from "@src/models/InlineCard";

const double_regexp: RegExp = /(?:\r\n|\r|\n)((?:\r\n|\r|\n)(?:<!--)?ID: \d+)/g

function mochiCardIdToCardIdentifierToken(identifier: string, inline: boolean = false, comment: boolean = false): string {
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

function containedInSpan(span: [number, number], spans: Array<[number, number]>): boolean {
    /*Return whether span is contained in spans (+- 1 leeway)*/
    return spans.some(
        (element) => span[0] >= element[0] - 1 && span[1] <= element[1] + 1
    )
}

function* findMatchNotIgnored(pattern: RegExp, text: string, ignore_spans: Array<[number, number]>): IterableIterator<RegExpMatchArray> {
    let matches = text.matchAll(pattern)
    debugger
    for (let match of matches) {
        const matchSpan: [number, number] = [match.index, match.index + match[0].length]
        if (!(containedInSpan(matchSpan, ignore_spans))) {
            yield match
        }
    }
}

abstract class AbstractCardainerFile {
    contents: string
    path: string
    url: string
    originalContents: string
    settingsData: CardainerFileSettingsData
    tFileCache: CachedMetadata

    frozenFieldDict: FROZEN_FIELDS_DICT
    targetDeckName: string
    globalTags: string

    mochiCardsToAdd: MochiCard[] = []
    mochiCardsToEdit: MochiCard[] = []
    mochiCardIdsToDelete: string[]

    idIndexes: number[]
    allTypeMochiCardsToAdd: MochiCard[] = []
    allMochiCards: MochiCard[] = []
    mochiCardIds: Array<string | null> = []
    cardIds: number[]
    ankiTags: string[]

    formatter: FormatConverter

    constructor(file_contents: string, path: string, url: string, data: CardainerFileSettingsData, file_cache: CachedMetadata) {
        this.settingsData = data
        this.contents = file_contents
        this.path = path
        this.url = url
        this.originalContents = this.contents
        this.tFileCache = file_cache
        this.formatter = new FormatConverter(file_cache, this.settingsData.vaultName)
    }

    setup_frozen_fields_dict() {
        let frozen_fields_dict: FROZEN_FIELDS_DICT = {}
        for (let note_type in this.settingsData.fieldsByTemplateName) {
            let fields: string[] = this.settingsData.fieldsByTemplateName[note_type]
            let temp_dict: Record<string, string> = {}
            for (let field of fields) {
                temp_dict[field] = ""
            }
            frozen_fields_dict[note_type] = temp_dict
        }
        for (let match of this.contents.matchAll(this.settingsData.FROZEN_REGEXP)) {
            const [note_type, fields]: [string, string] = [match[1], match[2]]
            const virtual_note = note_type + "\n" + fields
            const beginEndCard: Record<string, string> = new BeginEndCard(
                virtual_note, this.settingsData.fieldsByTemplateName,
                this.settingsData.isCurlyCloze,
                this.settingsData.isHighlightsToCloze,
                this.formatter
            ).getCardFieldContentByFieldNameDict()
            frozen_fields_dict[note_type] = beginEndCard
        }
        this.frozenFieldDict = frozen_fields_dict
    }

    setup_target_deck() {
        const result = this.contents.match(this.settingsData.DECK_REGEXP)
        this.targetDeckName = result ? result[1] : this.settingsData.defaultDeckName
    }

    setup_global_tags() {
        const result = this.contents.match(this.settingsData.TAG_REGEXP)
        this.globalTags = result ? result[1] : ""
    }

    abstract scanFileForCardsCRUD(): void

    scanCardDeletions() {
        for (let match of this.contents.matchAll(this.settingsData.DELETE_REGEXP)) {
            const mochiCardId = match[1]
            this.mochiCardIdsToDelete.push(mochiCardId)
            ArrayUtil.removeArrayItem(
                mochiCardId, this.mochiCardsToEdit,
                (mochiCard: MochiCard, id: string) => id === mochiCard.id)
        }

    }

    getContextBreadcrumbAtIndex(position: number): string {
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
        this.contents = this.contents.replace(this.settingsData.DELETE_REGEXP, "")
    }

}

export class CardainerFile extends AbstractCardainerFile {
    ignoreSpans: [number, number][]
    customCardTypeRegexps: Record<string, string>
    inlineCardsToAdd: MochiCard[]
    inlineIdIndexes: number[]
    regexCardsToAdd: MochiCard[]
    regexIdIndexes: number[]

    constructor(file_contents: string, path: string, url: string, data: CardainerFileSettingsData, cacheData: CachedMetadata) {
        super(file_contents, path, url, data, cacheData)
        this.customCardTypeRegexps = data.customRegexps
    }

    add_spans_to_ignore() {
        this.ignoreSpans = []
        this.ignoreSpans.push(...spans(this.settingsData.FROZEN_REGEXP, this.contents))
        const deck_result = this.contents.match(this.settingsData.DECK_REGEXP)
        if (deck_result) {
            this.ignoreSpans.push([deck_result.index, deck_result.index + deck_result[0].length])
        }
        const tag_result = this.contents.match(this.settingsData.TAG_REGEXP)
        if (tag_result) {
            this.ignoreSpans.push([tag_result.index, tag_result.index + tag_result[0].length])
        }
        this.ignoreSpans.push(...spans(this.settingsData.BEGIN_END_CARD, this.contents))
        this.ignoreSpans.push(...spans(this.settingsData.INLINE_REGEXP, this.contents))
        this.ignoreSpans.push(...spans(c.OBS_INLINE_MATH_REGEXP, this.contents))
        this.ignoreSpans.push(...spans(c.OBS_DISPLAY_MATH_REGEXP, this.contents))
        this.ignoreSpans.push(...spans(c.OBS_CODE_REGEXP, this.contents))
        this.ignoreSpans.push(...spans(c.OBS_DISPLAY_CODE_REGEXP, this.contents))
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


    scanBeginEndCards() {
        for (let card_match of this.contents.matchAll(this.settingsData.BEGIN_END_CARD)) {
            // That second thing essentially gets the index of the end of the first capture group.
            let [cardContent, position]: [string, number] = [card_match[1], card_match.index + card_match[0].indexOf(card_match[1]) + card_match[1].length]
            let mochiCard: MochiCard | null = new BeginEndCard(
                cardContent,this.settingsData.fieldsByTemplateName,
                this.settingsData.isCurlyCloze,
                this.settingsData.isHighlightsToCloze,
                this.formatter
            ).parseToMochiCard(
                this.targetDeckName,
                this.url,
                this.frozenFieldDict,
                this.settingsData,
                this.settingsData.addContextBreadcrumb ? this.getContextBreadcrumbAtIndex(card_match.index) : ""
            )
            if (!mochiCard) {
                continue
            }
            if (mochiCard.id == null) {
                // Need to make sure global_tags get added
                mochiCard.tags.push(...this.globalTags.split(TAG_SEP))
                this.mochiCardsToAdd.push(mochiCard)
                this.idIndexes.push(position)
            } else if (!this.settingsData.existingMochiCardIds.includes(mochiCard.id)) {
                if (mochiCard.id == CLOZE_ERROR) {
                    continue
                }
                // Need to show an error otherwise
                else if (mochiCard.id == NOTE_TYPE_ERROR) {
                    console.warn("Did not recognise note type ", mochiCard.template.name, " in file ", this.path)
                } else {
                    console.warn("Note with id", mochiCard.id, " in file ", this.path, " does not exist in Anki!")
                }
            } else if (mochiCard.runtimeProps.originalHash !== mochiCard.runtimeProps.currentHash) {
                this.mochiCardsToEdit.push(mochiCard)
            }
        }
    }

    scanInlineCards() {
        for (let note_match of this.contents.matchAll(this.settingsData.INLINE_REGEXP)) {
            let [note, position]: [string, number] = [note_match[1], note_match.index + note_match[0].indexOf(note_match[1]) + note_match[1].length]
            // That second thing essentially gets the index of the end of the first capture group.
            let mochiCard: MochiCard | null = new InlineCard(
                note, this.settingsData.fieldsByTemplateName,
                this.settingsData.isCurlyCloze,
                this.settingsData.isHighlightsToCloze,
                this.formatter
            ).parseToMochiCard(
                this.targetDeckName,
                this.url,
                this.frozenFieldDict,
                this.settingsData,
                this.settingsData.addContextBreadcrumb ? this.getContextBreadcrumbAtIndex(note_match.index) : ""
            )
            if (!mochiCard) {
                continue
            }
            if (mochiCard.id == null) {
                // Need to make sure global_tags get added
                mochiCard.tags.push(...this.globalTags.split(TAG_SEP))
                this.inlineCardsToAdd.push(mochiCard)
                this.inlineIdIndexes.push(position)
            } else if (!this.settingsData.existingMochiCardIds.includes(mochiCard.id)) {
                // Need to show an error
                if (mochiCard.id == CLOZE_ERROR) {
                    continue
                }
                console.warn("Note with id", mochiCard.id, " in file ", this.path, " does not exist in Anki!")
            } else {
                this.mochiCardsToEdit.push(mochiCard)
            }
        }
    }

    searchContentRegexpMatchCards(cardTemplateName: string, regexp_str: string) {
        //Search the file for regex matches
        //ignoring matches inside ignore_spans,
        //and adding any matches to ignore_spans.

        for (let search_id of [true, false]) {
            for (let search_tags of [true, false]) {
                let id_str = search_id ? ID_REGEXP_STR : ""
                let tag_str = search_tags ? TAG_REGEXP_STR : ""
                let regexp: RegExp = new RegExp(regexp_str + tag_str + id_str, 'gm')
                for (let match of findMatchNotIgnored(regexp, this.contents, this.ignoreSpans)) {
                    this.ignoreSpans.push([match.index, match.index + match[0].length])
                    const mochiCard: MochiCard | null = new RegexCard(
                        match, cardTemplateName, this.settingsData.fieldsByTemplateName,
                        search_tags, search_id, this.settingsData.isCurlyCloze, this.settingsData.isHighlightsToCloze, this.formatter
                    ).parseToMochiCard(
                        this.targetDeckName,
                        this.url,
                        this.frozenFieldDict,
                        this.settingsData,
                        this.settingsData.addContextBreadcrumb ? this.getContextBreadcrumbAtIndex(match.index) : ""
                    )
                    if (!mochiCard) {
                        break;
                    }
                    debugger
                    if (search_id) {
                        if (!(this.settingsData.existingMochiCardIds.includes(mochiCard.id))) {
                            if (mochiCard.id == CLOZE_ERROR) {
                                // This means it wasn't actually a card! So we should remove it from ignore_spans
                                this.ignoreSpans.pop()
                                continue
                            }
                            console.warn("Note with id", mochiCard.id, " in file ", this.path, " does not exist in Anki!")
                        } else if (mochiCard.runtimeProps.originalHash !== mochiCard.runtimeProps.currentHash) {
                            this.mochiCardsToEdit.push(mochiCard)
                        }
                    } else {
                        if (mochiCard.id == CLOZE_ERROR) {
                            // This means it wasn't actually a card! So we should remove it from ignore_spans
                            this.ignoreSpans.pop()
                            continue
                        }
                        mochiCard.tags.push(...this.globalTags.split(TAG_SEP))
                        this.regexCardsToAdd.push(mochiCard)
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
        this.scanBeginEndCards()
        this.scanInlineCards()
        for (let cardTemplateName in this.customCardTypeRegexps) {
            const regexp_str: string = this.customCardTypeRegexps[cardTemplateName]
            if (regexp_str) {

                this.searchContentRegexpMatchCards(cardTemplateName, regexp_str)
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
                    normal_inserts.push([id_position, mochiCardIdToCardIdentifierToken(identifier, false, this.settingsData.comment)])
                }
            }
        )
        let inline_inserts: [number, string][] = []
        this.inlineIdIndexes.forEach(
            (id_position: number, index: number) => {
                const identifier: string | null = this.mochiCardIds[index + this.mochiCardsToAdd.length] //Since regular then inline
                if (identifier) {
                    inline_inserts.push([id_position, mochiCardIdToCardIdentifierToken(identifier, true, this.settingsData.comment)])
                }
            }
        )

        let regex_inserts: [number, string][] = []
        this.regexIdIndexes.forEach(
            (id_position: number, index: number) => {
                const identifier: string | null = this.mochiCardIds[index + this.mochiCardsToAdd.length + this.inlineCardsToAdd.length] // Since regular then inline then regex
                if (identifier) {
                    regex_inserts.push([id_position, "\n" + mochiCardIdToCardIdentifierToken(identifier, false, this.settingsData.comment)])
                }
            }
        )

        this.contents = string_insert(this.contents, normal_inserts.concat(inline_inserts).concat(regex_inserts))
        this.fixNewLineIds()
    }
}
