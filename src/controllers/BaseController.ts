import {AxiosRequestConfig, AxiosResponse} from "axios";
import {Controller} from "@src/controllers/Controller";
import {Mapper} from "@src/interfaces/mapper";

export abstract class BaseController<TModel,
    TMapper extends Mapper<TModel, TIndexDTO, TStoreDTO>,
    TIndexDTO extends object,
    TStoreDTO extends object> {
    public abstract RESOURCE: string;
    public abstract ENTITY: string;
    public abstract ENTITIES: string;

    public async index(config: AxiosRequestConfig<any> = {}): Promise<TModel[] | null> {
        const response = await Controller.index(this.RESOURCE, config);
        if (!response) return null
        const dtos: TIndexDTO[] | null = this.parseResponse(this.ENTITIES, response)
        if (!dtos) return null;
        return dtos.map((dto) => this.mapperFactory().mapFromDTO(dto));
    }

    public async bookmarkIndex() {
        let allModels: TModel[] = []
        let bookmark = '';
        let config = {params: {bookmark: bookmark}}
        while (true) {
            const response = await Controller.index(this.RESOURCE, config);
            if (!response) break
            const dtos: TIndexDTO[] | null = this.parseResponse(this.ENTITIES, response) ?? []
            bookmark = this.parseResponse('bookmark', response)
            config.params.bookmark = bookmark
            if (!dtos) break;
            const models = dtos.map((dto) => this.mapperFactory().mapFromDTO(dto));
            allModels.push(...models)
            if (models.length <= 0 || !bookmark) break;
        }
        return allModels
    }

    public async show(id: number | string, config: AxiosRequestConfig<any> = {}): Promise<TModel | null> {
        const response = await Controller.show(`${this.RESOURCE}/${id}`, config);
        if (!response) return null
        const dto: TIndexDTO | null = this.parseResponse(this.ENTITY, response)
        if (!dto) return null;
        return this.mapperFactory().mapFromDTO(dto)
    }

    public async store(dto: TStoreDTO, postfix: string = '', config: AxiosRequestConfig<any> = {}): Promise<TModel | null> {
        const path = postfix ? `${this.RESOURCE}/${postfix}` : this.RESOURCE
        const response = await Controller.store(path, dto, config);
        if (!response) return null
        const storedDto: TIndexDTO | null = this.parseResponse(this.ENTITY, response)
        if (!storedDto) return null;
        return this.mapperFactory().mapFromDTO(storedDto);
    }

    public async destroy(id: number | string, config: AxiosRequestConfig<any> = {}) {
        const response = await Controller.destroy(`${this.RESOURCE}/${id}`, config);
        if (!response) return null
        return response.data ?? null;
    }

    public async update(id: number | string, dto: TStoreDTO, config: AxiosRequestConfig<any> = {}) {
        const response = await Controller.update(`${this.RESOURCE}/${id}`, dto, config);
        if (!response) return null
        const updatedDto: TIndexDTO | null = this.parseResponse(this.ENTITY, response)
        if (!updatedDto) return null;
        return this.mapperFactory().mapFromDTO(updatedDto);
    }

    public parseResponse(key: string | undefined, response: AxiosResponse<any, any>) {
        if (!key) return response.data
        return response.data[key] ?? null;
    }

    protected abstract mapperFactory(): TMapper;

}