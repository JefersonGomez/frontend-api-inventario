import { api } from "./client"

// Bancos (Bloque 10, punto 53)
// cuentas: [{ id, name, bankName, number, currency, isActive, general, locations, pending }]
export const getBankAccounts = () => api.get("/banks/accounts").then((res) => res.data)
// { name, bankName, number?, currency, isActive?, general, locationIds }
export const createBankAccount = (data) => api.post("/banks/accounts", data).then((res) => res.data)
export const updateBankAccount = (id, data) => api.put(`/banks/accounts/${id}`, data).then((res) => res.data)
// { fileName, rows: [{ date, reference, description, amount }] } → { rows, inserted, duplicates }
export const importBankStatement = (id, data) => api.post(`/banks/accounts/${id}/import`, data).then((res) => res.data)
// { page, status: pending|reviewed|all, q?, from?, to? } → página + totals { credits, debits }
export const getBankTransactions = (id, params = {}) => api.get(`/banks/accounts/${id}/transactions`, { params }).then((res) => res.data)
export const classifyBankTransaction = (id, data) => api.patch(`/banks/transactions/${id}`, data).then((res) => res.data)
// { bankAccountId, locationId?, amount, depositedAt, reference, note? }
export const createCashDeposit = (data) => api.post("/banks/deposits", data).then((res) => res.data)
export const getCashDeposits = (params = {}) => api.get("/banks/deposits", { params }).then((res) => res.data)
// conciliación (53B): { from, to } → { transactions: [{ ...movimiento, suggestion, candidates }], missing }
export const getReconcile = (id, params) => api.get(`/banks/accounts/${id}/reconcile`, { params }).then((res) => res.data)
// { items: [{ type, id }] } = lo del sistema que es este movimiento del banco
export const matchBankTransaction = (id, data) => api.post(`/banks/transactions/${id}/match`, data).then((res) => res.data)
// deshace la conciliación o la clasificación: vuelve a pendiente
export const undoBankMatch = (id) => api.delete(`/banks/transactions/${id}/match`).then((res) => res.data)
