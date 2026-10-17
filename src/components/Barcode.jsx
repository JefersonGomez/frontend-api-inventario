import { encodeEan } from "@/lib/barcode"

// Código de barras EAN en SVG (se escala al ancho del contenedor, se imprime nítido).
// Si el código no es EAN válido devuelve null: quien lo usa muestra el texto y sugiere generar uno.
export function Barcode({ code, height = 40, className }) {
  const enc = encodeEan(code)
  if (!enc) return null
  const quiet = 9 // margen en blanco a cada lado (los lectores lo necesitan)
  const width = enc.bits.length + quiet * 2
  const bars = []
  for (let i = 0; i < enc.bits.length; ) {
    if (enc.bits[i] === "1") {
      let w = 1
      while (enc.bits[i + w] === "1") w++
      bars.push(<rect key={i} x={quiet + i} y={0} width={w} height={height} />)
      i += w
    } else i++
  }
  return (
    <svg
      viewBox={`0 0 ${width} ${height + 11}`}
      className={className}
      role="img"
      aria-label={enc.text}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
    >
      <rect width={width} height={height + 11} fill="#fff" />
      <g fill="#000">{bars}</g>
      <text x={width / 2} y={height + 9} textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#000" letterSpacing="1">
        {enc.text}
      </text>
    </svg>
  )
}
