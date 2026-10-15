
import { api } from "./client"

// { page, pageSize, q, status, supplierId } → página
export const getPurchaseOrders = (params = {}) =>
  api.get("/purchase-orders", { params }).then((res) => res.data);

export const getPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`).then((res) => res.data);

export const createPurchaseOrder = (data) =>
  api.post("/purchase-orders", data).then((res) => res.data);

export const receivePurchaseOrder = (id) =>
  api.patch(`/purchase-orders/${id}/receive`).then((res) => res.data);


export const sendPurchaseOrderEmail = (id) =>
  api.post(`/purchase-orders/${id}/send-email`).then((res) => res.data);
