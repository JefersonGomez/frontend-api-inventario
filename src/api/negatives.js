import { api } from "./client"

// Negativas: ventas sin stock en el sistema autorizadas en la caja. { page, status } → página + openCount
export const getNegatives = (params = {}) => api.get("/negatives", { params }).then((res) => res.data)
// { resolution, countedQuantity? }: con la cantidad contada se ajusta el stock de la sucursal
export const resolveNegative = (id, data) => api.post(`/negatives/${id}/resolve`, data).then((res) => res.data)
