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

// resumen del día con IA: GET = lo guardado de hoy (sin gastar); POST = generarlo (una vez al día)
export const getDailySummary = ({ date, since }) => api.get("/reports/daily-summary", { params: { date, since } }).then((res) => res.data)
// force: volver a generar (el anterior queda en el historial)
export const generateDailySummary = ({ date, since }, force = false) =>
  api.post("/reports/daily-summary", undefined, { params: { date, since, ...(force && { force: 1 }) } }).then((res) => res.data)
// historial: { page, from?, to? } paginado; { all: 1 } todo (para descargar)
export const getSummaryHistory = (params) => api.get("/reports/daily-summaries", { params }).then((res) => res.data)

// Ventas (7D-1): reporte del período { from, to } (AAAA-MM-DD), ventas de hoy (Panel) y las del cajero { month? }
export const getSalesReport = (from, to) => api.get("/reports/sales", { params: { from, to } }).then((res) => res.data)
export const getSalesToday = () => api.get("/reports/sales-today").then((res) => res.data)
export const getMySales = (month) => api.get("/reports/my-sales", { params: month ? { month } : {} }).then((res) => res.data)

// IVA del mes (54B): Formulario 150 del mes (AAAA-MM) y lo que se anota a mano { prorata, cardWithholding, note }
export const getVatReport = (month) => api.get("/reports/vat", { params: { month } }).then((res) => res.data)
export const saveVatPeriod = (month, body) => api.put("/reports/vat", body, { params: { month } }).then((res) => res.data)
