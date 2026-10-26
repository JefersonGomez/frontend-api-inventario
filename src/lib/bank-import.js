// Estado del banco (CSV o Excel) → filas para POST /banks/accounts/:id/import.
// Las columnas se reconocen por el encabezado (Banco Nacional: oficina;fechaMovimiento;numeroDocumento;
// debito;credito;descripcion; y los nombres comunes de otros bancos); lo que no se reconoce lo elige el usuario.
// Montos: una columna de débito y otra de crédito, o una sola con signo. Las filas sin fecha válida
// (totales, saldos, líneas en blanco) se saltan.
import { readXlsxRows } from "@/lib/xlsx-read"
import { parseDate, parseNumber } from "@/lib/product-import"

export const FIELDS = [
  { field: "date", aliases: ["fecha", "fechamovimiento", "fecha movimiento", "fecha de movimiento", "fecha contable", "date"] },
  { field: "reference", aliases: ["referencia", "numerodocumento", "numero documento", "no referencia", "nº referencia", "documento", "comprobante", "reference"] },
  { field: "description", aliases: ["descripcion", "concepto", "detalle", "description", "movimiento"] },
  { field: "debit", aliases: ["debito", "debitos", "debe", "cargo", "cargos", "retiro", "debit"] },
  { field: "credit", aliases: ["credito", "creditos", "haber", "abono", "abonos", "deposito", "credit"] },
  { field: "amount", aliases: ["monto", "importe", "amount", "valor"] },
]
const fold = (v) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.º°]/g, "").trim()
const ALIASES = new Map(FIELDS.flatMap((f) => f.aliases.map((a) => [fold(a), f.field])))

// CSV con ";" o "," (el que más aparezca en el encabezado) y comillas dobles
export function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/)
  const sep = (lines[0].match(/;/g) ?? []).length >= (lines[0].match(/,/g) ?? []).length ? ";" : ","
  return lines
    .map((line, i) => {
      const cells = []
      let cur = ""
      let quoted = false
      for (let j = 0; j < line.length; j++) {
        const c = line[j]
        if (quoted) {
          if (c === '"' && line[j + 1] === '"') (cur += '"'), j++
          else if (c === '"') quoted = false
          else cur += c
        } else if (c === '"') quoted = true
        else if (c === sep) cells.push(cur.trim()), (cur = "")
        else cur += c
      }
      cells.push(cur.trim())
      return { rowNumber: i + 1, cells }
    })
    .filter((r) => r.cells.some((c) => c !== ""))
}

export async function readStatement(file) {
  if (/\.xlsx$/i.test(file.name)) return readXlsxRows(file)
  if (/\.(csv|txt)$/i.test(file.name)) return parseCsv(await file.text())
  throw new Error("format")
}

export function detectBankColumns([header] = []) {
  const mapping = {}
  ;(header?.cells ?? []).forEach((label, index) => {
    const field = ALIASES.get(fold(label))
    if (field && mapping[field] === undefined) mapping[field] = index
  })
  return mapping
}

// Falta la fecha, la descripción o algún monto
export const missingBankFields = (m) => [
  ...["date", "description"].filter((f) => m[f] === undefined),
  ...(m.amount === undefined && (m.debit === undefined || m.credit === undefined) ? ["amounts"] : []),
]

// filas de datos → { rows, skipped } ; amount con signo (+ entra, − sale)
export function buildBankRows(sheetRows, m) {
  const rows = []
  let skipped = 0
  for (const { cells } of sheetRows.slice(1)) {
    const date = parseDate(cells[m.date] ?? "")
    const num = (i) => (i === undefined || cells[i] === undefined || cells[i] === "" ? 0 : parseNumber(cells[i]))
    const amount = m.amount !== undefined ? num(m.amount) : Math.abs(num(m.credit)) - Math.abs(num(m.debit))
    const description = String(cells[m.description] ?? "").trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount) || amount === 0 || !description) {
      skipped++
      continue
    }
    rows.push({
      date,
      reference: m.reference !== undefined ? String(cells[m.reference] ?? "").trim().slice(0, 60) : "",
      description: description.slice(0, 300),
      amount: Math.round(amount * 100) / 100,
    })
  }
  return { rows, skipped }
}
