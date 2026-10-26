// IVA por tarifa de una factura de proveedor (54A): filas { rate, base, tax } del formulario (texto).
import { TAX_PERCENT } from "@/lib/pos"

const round2 = (v) => Math.round(v * 100) / 100

// IVA de una fila: el escrito o base × tarifa (igual que el servidor)
export const lineTax = (l) => (l.tax !== "" && l.tax != null ? Number(l.tax) : round2((Number(l.base) || 0) * TAX_PERCENT[l.rate] / 100))

// filas del formulario → filas para el servidor (sin IVA escrito, lo calcula él)
export const toTaxLines = (rows) =>
  rows
    .filter((l) => Number(l.base) > 0)
    .map((l) => ({ rate: l.rate, base: Number(l.base), ...(l.rate !== "EXEMPT" && l.tax !== "" && l.tax != null && { tax: Number(l.tax) }) }))
