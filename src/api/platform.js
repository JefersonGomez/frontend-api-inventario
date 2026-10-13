import { api } from "./client"

// Solo el dueño de la plataforma (el backend vuelve a validarlo en cada petición)
export const getPlatformCompanies = () => api.get("/platform/companies").then((res) => res.data)

export const setCompanyPlan = (id, plan) => api.patch(`/platform/companies/${id}/plan`, { plan })

export const setCompanySuspended = ({ id, suspended, reason }) =>
  api.patch(`/platform/companies/${id}/suspension`, { suspended, ...(reason && { reason }) })
