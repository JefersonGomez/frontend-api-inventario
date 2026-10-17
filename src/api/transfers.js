import { api } from "./client"

// Transferencias entre ubicaciones (dos pasos: enviar → recibir; cancelar mientras va en camino)
export const getTransfers = (params = {}) => api.get("/transfers", { params }).then((res) => res.data)
export const getTransfer = (id) => api.get(`/transfers/${id}`).then((res) => res.data)
export const createTransfer = (data) => api.post("/transfers", data).then((res) => res.data)
// items: [{ itemId, receivedQuantity }]; sin items = llegó todo
export const receiveTransfer = (id, items) => api.post(`/transfers/${id}/receive`, items ? { items } : undefined).then((res) => res.data)
export const cancelTransfer = (id) => api.post(`/transfers/${id}/cancel`).then((res) => res.data)
