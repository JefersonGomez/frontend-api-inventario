import { api } from "./client"

// Crédito y cuentas por cobrar (7B-2)
// { page, pageSize, q?, overdue?: "1" } → página + totals { balance, overdue }
export const getReceivables = (params = {}) => api.get("/receivables", { params }).then((res) => res.data)
// estado de cuenta: { customer, creditLimit, balance, available, overdue, overdueCount, installments, payments }
export const getAccount = (customerId) => api.get(`/receivables/${customerId}`).then((res) => res.data)
// { creditLimit: number | null } (credit.manage)
export const setCreditLimit = (customerId, creditLimit) => api.put(`/receivables/${customerId}/credit`, { creditLimit }).then((res) => res.data)
// abono { customerId, amount, method, reference?, tendered?, note?, inRegister } → recibo { payment, company }
export const registerPayment = (data) => api.post("/receivables/payments", data).then((res) => res.data)
export const getReceipt = (id) => api.get(`/receivables/payments/${id}`).then((res) => res.data)
