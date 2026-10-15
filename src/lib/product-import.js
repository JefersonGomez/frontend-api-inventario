// Convierte las filas del Excel en filas para POST /products/import, y arma la plantilla.
// Las columnas se reconocen solas por su encabezado (sin importar mayúsculas, tildes ni "*", en
// español o inglés, en cualquier orden); lo que no se reconoce lo indica el usuario en el paso de
// columnas. Así sirve el Excel que el cliente ya tiene, no solo la plantilla.
import { excelSerialToISO } from "@/lib/xlsx-read"

export const COLUMNS = [
  { field: "sku", header: "SKU", required: true, aliases: ["sku", "codigo", "código", "codigo interno", "referencia", "ref", "cod", "item"] },
  { field: "name", header: "Nombre *", required: true, aliases: ["nombre", "name", "producto", "product", "articulo", "artículo", "detalle", "descripcion corta"] },
  { field: "category", header: "Categoría", required: true, aliases: ["categoria", "category", "familia", "linea", "línea", "grupo", "departamento"] },
  { field: "price", header: "Precio", required: true, aliases: ["precio", "price", "precio de venta", "precio venta", "pvp", "precio unitario"] },
  { field: "cost", header: "Costo", aliases: ["costo", "cost", "costo unitario", "precio de compra", "costo promedio"] },
  { field: "stock", header: "Stock inicial", aliases: ["stock inicial", "stock", "existencias", "existencia", "cantidad", "inventario", "initial stock", "qty"] },
  { field: "minStock", header: "Stock mínimo", aliases: ["stock minimo", "stock mínimo", "minimo", "mínimo", "min stock", "minimum stock", "punto de reorden"] },
  // unidad / IVA / CABYS van como texto: el backend reconoce "kg", "Kilos", "13 %", "Exento"...
  { field: "unit", header: "Unidad", aliases: ["unidad", "unidad de medida", "um", "u/m", "medida", "unit", "uom", "unit of measure"] },
  { field: "taxRate", header: "IVA", aliases: ["iva", "% iva", "tarifa iva", "tarifa", "impuesto", "tax", "vat", "tax rate"] },
  { field: "cabys", header: "CABYS", aliases: ["cabys", "codigo cabys", "código cabys"] },
  { field: "barcode", header: "Código de barras", aliases: ["codigo de barras", "código de barras", "barcode", "ean", "upc"] },
  { field: "description", header: "Descripción", aliases: ["descripcion", "descripción", "description"] },
  { field: "supplier", header: "Proveedor", aliases: ["proveedor", "supplier", "marca proveedor"] },
  { field: "expirationDate", header: "Vencimiento (AAAA-MM-DD)", aliases: ["vencimiento", "fecha de vencimiento", "expiration", "expiration date", "caducidad"] },
]

export const REQUIRED = COLUMNS.filter((c) => c.required).map((c) => c.field)
const NUMERIC = new Set(["price", "cost", "stock", "minStock"])
const fold = (v) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\*|\(.*?\)|\./g, "").trim()
const ALIASES = new Map(COLUMNS.flatMap((c) => [fold(c.header), ...c.aliases.map(fold)].map((a) => [a, c.field])))

const letter = (i) => {
  let s = ""
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

// "1.234,50", "1,234.50", "₡ 2 500", "3500" → número. Texto que no es número → NaN (el backend lo reporta).
export function parseNumber(v) {
  if (typeof v === "number") return v
  let s = String(v).replace(/[₡$\s]|CRC|USD/gi, "")
  if (!s) return undefined
  const lastComma = s.lastIndexOf(",")
  const lastDot = s.lastIndexOf(".")
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "")
  } else if (lastComma > -1) {
    // "1,5" decimal; "1,500" o "12,500,000" miles
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".")
  }
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN
}

// número de serie de Excel, "2026-12-31" o "31/12/2026" → "AAAA-MM-DD". Lo que no se reconoce se manda tal cual.
export function parseDate(v) {
  if (typeof v === "number") return excelSerialToISO(v)
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
  return s
}

// Columnas del archivo (para el paso de columnas) y lo que se reconoció solo.
// headers: [{ index, label, sample }] ; mapping: { field → índice de columna }
export function detectColumns(sheetRows) {
  const [header, firstData] = sheetRows
  const width = Math.max(header?.cells.length ?? 0, ...sheetRows.slice(1, 50).map((r) => r.cells.length))
  const headers = Array.from({ length: width }, (_, index) => ({
    index,
    label: header?.cells[index] !== undefined ? String(header.cells[index]) : `Columna ${letter(index)}`,
    sample: firstData?.cells[index],
  }))
  const mapping = {}
  headers.forEach(({ index }) => {
    const field = ALIASES.get(fold(header?.cells[index]))
    if (field && mapping[field] === undefined) mapping[field] = index
  })
  return { headers, mapping }
}

// Datos obligatorios sin columna. La categoría se cubre también con una categoría por defecto.
export function missingFields(mapping, defaultCategory = "") {
  return REQUIRED.filter((f) => mapping[f] === undefined && !(f === "category" && defaultCategory.trim()))
}

// filas de datos (sin el encabezado) → filas para el backend
export function buildRows(sheetRows, mapping, defaultCategory = "") {
  const fallback = defaultCategory.trim()
  return sheetRows.slice(1).map(({ rowNumber, cells }) => {
    const row = { rowNumber }
    for (const [field, index] of Object.entries(mapping)) {
      if (index === undefined) continue
      const v = cells[index]
      if (v === undefined || v === "") continue
      if (NUMERIC.has(field)) {
        const n = parseNumber(v)
        if (n !== undefined) row[field] = Number.isNaN(n) ? -1 : n // -1: el backend lo rechaza con mensaje claro
      } else if (field === "expirationDate") row[field] = parseDate(v)
      else row[field] = String(v)
    }
    if (!row.category && fallback) row.category = fallback
    return row
  })
}

// Atajo con lo que se reconoce solo (lo usa el paso automático y la verificación en Node)
export function toImportRows(sheetRows, defaultCategory = "") {
  if (sheetRows.length === 0) return { rows: [], missing: [...REQUIRED], unknown: [] }
  const { headers, mapping } = detectColumns(sheetRows)
  const used = new Set(Object.values(mapping))
  return {
    rows: buildRows(sheetRows, mapping, defaultCategory),
    missing: missingFields(mapping, defaultCategory),
    unknown: headers.filter((h) => !used.has(h.index) && sheetRows[0].cells[h.index] !== undefined).map((h) => h.label),
  }
}

// Hojas de la plantilla descargable
export function templateSheets(t) {
  return [
    {
      name: t("products.import.templateSheet"),
      rows: [
        COLUMNS.map((c) => c.header),
        ["FER-001", "Martillo de uña 16 oz", "Ferretería", 6500, 4200, 24, 5, "Unidad", "13", "", "7441234567890", "Mango de fibra", "Distribuidora Sol", ""],
        ["ALI-014", "Arroz a granel", "Abarrotes", 1150, 890, 120.5, 30, "kg", "1", "", "", "", "", "2027-03-31"],
      ],
    },
    {
      name: t("products.import.helpSheet"),
      rows: [[t("products.import.helpTitle")], ...t("products.import.helpLines", { returnObjects: true }).map((l) => [l])],
    },
  ]
}
