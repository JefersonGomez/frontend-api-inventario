// Utilidades del punto de venta (sin componentes: react-refresh pide archivos aparte)

// Billetes y monedas en circulación, de mayor a menor (arqueo y botones rápidos de efectivo)
export const DENOMINATIONS = {
  CRC: { bills: [50000, 20000, 10000, 5000, 2000, 1000], coins: [500, 100, 50, 25, 10, 5] },
  USD: { bills: [100, 50, 20, 10, 5, 2, 1], coins: [0.5, 0.25, 0.1, 0.05, 0.01] },
}

export const TAX_PERCENT = { EXEMPT: 0, RATE_1: 1, RATE_2: 2, RATE_4: 4, RATE_13: 13 }

const round2 = (v) => Math.round(v * 100) / 100

// Totales del carrito (precios con IVA incluido, menos el descuento de cada línea): total e IVA por tarifa
export function cartTotals(cart) {
  const byRate = {}
  let total = 0
  for (const item of cart) {
    const gross = Number(item.price) * item.quantity - (item.discountAmount ?? 0)
    total += gross
    const pct = TAX_PERCENT[item.taxRate ?? "RATE_13"]
    const r = (byRate[pct] ??= { base: 0, tax: 0 })
    const base = gross / (1 + pct / 100)
    r.base += base
    r.tax += gross - base
  }
  const rates = Object.entries(byRate)
    .map(([pct, v]) => ({ pct: Number(pct), base: round2(v.base), tax: round2(v.tax) }))
    .sort((a, b) => b.pct - a.pct)
  return { total: round2(total), subtotal: round2(rates.reduce((s, r) => s + r.base, 0)), tax: round2(rates.reduce((s, r) => s + r.tax, 0)), rates }
}

// Descuentos: la misma cuenta que el backend (pos.service computeDiscounts). pick = { typeId, value? };
// los tipos libres (value null) llevan el valor que escribe el cajero.
export function discountAmount(type, pick, base) {
  const value = type.value != null ? Number(type.value) : Number(pick?.value) || 0
  return type.kind === "PERCENT" ? round2((base * value) / 100) : value
}
// lo máximo que se puede escribir en un libre: % o monto, según el tipo
export const discountMax = (type, base) => (type.kind === "PERCENT" ? Number(type.maxPercent) : round2((base * Number(type.maxPercent)) / 100))

// Descuento de cada línea; el del total se reparte en proporción y la línea más grande se lleva el redondeo.
// El ajuste de precio (i.newPrice, i.priceReason) va primero, como descuento, y los demás se calculan sobre el precio nuevo.
export function applyDiscounts(cart, types, totalPick) {
  const byId = new Map(types.map((t) => [t.id, t]))
  const lines = cart.map((i) => {
    const adjust = i.newPrice != null ? round2((i.price - i.newPrice) * i.quantity) : 0
    const out = { amount: adjust, labels: adjust ? [`Ajuste de precio: ${i.priceReason}`] : [] }
    const gross = (i.newPrice ?? i.price) * i.quantity
    const type = i.discount && byId.get(i.discount.typeId)
    if (type) {
      out.amount += Math.min(discountAmount(type, i.discount, gross), gross)
      out.labels.push(type.name)
    }
    return out
  })
  let total = 0
  const totalType = totalPick && byId.get(totalPick.typeId)
  const after = cart.map((i, n) => i.price * i.quantity - lines[n].amount)
  const base = after.reduce((s, v) => s + v, 0)
  if (totalType && base > 0) {
    total = Math.min(discountAmount(totalType, totalPick, base), base)
    const biggest = after.reduce((b, v, n) => (v > after[b] ? n : b), 0)
    let given = 0
    after.forEach((v, n) => {
      if (n === biggest || v === 0) return
      const share = round2((total * v) / base)
      lines[n].amount += share
      lines[n].labels.push(totalType.name)
      given += share
    })
    lines[biggest].amount += total - given
    lines[biggest].labels.push(totalType.name)
  }
  return {
    lines: lines.map((l) => ({ amount: round2(l.amount), label: l.labels.join(" + ") })),
    totalDiscount: round2(total),
    totalBase: round2(base), // sobre lo que se aplica el descuento del total
    discount: round2(lines.reduce((s, l) => s + l.amount, 0)),
  }
}

// IVA del comprobante emitido, por tarifa (para el tiquete): de las líneas ya calculadas por el backend
export function documentTaxes(lines) {
  const byRate = {}
  for (const l of lines) {
    const pct = TAX_PERCENT[l.taxRate]
    const r = (byRate[pct] ??= { base: 0, tax: 0 })
    r.base += Number(l.subtotal)
    r.tax += Number(l.taxAmount)
  }
  return Object.entries(byRate)
    .map(([pct, v]) => ({ pct: Number(pct), base: round2(v.base), tax: round2(v.tax) }))
    .sort((a, b) => b.pct - a.pct)
}

// Botones rápidos de efectivo: el monto exacto y los billetes que lo cubren (sin repetir)
export function quickCash(total, currency = "CRC") {
  const { bills } = DENOMINATIONS[currency] ?? DENOMINATIONS.CRC
  const options = new Set([round2(total)])
  for (const b of [...bills].reverse()) {
    const v = Math.ceil(total / b) * b
    if (v > total) options.add(v)
    if (options.size >= 4) break
  }
  return [...options].sort((a, b) => a - b)
}

export const sumDenominations = (counts) => round2(Object.entries(counts).reduce((s, [v, n]) => s + Number(v) * (Number(n) || 0), 0))
