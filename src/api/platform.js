import { api } from "./client"

// Solo el dueño de la plataforma (el backend vuelve a validarlo en cada petición)
export const getPlatformCompanies = () => api.get("/platform/companies").then((res) => res.data)

export const setCompanyPlan = (id, plan) => api.patch(`/platform/companies/${id}/plan`, { plan })

export const setCompanySuspended = ({ id, suspended, reason }) =>
  api.patch(`/platform/companies/${id}/suspension`, { suspended, ...(reason && { reason }) })

// panel del dueño (Bloque 6A)
export const getPlatformOverview = () => api.get("/platform/overview").then((res) => res.data)
export const getAiUsage = (month) => api.get("/platform/ai-usage", { params: month ? { month } : {} }).then((res) => res.data)
export const setAiBudget = (data) => api.put("/platform/ai-budget", data).then((res) => res.data)
export const getOwnerActions = () => api.get("/platform/actions").then((res) => res.data)
