import { api } from "./client";

export async function getLowStockReport() {
    const responce = await api.get("/reports/low-stock")
    return responce.data
    
}

export async function getInventoryValueReport() {
    const responce = await api.get("/reports/inventory-value")
    return responce.data
    
}

export async function getMovementsReport(from, to) {
  const response = await api.get("/reports/movements", {
    params: { from, to },
  })
  return response.data
}