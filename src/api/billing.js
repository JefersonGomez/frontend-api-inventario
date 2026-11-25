import { api } from "./client"

// Suscripción de la cuenta (fase de cobro): estado, plan y periodo. Solo el dueño cambia plan/periodo.
export const getSubscription = () => api.get("/billing/subscription").then((res) => res.data)
export const updateSubscription = (data) => api.put("/billing/subscription", data).then((res) => res.data)

// límites y precios públicos de cada plan (los mismos de la landing)
export const getPlans = () => api.get("/plans").then((res) => res.data)

// Pago con tarjeta (C2, ONVO)
export const getCardSetup = () => api.get("/billing/card-setup").then((res) => res.data)
export const payWithCard = (paymentMethodId) => api.post("/billing/pay", { paymentMethodId }).then((res) => res.data)
export const syncPayment = (id) => api.post(`/billing/payments/${id}/sync`).then((res) => res.data)
export const paySinpe = (data) => api.post("/billing/pay-sinpe", data).then((res) => res.data)
export const getPayments = () => api.get("/billing/payments").then((res) => res.data)

// La tarjeta va DIRECTO del navegador a ONVO con la llave pública (nunca pasa por el servidor de Cubivo).
// Devuelve el id de la tarjeta guardada en el cliente de ONVO de la cuenta.
export async function registerCard({ publishableKey, customerId, number, holderName, expMonth, expYear, cvv }) {
  const res = await fetch("https://api.onvopay.com/v1/payment-methods", {
    method: "POST",
    headers: { Authorization: `Bearer ${publishableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "card", customerId, card: { number, holderName, expMonth, expYear, cvv } }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.id) {
    const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message
    const err = new Error(msg || "card")
    err.onvo = true
    throw err
  }
  return data
}
