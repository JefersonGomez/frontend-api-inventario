import { api } from "./client"

export const getCompany = () => api.get("/company").then((res) => res.data)

// data: { name?, currency? } (al menos uno)
export const updateCompany = (data) => api.put("/company", data).then((res) => res.data)

// empresas en las que el usuario está activo, y crear otra (límite según el plan)
export const getMyCompanies = () => api.get("/companies").then((res) => res.data)

export const createCompany = (name) => api.post("/companies", { name }).then((res) => res.data)

export const switchCompanyRequest = (companyId) =>
  api.post("/auth/switch-company", { companyId }).then((res) => res.data)

// guía de primeros pasos (la calcula el servidor)
export const getOnboarding = () => api.get("/company/onboarding").then((res) => res.data)
export const setOnboardingDismissed = (dismissed) => api.put("/company/onboarding", { dismissed }).then((res) => res.data)
