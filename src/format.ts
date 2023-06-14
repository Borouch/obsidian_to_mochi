import {basename, extname} from "path";
import {Converter} from "showdown";
import {CachedMetadata} from "obsidian";
import * as c from "./Constants";

import showdownHighlight from "showdown-highlight";
import {MochiCard} from "@src/models/MochiCard";
import {findMochiTemplateFieldIdByName} from "@src/models/MochiTemplate";

const ANKI_MATH_REGEXP: RegExp = /(\\\[[\s\S]*?\\\])|(\\\([\s\S]*?\\\))/g;
const HIGHLIGHT_REGEXP: RegExp = /==(.*?)==/g;

const MATH_REPLACE: string = "OBSTOANKIMATH";
const INLINE_CODE_REPLACE: string = "OBSTOANKICODEINLINE";
const DISPLAY_CODE_REPLACE: string = "OBSTOANKICODEDISPLAY";

const CLOZE_REGEXP: RegExp =
    /(?:(?<!{){(?:c?(\d+)[:|])?(?!{))((?:[^\n][\n]?)+?)(?:(?<!})}(?!}))/g;

const IMAGE_EXTS: string[] = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".svg",
    ".tiff",
];
const AUDIO_EXTS: string[] = [
    ".wav",
    ".m4a",
    ".flac",
    ".mp3",
    ".wma",
    ".aac",
    ".webm",
];

const PARA_OPEN: string = "<p>";
const PARA_CLOSE: string = "</p>";

let cloze_unset_num: number = 1;

let converter: Converter = new Converter({
    simplifiedAutoLink: true,
    literalMidWordUnderscores: true,
    tables: true,
    tasklists: true,
    simpleLineBreaks: true,
    requireSpaceBeforeHeadingText: true,
    extensions: [showdownHighlight],
});

function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export class FormatConverter {
    file_cache: CachedMetadata;
    vault_name: string;
    detectedMedia: Set<string>;

    constructor(file_cache: CachedMetadata, vault_name: string) {
        this.vault_name = vault_name;
        this.file_cache = file_cache;
        this.detectedMedia = new Set();
    }

    getUrlFromLink(link: string): string {
        return (
            "obsidian://open?vault=" +
            encodeURIComponent(this.vault_name) +
            String.raw`&file=` +
            encodeURIComponent(link)
        );
    }

    appendFileSourceLinkToMochiCardField(
        mochiCard: MochiCard,
        url: string,
        fileLinkFieldId: string
    ): void {
        mochiCard.fieldById[fileLinkFieldId].value +=
            '<br><a href="' + url + '" class="obsidian-link">Obsidian</a>';
    }

    appendFrozenFieldToMochiCardField(
        mochiCard: MochiCard,
        frozen_fields_dict: Record<string, Record<string, string>>
    ): void {
        for (let fieldId in mochiCard.fieldById) {
            const fieldName = mochiCard.template.fields[fieldId].name
            mochiCard.fieldById[fieldId].value +=
                frozen_fields_dict[mochiCard.template.name][fieldName];
        }
    }

    appendContextFieldToMochiCardField(
        mochiCard: MochiCard,
        context: string,
        contextFieldNameByCardTemplateName: Record<string, string>
    ) {
        const contextFieldName = contextFieldNameByCardTemplateName[mochiCard.template.name]
        const fieldId = findMochiTemplateFieldIdByName(contextFieldName, mochiCard.template)
        mochiCard.fieldById[fieldId].value += context
    }

    obsidian_to_anki_math(cardText: string): string {
        return cardText
            .replace(c.OBS_DISPLAY_MATH_REGEXP, "\\[$1\\]")
            .replace(c.OBS_INLINE_MATH_REGEXP, "\\($1\\)");
    }

    cloze_repl(_1: string, match_id: string, match_content: string): string {
        if (match_id == undefined) {
            let result =
                "{{c" + cloze_unset_num.toString() + "::" + match_content + "}}";
            cloze_unset_num += 1;
            return result;
        }
        let result = "{{c" + match_id + "::" + match_content + "}}";
        return result;
    }

    curly_to_cloze(text: string): string {
        /*Change text in curly brackets to Anki-formatted cloze.*/
        text = text.replace(CLOZE_REGEXP, this.cloze_repl);
        cloze_unset_num = 1;
        return text;
    }

    getAndFormatMedias(note_text: string): string {
        if (!this.file_cache.hasOwnProperty("embeds")) {
            return note_text;
        }
        for (let embed of this.file_cache.embeds) {
            if (note_text.includes(embed.original)) {
                this.detectedMedia.add(embed.link);
                if (AUDIO_EXTS.includes(extname(embed.link))) {
                    note_text = note_text.replace(
                        new RegExp(c.escapeRegex(embed.original), "g"),
                        "[sound:" + basename(embed.link) + "]"
                    );
                } else if (IMAGE_EXTS.includes(extname(embed.link))) {
                    note_text = note_text.replace(
                        new RegExp(c.escapeRegex(embed.original), "g"),
                        '<img src="' +
                        basename(embed.link) +
                        '" alt="' +
                        embed.displayText +
                        '">'
                    );
                } else {
                    console.warn("Unsupported extension: ", extname(embed.link));
                }
            }
        }
        return note_text;
    }

    formatLinks(note_text: string): string {
        if (!this.file_cache.hasOwnProperty("links")) {
            return note_text;
        }
        for (let link of this.file_cache.links) {
            note_text = note_text.replace(
                new RegExp(c.escapeRegex(link.original), "g"),
                '<a style="color:#C9CB48" href="' +
                this.getUrlFromLink(link.link) +
                '">' +
                link.displayText +
                "</a>"
            );
        }
        return note_text;
    }

    censor(note_text: string, regexp: RegExp, mask: string): [string, string[]] {
        /*Take note_text and replace every match of regexp with mask, simultaneously adding it to a string array*/
        let matches: string[] = [];
        for (let match of note_text.matchAll(regexp)) {
            matches.push(match[0]);
        }
        return [note_text.replace(regexp, mask), matches];
    }

    decensor(
        note_text: string,
        mask: string,
        replacements: string[],
        escape: boolean
    ): string {
        for (let replacement of replacements) {
            note_text = note_text.replace(
                mask,
                escape ? escapeHtml(replacement) : replacement
            );
        }
        return note_text;
    }

    format(
        note_text: string,
        cloze: boolean,
        highlights_to_cloze: boolean
    ): string {

        if (cloze) {
            if (highlights_to_cloze) {
                note_text = note_text.replace(HIGHLIGHT_REGEXP, "{$1}");
            }
            note_text = this.curly_to_cloze(note_text);
        }

        note_text = this.getAndFormatMedias(note_text);
        note_text = this.formatLinks(note_text);

        // Remove unnecessary paragraph tag
        if (note_text.startsWith(PARA_OPEN) && note_text.endsWith(PARA_CLOSE)) {
            note_text = note_text.slice(PARA_OPEN.length, -1 * PARA_CLOSE.length);
        }
        return note_text;
    }
}
