// Utilidades del punto de venta (sin componentes: react-refresh pide archivos aparte)

// Billetes y monedas en circulación, de mayor a menor (arqueo y botones rápidos de efectivo)
export const DENOMINATIONS = {
  CRC: { bills: [50000, 20000, 10000, 5000, 2000, 1000], coins: [500, 100, 50, 25, 10, 5] },
  USD: { bills: [100, 50, 20, 10, 5, 2, 1], coins: [0.5, 0.25, 0.1, 0.05, 0.01] },
}

export const TAX_PERCENT = { EXEMPT: 0, RATE_1: 1, RATE_2: 2, RATE_4: 4, RATE_13: 13 }

const round2 = (v) => Math.round(v * 100) / 100

// Totales del carrito (precios con IVA incluido): total y el IVA separado por tarifa
export function cartTotals(cart) {
  const byRate = {}
  let total = 0
  for (const item of cart) {
    const gross = Number(item.price) * item.quantity
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
