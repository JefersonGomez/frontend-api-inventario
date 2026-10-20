import { createPortal } from "react-dom"

// Muestra el contenido y pone una copia directo en <body> (.stk-print-root) que es lo único que sale
// al imprimir: dentro de un modal o de una página con scroll, el navegador recortaba lo que no se veía.
// width: ancho del rollo térmico en mm (80 = 302 px, 58 = 219 px en pantalla).
export function PrintArea({ width = 80, children }) {
  const body = (
    <div className="stk-ticket" style={{ width: width === 58 ? 219 : 302, "--ticket-mm": `${width}mm` }}>
      <style>{`@media print { @page { size: ${width}mm auto; margin: 0 } }`}</style>
      {children}
    </div>
  )
  return (
    <>
      {body}
      {createPortal(<div className="stk-print-root">{body}</div>, document.body)}
    </>
  )
}
