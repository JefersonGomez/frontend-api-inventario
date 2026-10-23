// Caja sin conexión (Bloque 8B): lo último que respondió el servidor queda guardado, el catálogo se
// busca en local y las ventas sin red esperan en una cola hasta que vuelva la conexión.
import { reportOfflineFailure, sell } from "@/api/pos"
import { getSession } from "@/lib/session"
import { TAX_PERCENT } from "@/lib/pos"
import { kvGet, kvSet, salesAll, salesDelete, salesPut } from "./offline-db"

// sin respuesta del servidor = no hay red (o el servidor no está): distinto de un error que sí respondió
export const isNetworkError = (e) => !!e?.isAxiosError && !e.response && e.code !== "ERR_CANCELED"

// todo lo guardado es de una persona en una empresa: otra cuenta en el mismo equipo no lo ve
const account = () => {
  const s = getSession()
  return `${s?.user?.id}:${s?.companyId}`
}
const key = (name) => `${account()}:${name}`

// envuelve una consulta: responde el servidor y se guarda; sin red, lo último guardado
export const cached = (name, fn) => async () => {
  try {
    const data = await fn()
    kvSet(key(name), data).catch(() => {})
    return data
  } catch (e) {
    const saved = isNetworkError(e) ? await kvGet(key(name)) : undefined
    if (saved === undefined) throw e
    return saved
  }
}

const norm = (s) => String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

// búsqueda en el catálogo guardado, con la misma forma que GET /products
export async function searchCatalog({ q, categoryId }) {
  const products = (await kvGet(key("catalog")))?.products ?? []
  const text = norm(q?.trim())
  const items = products.filter(
    (p) => (!categoryId || p.categoryId === categoryId) && (!text || norm(p.name).includes(text) || norm(p.sku).includes(text) || p.barcode === q.trim())
  )
  return { items: items.slice(0, 60), total: items.length }
}

export async function findInCatalog(code) {
  const products = (await kvGet(key("catalog")))?.products ?? []
  const found = products.find((p) => p.barcode === code || norm(p.sku) === norm(code))
  if (!found) throw new Error("not found")
  return found
}

// --- cola de ventas ---
const mine = async () => (await salesAll()).filter((s) => s.account === account())

export const failedSales = async () => (await mine()).filter((s) => s.error).sort((a, b) => a.soldAt.localeCompare(b.soldAt))
export const saleTotal = (s) => s.payments.reduce((t, p) => t + p.amount, 0)

// reintentar (después de arreglar la causa, p. ej. entró stock de un producto con lotes) o descartar (no entra
// al sistema: el encargado ya recibió el aviso y esa plata sale como sobrante en el arqueo)
export async function retrySale(sale) {
  const again = { ...sale }
  delete again.error
  delete again.reported
  await salesPut(again)
  return flushSales()
}
export const discardSale = (sale) => salesDelete(sale.clientSaleId)

export async function pendingSales() {
  const list = await mine()
  return { pending: list.filter((s) => !s.error).length, failed: list.filter((s) => s.error).length }
}

// guarda la venta y descuenta el stock del catálogo local (para que la caja no siga ofreciendo lo vendido)
export async function queueSale(body) {
  const sale = { ...body, soldAt: new Date().toISOString(), account: account() }
  await salesPut(sale)
  const catalog = await kvGet(key("catalog"))
  if (catalog) {
    const sold = new Map(body.lines.map((l) => [l.productId, l.quantity]))
    catalog.products = catalog.products.map((p) => (sold.has(p.id) ? { ...p, stock: p.stock - sold.get(p.id) } : p))
    await kvSet(key("catalog"), catalog)
  }
  return sale
}

// manda la cola en orden; se detiene si no hay red. Una venta rechazada queda marcada con su error
// (no se pierde). Devuelve cuántas se enviaron.
let flushing = null
export const flushSales = () => (flushing ??= flush().finally(() => (flushing = null)))
async function flush() {
  const list = (await mine()).filter((s) => !s.error).sort((a, b) => a.soldAt.localeCompare(b.soldAt))
  let sent = 0
  for (const { account: owner, ...sale } of list) {
    try {
      await sell(sale)
      await salesDelete(sale.clientSaleId)
      sent++
    } catch (e) {
      if (isNetworkError(e)) break
      await salesPut({ ...sale, account: owner, error: e.response?.data?.error ?? e.message })
    }
  }
  // cada rechazo se reporta una vez (auditoría + aviso a quien hace arqueos); sin red, en el próximo intento
  for (const s of (await mine()).filter((s) => s.error && !s.reported)) {
    try {
      await reportOfflineFailure({ clientSaleId: s.clientSaleId, error: s.error.slice(0, 300), total: saleTotal(s), soldAt: s.soldAt })
      await salesPut({ ...s, reported: true })
    } catch {
      break
    }
  }
  return sent
}

// tiquete provisional: el número oficial lo pone el servidor al sincronizar
export function provisionalTicket({ sale, cart, company, session }) {
  const lines = cart.map((i, n) => {
    const total = i.price * i.quantity
    const subtotal = total / (1 + TAX_PERCENT[i.taxRate] / 100)
    return { id: String(n), description: i.name, quantity: i.quantity, unitPrice: i.price / (1 + TAX_PERCENT[i.taxRate] / 100), discount: 0, taxRate: i.taxRate, subtotal, taxAmount: total - subtotal, total }
  })
  return {
    document: {
      type: "TICKET",
      consecutive: sale.clientSaleId.slice(0, 8).toUpperCase(),
      provisional: true,
      issuedAt: sale.soldAt,
      lines,
      subtotal: lines.reduce((s, l) => s + l.subtotal, 0),
      total: lines.reduce((s, l) => s + l.total, 0),
      payments: sale.payments.map((p, n) => ({ id: String(n), ...p })),
    },
    company,
    register: session.register,
    location: session.register.location,
    cashier: session.openedBy,
  }
}
