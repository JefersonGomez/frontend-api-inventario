// Recorrido: pestañas accesibles (flechas, Inicio, Fin) que cambian el texto y la captura.
// Capturas de la demo (Ferretería El Tornillo, datos ficticios) en public/landing/*.webp.
const SLIDES = {
  caja: {
    h: "Cobra en segundos",
    p: "Busca o escanea el producto, cobra en efectivo, tarjeta o SINPE y el tiquete sale solo. Si se cae el internet, la caja sigue vendiendo.",
    src: "/landing/caja.webp", w: 1568, h2: 777,
    alt: "Caja de Cubivo con una venta en curso de cemento, varilla y pintura",
  },
  inventario: {
    h: "Tu stock, al día",
    p: "Precio, costo y existencias de cada producto, por sucursal y bodega. Te avisa cuando algo está por agotarse.",
    src: "/landing/inventario.webp", w: 1556, h2: 777,
    alt: "Lista de productos con precio, costo y stock",
  },
  factura: {
    h: "Factura en un minuto",
    p: "Elige el cliente, agrega productos o servicios con su CABYS y emite. Se envía sola a Hacienda y le llega al cliente por correo.",
    src: "/landing/factura.webp", w: 680, h2: 634, narrow: true,
    alt: "Formulario de nueva factura electrónica con cliente, productos y un flete",
  },
  reportes: {
    h: "Sabe cómo vas",
    p: "Venta por día, por medio de pago, ganancia e IVA del mes. Compara con el período anterior y descárgalo en Excel.",
    src: "/landing/reportes.webp", w: 1556, h2: 777,
    alt: "Reporte de ventas del mes con gráfico por día, medios de pago y ganancia",
  },
  celular: {
    h: "En tu bolsillo",
    p: "Revisa ventas, stock y reportes desde el celular, sin instalar nada. También funciona en tablet.",
    src: "/landing/celular.webp", w: 565, h2: 721, narrow: true,
    alt: "Cubivo en el celular: reporte de ventas y lista de productos",
  },
}

export function initTour() {
  const tabs = [...document.querySelectorAll('.tabs [role="tab"]')]
  const panel = document.getElementById("panel-tour")
  const frame = document.getElementById("tour-frame")
  const img = document.getElementById("tour-img")
  const h = document.getElementById("tour-h")
  const p = document.getElementById("tour-p")
  if (!tabs.length || !img) return

  // precarga liviana de las demás capturas cuando el recorrido se acerca a la pantalla
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return
    for (const s of Object.values(SLIDES)) new Image().src = s.src
    io.disconnect()
  }, { rootMargin: "400px" })
  io.observe(panel)

  function select(tab, focus) {
    const s = SLIDES[tab.dataset.tab]
    for (const t of tabs) {
      const on = t === tab
      t.setAttribute("aria-selected", String(on))
      t.tabIndex = on ? 0 : -1
    }
    panel.setAttribute("aria-labelledby", tab.id)
    if (focus) tab.focus()
    h.textContent = s.h
    p.textContent = s.p
    frame.classList.toggle("narrow", Boolean(s.narrow))
    img.classList.add("swap")
    const next = new Image()
    next.onload = next.onerror = () => {
      img.src = s.src
      img.width = s.w
      img.height = s.h2
      img.alt = s.alt
      requestAnimationFrame(() => img.classList.remove("swap"))
    }
    next.src = s.src
  }

  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t))
    t.addEventListener("keydown", (e) => {
      const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }
      if (!(e.key in keys)) return
      e.preventDefault()
      select(tabs[(keys[e.key] + tabs.length) % tabs.length], true)
    })
  })
}
