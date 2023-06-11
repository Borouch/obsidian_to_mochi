export interface Mapper<Model, IndexDTO, StoreDTO> {
    mapFromDTO: (dto: IndexDTO) => Model;
    mapToDTO: (value: Model) => StoreDTO;
}
