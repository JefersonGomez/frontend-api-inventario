import { api } from "./client";

// Panel: totales ya calculados. since = inicio del mes en la zona del navegador
export const getDashboard = (since) => api.get("/reports/dashboard", { params: { since } }).then((res) => res.data)

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

// src/api/reports.js — agregar
export const getInventoryValueBreakdown = (days = 60) =>
  api.get("/reports/inventory-value-breakdown", { params: { days } }).then((res) => res.data);

export const getStockForecast = (velocityDays = 30, alertDays = 14) =>
  api
    .get("/reports/stock-forecast", { params: { velocityDays, alertDays } })
    .then((res) => res.data)