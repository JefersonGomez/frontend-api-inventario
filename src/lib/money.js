// Formato de montos según la moneda de la empresa (CRC = colones, USD = dólares).
// Un solo lugar para que ninguna pantalla escriba "$" a mano. Los valores se guardan sin conversión:
// cambiar la moneda solo cambia cómo se muestran.
const cache = new Map()

export function moneyFormatter(currency = "CRC") {
  if (!cache.has(currency)) {
    const base = { style: "currency", currency, currencyDisplay: "narrowSymbol" }
    const full = new Intl.NumberFormat("es-CR", { ...base, minimumFractionDigits: 0, maximumFractionDigits: 2 })
    const compact = new Intl.NumberFormat("es-CR", { ...base, notation: "compact", maximumFractionDigits: 1 })
    cache.set(currency, {
      currency,
      format: (value) => full.format(Number(value) || 0),
      compact: (value) => compact.format(Number(value) || 0),
    })
  }
  return cache.get(currency)
}
