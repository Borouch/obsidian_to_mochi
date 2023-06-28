import {MochiTemplateField} from "@src/models/MochiTemplateField";
import {MochiSyncService} from "@src/services/MochiSyncService";
import {ModelNotFoundError} from "@src/exceptions/ModelNotFoundError";
import {MochiCardField} from "@src/models/IMochiCard";

export interface MochiTemplate {
    id: string;
    pos: string;
    name: string;
    content: string;
    "cloze?": boolean | null;
    "anki/id": string;
    fields: Record<string, MochiTemplateField>;
}

export function makeMochiCardFieldById(
    cardFieldNameByValue: Record<string, string>, mochiTemplate: MochiTemplate
) {

    const mochiCardFieldById: Record<string, MochiCardField> = {};
    for (const cardFieldName in cardFieldNameByValue) {
        const mochiTemplateFieldId = findMochiTemplateFieldIdByName(cardFieldName, mochiTemplate)
        mochiCardFieldById[mochiTemplateFieldId] = {
            value: cardFieldNameByValue[cardFieldName],
            id: mochiTemplateFieldId,
        };
    }
    return mochiCardFieldById;
}

export function findMochiTemplateFieldIdByName(fieldName: string, mochiTemplate: MochiTemplate) {
    const mochiTemplateFieldIds = Object.keys(mochiTemplate.fields);
    const mochiTemplateFieldId = mochiTemplateFieldIds.find(
        (mochiFieldId: string) =>
            mochiTemplate.fields[mochiFieldId].name === fieldName
    );
    if (!mochiTemplateFieldId) {
        throw new ModelNotFoundError("mochiTemplateField not found");
    }
    return mochiTemplateFieldId
}

export function findMochiTemplateFromName(cardTemplateName: string) {
    const mochiTemplate = MochiSyncService.mochiTemplates.find(
        (t) => t.name === cardTemplateName
    );
    if (cardTemplateName && !mochiTemplate) {

        console.warn({msg: "mochi template not found", cardTemplateName, templates: MochiSyncService.mochiTemplates})
        return null
    }
    return mochiTemplate
}