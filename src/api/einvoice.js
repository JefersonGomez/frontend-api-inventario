import { api } from "./client"

// Facturación electrónica (Bloque 9)

// configuración de la empresa: sin secretos (solo "hay clave" y el titular de la llave)
export const getEInvoiceSettings = () => api.get("/einvoice/settings").then((res) => res.data)

// fields: { environment?, username?, password?, pin?, provider?, enabled?: "true" | "false" }; p12: archivo opcional
export async function saveEInvoiceSettings(fields, p12) {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) form.append(k, String(v))
  if (p12) form.append("p12", p12)
  const res = await api.put("/einvoice/settings", form, { headers: { "Content-Type": "multipart/form-data" } })
  return res.data
}

export const testEInvoiceSettings = () => api.post("/einvoice/settings/test").then((res) => res.data)

// estado de un comprobante ante Hacienda, enviarlo (o reintentar) y consultar la respuesta
export const sendEInvoice = (documentId) => api.post(`/einvoice/documents/${documentId}/send`).then((res) => res.data)
export const refreshEInvoice = (documentId) => api.post(`/einvoice/documents/${documentId}/refresh`).then((res) => res.data)

export async function downloadEInvoiceXml(documentId) {
  const res = await api.get(`/einvoice/documents/${documentId}/xml`, { responseType: "blob" })
  const name = /filename="([^"]+)"/.exec(res.headers["content-disposition"] ?? "")?.[1] ?? "comprobante.xml"
  const url = URL.createObjectURL(res.data)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

// reenviar al correo del cliente el comprobante aceptado
export const emailEInvoice = (documentId) => api.post(`/einvoice/documents/${documentId}/email`).then((res) => res.data)

// nombre y tipo de identificación de una cédula, desde la consulta pública de Hacienda
export const lookupTaxpayer = (idNumber) => api.get(`/einvoice/taxpayer/${encodeURIComponent(idNumber)}`).then((res) => res.data)

// catálogo CABYS de Hacienda: q = texto o código de 13 dígitos → { items: [{ code, description, taxPercent, taxRate }], total }
export const searchCabys = (q) => api.get("/einvoice/cabys", { params: { q } }).then((res) => res.data)
