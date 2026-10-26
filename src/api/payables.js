import { api } from "./client"

// Cuentas por pagar (Bloque 10)
// { page, q?, overdue?: "1" } → página de proveedores con saldo + totals { balance, overdue, aging }
export const getPayables = (params = {}) => api.get("/payables", { params }).then((res) => res.data)
// { page, status: open|overdue|paid|void, supplierId?, q? } → página de facturas
export const getSupplierInvoices = (params = {}) => api.get("/payables/invoices", { params }).then((res) => res.data)
// estado de cuenta: { supplier, balance, overdue, invoices, payments }
export const getSupplierAccount = (supplierId) => api.get(`/payables/${supplierId}`).then((res) => res.data)
// { supplierId, number, issueDate, dueDate?, subtotal, tax, note?, purchaseOrderId? }
export const createSupplierInvoice = (data) => api.post("/payables/invoices", data).then((res) => res.data)
export const voidSupplierInvoice = (id, reason) => api.post(`/payables/invoices/${id}/void`, { reason }).then((res) => res.data)
// { supplierId, amount, method, reference?, paidAt?, note?, invoiceIds? } → pago con sus allocations
export const paySupplier = (data) => api.post("/payables/payments", data).then((res) => res.data)
