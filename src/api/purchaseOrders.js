
import { api } from "./client"

export const getPurchaseOrders = () =>
  api.get("/purchase-orders").then((res) => res.data);

export const createPurchaseOrder = (data) =>
  api.post("/purchase-orders", data).then((res) => res.data);

export const receivePurchaseOrder = (id) =>
  api.patch(`/purchase-orders/${id}/receive`).then((res) => res.data);


