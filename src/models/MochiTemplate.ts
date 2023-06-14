import {MochiTemplateField} from "@src/models/MochiTemplateField";

export interface MochiTemplate {
    id: string;
    pos: string;
    name: string;
    content: string;
    'cloze?': boolean | null;
    'anki/id': string;
    fields: Record<string, MochiTemplateField>;
}