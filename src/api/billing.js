import { api } from "./client"

// Suscripción de la cuenta (fase de cobro): estado, plan y periodo. Solo el dueño cambia plan/periodo.
export const getSubscription = () => api.get("/billing/subscription").then((res) => res.data)
export const updateSubscription = (data) => api.put("/billing/subscription", data).then((res) => res.data)

// límites y precios públicos de cada plan (los mismos de la landing)
export const getPlans = () => api.get("/plans").then((res) => res.data)
