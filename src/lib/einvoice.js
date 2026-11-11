// Cada cuánto volver a preguntar el estado ante Hacienda mientras está en camino (sin que haya que
// refrescar la página). Devuelve false cuando ya hay una respuesta final y no hace falta seguir.
const FAST = 5_000 // enviado: Hacienda suele responder en segundos (el repaso del servidor es cada minuto)
const SLOW = 30_000 // pendiente de reintento: el servidor espera varios minutos entre intentos
const JUST_ISSUED = 3 * 60_000 // recién emitido y todavía sin registro: el envío automático está por tomarlo

function pollFor(einvoice, issuedAt, now) {
  const status = einvoice?.status
  if (status === "SENT") return FAST
  if (status === "PENDING") return SLOW
  if (!einvoice && issuedAt && now - new Date(issuedAt).getTime() < JUST_ISSUED) return FAST
  return false
}

const shortest = (list) => list.filter(Boolean).reduce((a, b) => Math.min(a, b), Infinity)

// detalle de una venta o nota: su propio estado, el de sus notas y, en una nota, el de la venta que corrige
export function saleDetailPoll(sale, now = Date.now()) {
  if (!sale?.document) return false
  const own = pollFor(sale.einvoice, sale.document.issuedAt, now)
  const waitingOriginal = sale.document.type === "CREDIT_NOTE" && !sale.einvoice && ["PENDING", "SENT"].includes(sale.referenceEInvoiceStatus) ? FAST : false
  const notes = (sale.creditNotes ?? []).map((n) => pollFor(n.einvoice, n.issuedAt, now))
  const ms = shortest([own, waitingOriginal, ...notes])
  return Number.isFinite(ms) ? ms : false
}

// lista de ventas: mientras alguna fila esté en camino
export function salesListPoll(items, now = Date.now()) {
  const ms = shortest((items ?? []).map((s) => pollFor(s.einvoice, s.issuedAt, now)))
  return Number.isFinite(ms) ? ms : false
}
