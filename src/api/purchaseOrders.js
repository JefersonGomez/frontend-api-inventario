
import { api } from "./client"

// { page, pageSize, q, status, supplierId } → página
export const getPurchaseOrders = (params = {}) =>
  api.get("/purchase-orders", { params }).then((res) => res.data);

export const getPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`).then((res) => res.data);

export const createPurchaseOrder = (data) =>
  api.post("/purchase-orders", data).then((res) => res.data);

// items: [{ itemId, quantity }] = lo que llegó de cada línea; sin items = todo lo pendiente
export const receivePurchaseOrder = (id, items) =>
  api.patch(`/purchase-orders/${id}/receive`, items ? { items } : undefined).then((res) => res.data);

// cancelar: solo sin nada recibido (motivo obligatorio). Cerrar: con algo recibido, cancela lo pendiente
export const cancelPurchaseOrder = (id, reason) => api.post(`/purchase-orders/${id}/cancel`, { reason }).then((res) => res.data);
export const closePurchaseOrder = (id, reason) =>
  api.post(`/purchase-orders/${id}/close`, reason ? { reason } : undefined).then((res) => res.data);


export const sendPurchaseOrderEmail = (id) =>
  api.post(`/purchase-orders/${id}/send-email`).then((res) => res.data);
