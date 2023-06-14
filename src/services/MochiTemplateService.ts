import {MochiTemplatesController} from "@src/controllers/MochiTemplatesController";
import {MochiSyncService} from "@src/services/MochiSyncService";

export class MochiTemplateService {
    public static async index() {
        const mochiTemplates = await MochiTemplatesController.i.index()
        MochiSyncService.mochiTemplates = mochiTemplates
        return mochiTemplates
    }
}