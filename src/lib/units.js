// Unidades de medida y tarifas de IVA (los mismos valores que el backend: UnitOfMeasure / TaxRate).
// UNIT solo admite cantidades enteras; las demás unidades, hasta 3 decimales.
export const UNITS = ["UNIT", "KG", "G", "L", "ML", "M", "CM", "M2"]
export const TAX_RATES = ["RATE_13", "RATE_4", "RATE_2", "RATE_1", "EXEMPT"]

// `step` del input numérico según la unidad del producto
export const qtyStep = (unit) => (unit && unit !== "UNIT" ? "0.001" : "1")

const qtyFormat = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 3 })

// "2,5 kg", "12 unid." — `t` es el de react-i18next
export function formatQty(qty, unit, t) {
  return `${qtyFormat.format(Number(qty ?? 0))} ${t(`units.short.${unit ?? "UNIT"}`)}`
}

// Suma/resta de cantidades sin arrastrar errores de punto flotante (0.1 + 0.2)
export const roundQty = (v) => Math.round(v * 1000) / 1000
