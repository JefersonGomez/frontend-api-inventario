// Lector mínimo de .xlsx sin dependencias: abre el zip (con la descompresión nativa del navegador,
// DecompressionStream "deflate-raw"), toma la PRIMERA hoja y devuelve sus filas como arreglos de celdas.
// Celdas: número → number, texto → string, booleano → boolean, vacías → undefined.
// ponytail: sin fórmulas (lee el último valor calculado que guardó Excel), sin formatos de fecha
// (las fechas llegan como número de serie: ver excelSerialToISO). Suficiente para importar tablas.

const decoder = new TextDecoder()

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// Lee el directorio central del zip: { nombre → función que devuelve el texto del archivo }
function zipEntries(buffer) {
  const view = new DataView(buffer)
  let eocd = -1
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 66000); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error("not-xlsx")
  const count = view.getUint16(eocd + 10, true)
  let ptr = view.getUint32(eocd + 16, true)
  const entries = new Map()
  for (let n = 0; n < count; n++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) throw new Error("not-xlsx")
    const method = view.getUint16(ptr + 10, true)
    const compSize = view.getUint32(ptr + 20, true)
    const nameLen = view.getUint16(ptr + 28, true)
    const extraLen = view.getUint16(ptr + 30, true)
    const commentLen = view.getUint16(ptr + 32, true)
    const localOffset = view.getUint32(ptr + 42, true)
    const name = decoder.decode(new Uint8Array(buffer, ptr + 46, nameLen))
    entries.set(name, async () => {
      const lNameLen = view.getUint16(localOffset + 26, true)
      const lExtraLen = view.getUint16(localOffset + 28, true)
      const data = new Uint8Array(buffer, localOffset + 30 + lNameLen + lExtraLen, compSize)
      if (method === 0) return decoder.decode(data)
      if (method === 8) return decoder.decode(await inflateRaw(data))
      throw new Error("unsupported-compression")
    })
    ptr += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }
const unescapeXml = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e] ?? m
  )

// texto de un nodo que puede venir partido en varios <t> (texto enriquecido)
const textOf = (xml) => unescapeXml([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""))

const colIndex = (ref) => {
  const letters = ref.match(/^[A-Z]+/)[0]
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

// ruta de la primera hoja según workbook.xml + sus relaciones (no siempre es sheet1.xml)
async function firstSheetPath(entries) {
  const workbook = await entries.get("xl/workbook.xml")?.()
  const rels = await entries.get("xl/_rels/workbook.xml.rels")?.()
  const rid = workbook?.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1]
  // el orden de los atributos Id/Target varía según el programa que guardó el archivo
  const rel = rid ? [...(rels ?? "").matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${rid}"`)) : undefined
  const target = rel?.match(/\bTarget="([^"]+)"/)?.[1]
  if (!target) return [...entries.keys()].find((k) => /^xl\/worksheets\/[^/]+\.xml$/.test(k))
  return target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`
}

export async function readXlsxRows(file) {
  const buffer = await file.arrayBuffer()
  const entries = zipEntries(buffer)
  const sheetPath = await firstSheetPath(entries)
  if (!sheetPath || !entries.has(sheetPath)) throw new Error("not-xlsx")

  const sharedXml = (await entries.get("xl/sharedStrings.xml")?.()) ?? ""
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]))
  const sheetXml = await entries.get(sheetPath)()

  const rows = []
  for (const rowMatch of sheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(rowMatch[1].match(/\br="(\d+)"/)?.[1] ?? rows.length + 1)
    const cells = []
    for (const c of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1]
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1]
      const idx = ref ? colIndex(ref) : cells.length
      const type = attrs.match(/\bt="(\w+)"/)?.[1]
      const body = c[2] ?? ""
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      let value
      if (type === "s") value = raw !== undefined ? shared[Number(raw)] : undefined
      else if (type === "inlineStr") value = textOf(body)
      else if (type === "str") value = raw !== undefined ? unescapeXml(raw) : undefined
      else if (type === "b") value = raw === "1"
      else if (raw !== undefined && raw !== "") value = Number(raw)
      cells[idx] = typeof value === "string" ? value.trim() || undefined : value
    }
    if (cells.some((v) => v !== undefined && v !== "")) rows.push({ rowNumber, cells })
  }
  return rows
}

// Excel guarda las fechas como días desde 1899-12-30 (sistema 1900)
export function excelSerialToISO(serial) {
  return new Date(Math.round((serial - 25569) * 86400000)).toISOString().slice(0, 10)
}
