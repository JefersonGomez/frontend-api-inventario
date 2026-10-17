import { api } from "./client"

// Conteo físico por ubicación: abrir, ir guardando lo contado, cerrar (ajusta) o cancelar
export const getStockCounts = (params = {}) => api.get("/stock-counts", { params }).then((res) => res.data)
export const getStockCount = (id) => api.get(`/stock-counts/${id}`).then((res) => res.data)
export const createStockCount = (data) => api.post("/stock-counts", data).then((res) => res.data)
// items: [{ productId, countedQuantity }] (null = borrar lo contado)
export const saveStockCount = (id, items) => api.put(`/stock-counts/${id}/items`, { items }).then((res) => res.data)
export const closeStockCount = (id) => api.post(`/stock-counts/${id}/close`).then((res) => res.data)
export const cancelStockCount = (id) => api.post(`/stock-counts/${id}/cancel`).then((res) => res.data)
