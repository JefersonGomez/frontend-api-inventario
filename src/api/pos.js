import { api } from "./client"

// Punto de venta (Bloque 7A): cajas, turno de caja, ventas y tiquetes
export const getRegisters = () => api.get("/pos/registers").then((res) => res.data)
export const createRegister = (data) => api.post("/pos/registers", data).then((res) => res.data)
export const updateRegister = (id, data) => api.patch(`/pos/registers/${id}`, data).then((res) => res.data)

// mi turno abierto (o null) con summary { openingAmount, salesCount, salesTotal, payments, cashIn, cashOut, expectedCash }
export const getSession = () => api.get("/pos/session").then((res) => res.data)
// 423 { code: "PIN_EXPIRED" } = código vencido, caja bloqueada
export const openSession = (data) => api.post("/pos/session", data).then((res) => res.data)
export const renewCode = (managerPin) => api.post("/pos/session/renew-code", { managerPin }).then((res) => res.data)
export const getCashMovements = () => api.get("/pos/session/movements").then((res) => res.data)
export const addCashMovement = (data) => api.post("/pos/session/movements", data).then((res) => res.data)
// cierre ciego del cajero ({ note? }) → reporte del turno
export const closeSession = (id, data) => api.post(`/pos/sessions/${id}/close`, data).then((res) => res.data)
// arqueos (cash.reconcile): { page, pending: "1" | "0" } → página + pendingCount
export const getSessions = (params = {}) => api.get("/pos/sessions", { params }).then((res) => res.data)
export const getSessionReport = (id) => api.get(`/pos/sessions/${id}/report`).then((res) => res.data)
// { denominations, cardDeclared?, note? }
export const reconcileSession = (id, data) => api.post(`/pos/sessions/${id}/reconcile`, data).then((res) => res.data)

// → datos del tiquete { document, company, register, location, cashier }
export const sell = (data) => api.post("/pos/sales", data).then((res) => res.data)
export const getTicket = (documentId) => api.get(`/pos/tickets/${documentId}`).then((res) => res.data)
