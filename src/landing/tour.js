// Recorrido: pestañas accesibles (flechas, Inicio, Fin) que cambian el texto y la captura.
// Capturas de la demo (Ferretería El Tornillo, datos ficticios) en public/landing/<img>-<ancho>.webp: tomadas a 2×
// (celular a 3×); se publican a tamaño normal (w) y doble (2w) y el navegador elige según la pantalla.
// orden: sizes y srcset antes que src (así el navegador elige bien antes de empezar a descargar)
const srcOf = (s) => ({
  // ancho en pantalla: las anchas llenan el marco; las angostas se limitan a 620 px de alto
  sizes: s.narrow ? `min(${Math.round((620 * s.w) / s.h2)}px, calc(100vw - 72px))` : "(max-width: 1240px) calc(100vw - 72px), 1148px",
  srcset: `/landing/${s.img}-${s.w}.webp ${s.w}w, /landing/${s.img}-${s.w * 2}.webp ${s.w * 2}w`,
  src: `/landing/${s.img}-${s.w}.webp`,
})
const SLIDES = {
  caja: {
    h: "Cobra en segundos",
    p: "Busca o escanea el producto, cobra en efectivo, tarjeta o SINPE y el tiquete sale solo. Si se cae el internet, la caja sigue vendiendo.",
    img: "caja", w: 1440, h2: 860,
    alt: "Caja de Cubivo con una venta en curso de cemento, varilla y pintura",
  },
  inventario: {
    h: "Tu stock, al día",
    p: "Precio, costo y existencias de cada producto, por sucursal y bodega. Te avisa cuando algo está por agotarse.",
    img: "inventario", w: 1440, h2: 800,
    alt: "Lista de productos con precio, costo y stock",
  },
  factura: {
    h: "Factura en un minuto",
    p: "Elige el cliente, agrega productos o servicios con su CABYS y emite. Se envía sola a Hacienda y le llega al cliente por correo.",
    img: "factura", w: 952, h2: 862, narrow: true,
    alt: "Formulario de nueva factura electrónica con cliente, productos y un flete",
  },
  reportes: {
    h: "Sabe cómo vas",
    p: "Venta por día, por medio de pago, ganancia e IVA del mes. Compara con el período anterior y descárgalo en Excel.",
    img: "reportes", w: 1440, h2: 800,
    alt: "Reporte de ventas del mes con gráfico por día, medios de pago y ganancia",
  },
  celular: {
    h: "En tu bolsillo",
    p: "Revisa ventas, stock y reportes desde el celular, sin instalar nada. También funciona en tablet.",
    img: "celular", w: 597, h2: 620, narrow: true,
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
    for (const s of Object.values(SLIDES)) {
      const pre = new Image()
      Object.assign(pre, srcOf(s))
    }
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
    const files = srcOf(s)
    const next = new Image()
    next.onload = next.onerror = () => {
      img.sizes = files.sizes
      img.srcset = files.srcset
      img.src = files.src
      img.width = s.w
      img.height = s.h2
      img.alt = s.alt
      requestAnimationFrame(() => img.classList.remove("swap"))
    }
    Object.assign(next, files)
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
