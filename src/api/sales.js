import { api } from "./client"

// Ventas y devoluciones (7C)
// { page, q?, kind?: "SALE" | "CREDIT_NOTE", from?, to?, registerId?, customerId? }
export const getSales = (params = {}) => api.get("/sales", { params }).then((res) => res.data)
// tiquete + returned { lineId: cantidad } + creditNotes + returnUntil
export const getSale = (id) => api.get(`/sales/${id}`).then((res) => res.data)
// { lines: [{ lineId, quantity, condition: GOOD|DAMAGED }], reason, refund?: { method, reference? }, pin } → tiquete de la nota + credited + refund
export const createReturn = (id, data) => api.post(`/sales/${id}/returns`, data).then((res) => res.data)
