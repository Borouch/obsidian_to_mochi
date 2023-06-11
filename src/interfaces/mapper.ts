export interface Mapper<M, IndexDTO, StoreDTO> {
    mapFromDTO: (dto: IndexDTO) => M;
    mapToDTO: (value: M) => StoreDTO;
}