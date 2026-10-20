import {api} from "./client"

// Listado paginado: { page, pageSize, q, view: "flat" | "grouped", categoryId, groupId, pending, lowStock }
// → { items, total, page, pageSize, pageCount } (grouped: además pendingCount)
export const getProducts = (params = {}) => api.get("/products", { params }).then((res) => res.data)

export const getProduct = (id) => api.get(`/products/${id}`).then((res) => res.data)
export async function createProduct(data) {
  const response = await api.post("/products/", data)
  return response.data
}

export async function updateProduct(id, data) {
  const response = await api.put(`/products/${id}`, data)
  return response.data
}

export async function deleteProduct(id) {
  const response = await api.delete(`/products/${id}`)
  return response.data
}

export async function getProductByBarcode(code) {
  const response = await api.get(`/products/barcode/${code}`)
  return response.data
}

export const getProductPriceHistory = (id) =>
  api.get(`/products/${id}/price-history`).then((res) => res.data);

// Importación desde Excel: dryRun = true solo valida y devuelve la vista previa
// locationId: dónde entra el stock inicial (sin indicar: la ubicación activa)
export const importProducts = (rows, dryRun, options, locationId) =>
  api.post("/products/import", { rows, dryRun, options, ...(locationId && { locationId }) }).then((res) => res.data);

// genera EAN-13 internos para los productos sin código (los indicados, o todos si no se indican)
export const generateBarcodes = (productIds) =>
  api.post("/products/barcodes", productIds ? { productIds } : {}).then((res) => res.data)

// importar con IA: se manda solo una muestra (máx. 25 filas); devuelve { headerRow, mapping, cached, remaining }
export const aiMapColumns = (rows) => api.post("/products/import/ai-map", { rows }).then((res) => res.data)
