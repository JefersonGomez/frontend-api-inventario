// src/api/purchaseRequests.js
import { api } from "./client" // ajustá al nombre real de tu instancia de axios

export const getPurchaseRequests = () =>
  api.get("/purchase-requests").then((res) => res.data);

export const createPurchaseRequest = (data) =>
  api.post("/purchase-requests", data).then((res) => res.data);

export const updatePurchaseRequestStatus = (id, status) =>
  api.patch(`/purchase-requests/${id}/status`, { status }).then((res) => res.data);

// src/api/purchaseRequests.js — agregar
export const getPurchaseRequestAlerts = () =>
  api.get("/purchase-requests/alerts").then((res) => res.data);
