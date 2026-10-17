// Codificación EAN-13 / UPC-A / EAN-8 para dibujar etiquetas (sin librerías: las tablas son fijas).
// Devuelve la secuencia de módulos ("1" = barra, "0" = espacio) o null si el código no es EAN válido.
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"]
const R = L.map((c) => [...c].map((b) => (b === "0" ? "1" : "0")).join(""))
const G = R.map((c) => [...c].reverse().join(""))
// paridad de los 6 dígitos de la izquierda según el primer dígito del EAN-13
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"]

// pesos 3 y 1 alternados desde la derecha (igual que el backend, shared/ean.ts)
export function eanCheckDigit(body) {
  let sum = 0
  for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * (i % 2 === 0 ? 3 : 1)
  return (10 - (sum % 10)) % 10
}

const valid = (code) => eanCheckDigit(code.slice(0, -1)) === Number(code.at(-1))

export function encodeEan(raw) {
  const code = /^\d{12}$/.test(raw ?? "") ? `0${raw}` : raw // UPC-A se dibuja como EAN-13 con 0 adelante
  if (/^\d{13}$/.test(code ?? "") && valid(code)) {
    const d = [...code].map(Number)
    let bits = "101"
    for (let i = 1; i <= 6; i++) bits += (PARITY[d[0]][i - 1] === "L" ? L : G)[d[i]]
    bits += "01010"
    for (let i = 7; i <= 12; i++) bits += R[d[i]]
    return { bits: bits + "101", kind: "EAN13", text: code }
  }
  if (/^\d{8}$/.test(code ?? "") && valid(code)) {
    const d = [...code].map(Number)
    let bits = "101"
    for (let i = 0; i < 4; i++) bits += L[d[i]]
    bits += "01010"
    for (let i = 4; i < 8; i++) bits += R[d[i]]
    return { bits: bits + "101", kind: "EAN8", text: code }
  }
  return null
}
