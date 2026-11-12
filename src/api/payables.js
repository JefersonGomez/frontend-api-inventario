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

// Factura electrónica del proveedor desde su XML: files = el XML de la factura y, opcional, la respuesta de Hacienda
const xmlForm = (files, fields = {}) => {
  const form = new FormData()
  for (const f of files) form.append("files", f)
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null && v !== "") form.append(k, String(v))
  return form
}
const multipart = { headers: { "Content-Type": "multipart/form-data" } }
// → { kind, clave, number, issueDate, dueDate, supplier, lines, taxes, total, haciendaStatus, creditable, notices, canImport }
export const previewSupplierXml = (files) => api.post("/payables/invoices/xml/preview", xmlForm(files), multipart).then((res) => res.data)
// fields: { dueDate?, creditable?: boolean, note? }
export const importSupplierXml = (files, fields) => api.post("/payables/invoices/xml", xmlForm(files, fields), multipart).then((res) => res.data)

// Mensaje receptor: { decision: "ACCEPT" | "PARTIAL" | "REJECT", detail? } → el mensaje con su estado
export const respondSupplierInvoice = (id, data) => api.post(`/payables/invoices/${id}/respond`, data).then((res) => res.data)
// reintentar el envío o consultar la respuesta de Hacienda
export const retrySupplierResponse = (id) => api.post(`/payables/invoices/${id}/respond/retry`).then((res) => res.data)

// Entrada al inventario desde la factura del proveedor: plan (líneas con el producto sugerido) y confirmar
export const getInvoiceStockPlan = (id) => api.get(`/payables/invoices/${id}/stock`).then((res) => res.data)
// { locationId?, lines: [{ line, productId? | newProduct? { name, price, categoryId } | skip?, factor? }] }
export const receiveInvoiceStock = (id, data) => api.post(`/payables/invoices/${id}/stock`, data).then((res) => res.data)
