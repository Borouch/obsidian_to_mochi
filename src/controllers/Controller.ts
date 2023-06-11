import {Notice} from "obsidian";
import axios, {AxiosRequestConfig} from 'axios';


const api = axios

export enum ResponseMessage {
    DESTROY = 'Resource successfully destroyed'
}

export interface MessageResponseDTO {
    message: ResponseMessage
    id: number
}

export class Controller {
    private static defaultConfig: AxiosRequestConfig<any> = {}

    static async store(url: string, body: object, config: AxiosRequestConfig<any> = {}) {
        return await api
            .post(`/${url}`, body, {...config, ...Controller.defaultConfig})
            .catch((error) => {
                Controller.handleError(error)
            });

    }

    static async show(url: string, config: AxiosRequestConfig<any> = {}) {
        return await api
            .get(`/${url}`, {...config, ...Controller.defaultConfig})
            .catch((error) => {
                Controller.handleError(error)
            });
    }

    static async index(url: string, config: AxiosRequestConfig<any> = {}) {
        return await api
            .get(`/${url}`, {...config, ...Controller.defaultConfig})
            .catch((error) => {
                Controller.handleError(error)
            }) ?? null;
    }

    static async update(url: string, body: object, config: AxiosRequestConfig<any> = {}) {
        return await api
            .put(`/${url}`, body, {...config, ...Controller.defaultConfig})
            .catch((error) => {
                Controller.handleError(error)
            });

    }

    static async patch(url: string, body: object, config: AxiosRequestConfig<any> = {}) {
        return await api
            .patch(`/${url}`, body, {...config, ...Controller.defaultConfig})
            .catch((error) => {
                Controller.handleError(error)
            });

    }

    static async destroy(url: string, config: AxiosRequestConfig<any> = {}) {
        return await api
            .delete(`/${url}`, {...config, ...Controller.defaultConfig})
            .catch((error) => {
                Controller.handleError(error)
            });

    }

    private static handleError(error: any) {
        console.error({errorResponse: JSON.parse(error.request.response)});
        console.error({error: error});
        new Notice('API REQUEST ERROR')
    }
}