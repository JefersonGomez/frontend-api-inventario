// Marca de Cubivo: un hexágono abierto en forma de C (la primera letra de la marca) con un cubo adentro.
// La C toma el color del texto (currentColor) y el cubo los tonos del azul de la marca (clases cbv-* en index.css).
// Junto al texto "ubivo" se lee "Cubivo". Mismo dibujo que public/favicon.svg.
export function CubivoMark({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M37 11.5 24 4 6.7 14v20L24 44l13-7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className="cbv-cube">
        <path className="cbv-top" d="M24 16.5 31 20.5 24 24.5 17 20.5Z" />
        <path className="cbv-left" d="M17 20.5 24 24.5V32.5L17 28.5Z" />
        <path className="cbv-right" d="M31 20.5V28.5L24 32.5V24.5Z" />
      </g>
    </svg>
  )
}
