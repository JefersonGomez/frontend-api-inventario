// Precios de la landing: los LÍMITES de cada plan vienen del sistema (GET /plans, config/plans.ts del
// backend) y los MONTOS de config.js (pendientes hasta la fase de planes de pago).
import { LANDING } from "./config.js"

const API = import.meta.env.VITE_API_URL ?? "/api"
const fmt = new Intl.NumberFormat("es-CR")

// cómo se presenta cada plan (el orden lo da el sistema)
const META = {
  INVOICING: { name: "Solo facturación", for: "Para consultores, profesionales y servicios." },
  BASIC: { name: "Básico", for: "Para un negocio con un local y una caja." },
  PRO: { name: "Pro", for: "Para negocios que crecen, con varias sucursales.", featured: true },
  BUSINESS: { name: "Empresarial", for: "Para cadenas y distribuidores." },
}

const plural = (n, one, many) => `${fmt.format(n)} ${n === 1 ? one : many}`

// lo que incluye, en lenguaje simple, a partir de los límites reales
function features(p) {
  const list = []
  list.push(p.maxUsersPerCompany == null ? "Usuarios ilimitados" : plural(p.maxUsersPerCompany, "usuario", "usuarios"))
  if (p.invoicingOnly) {
    list.push("Sin inventario ni caja: solo facturar")
    list.push("Productos y servicios ilimitados")
  } else {
    const branches = p.maxBranches == null ? "Sucursales ilimitadas" : plural(p.maxBranches, "sucursal", "sucursales")
    const registers = p.maxRegistersPerBranch == null ? "cajas ilimitadas" : plural(p.maxRegistersPerBranch, "caja", "cajas") + (p.maxBranches === 1 ? "" : " por sucursal")
    list.push(`${branches} · ${registers}`)
    list.push(p.maxProducts == null ? "Productos ilimitados" : `Hasta ${fmt.format(p.maxProducts)} productos`)
  }
  list.push(p.documentsPerMonth == null ? "Comprobantes ilimitados" : `${fmt.format(p.documentsPerMonth)} comprobantes al mes`)
  list.push(p.invoicingOnly ? "Factura electrónica y cuentas por cobrar" : "Factura electrónica, inventario y reportes")
  if (p.aiChatsPerMonth) list.push(`Asistente con IA: ${fmt.format(p.aiChatsPerMonth)} preguntas al mes`)
  if (p.maxCompanies > 1) list.push(`Hasta ${p.maxCompanies} empresas en una cuenta`)
  return list
}

function priceText(code, billing) {
  const monthly = LANDING.prices?.[code]
  if (monthly == null) return { amount: "₡ —", note: "Precio por anunciar" }
  if (billing !== "annual") return { amount: `₡${fmt.format(monthly)}`, note: "" }
  const value = LANDING.annualPrices?.[code] ?? monthly
  return { amount: `₡${fmt.format(value)}`, note: `₡${fmt.format(value * 12)} al año · ahorras ₡${fmt.format((monthly - value) * 12)}` }
}

const registerFor = (code) => (code === "INVOICING" ? LANDING.registerInvoicingUrl : `${LANDING.registerUrl}?plan=${code.toLowerCase()}`)

function card(p, billing) {
  const meta = META[p.code] ?? { name: p.code, for: "" }
  const price = priceText(p.code, billing)
  const el = document.createElement("article")
  el.className = `plan${meta.featured ? " featured" : ""}`
  el.innerHTML = `
    ${meta.featured ? '<span class="plan-badge">Más popular</span>' : ""}
    <div><h3></h3><p class="plan-for"></p></div>
    <div class="price"><span class="amount"></span><span class="per"></span></div>
    <p class="price-note"></p>
    <ul></ul>
    <a class="btn ${meta.featured ? "btn-accent" : "btn-ghost"}">Empezar</a>`
  el.querySelector("h3").textContent = meta.name
  el.querySelector(".plan-for").textContent = meta.for
  el.querySelector(".amount").textContent = price.amount
  el.querySelector(".per").textContent = billing === "annual" ? "/mes, pago anual" : "/mes"
  el.querySelector(".price-note").textContent = price.note
  const ul = el.querySelector("ul")
  for (const f of features(p)) {
    const li = document.createElement("li")
    li.textContent = f
    ul.append(li)
  }
  const a = el.querySelector("a")
  a.href = registerFor(p.code)
  a.setAttribute("aria-label", `Empezar con el plan ${meta.name}`)
  return el
}

export async function initPricing() {
  const box = document.getElementById("plans")
  if (!box) return
  let billing = "monthly"
  let plans = []

  const save = document.getElementById("annual-save")
  if (save && LANDING.annualLabel) save.textContent = `· ${LANDING.annualLabel}`
  const trial = document.getElementById("trial-line")
  if (trial && LANDING.trialDays) trial.textContent = `Prueba gratis ${LANDING.trialDays} días, sin tarjeta`

  const render = () => {
    if (!plans.length) return
    box.replaceChildren(...plans.map((p) => card(p, billing)))
  }
  for (const b of document.querySelectorAll("[data-billing]")) {
    b.addEventListener("click", () => {
      billing = b.dataset.billing
      for (const o of document.querySelectorAll("[data-billing]")) o.setAttribute("aria-pressed", String(o === b))
      render()
    })
  }

  try {
    const res = await fetch(`${API}/plans`)
    if (!res.ok) throw new Error(String(res.status))
    plans = await res.json()
    render()
  } catch {
    box.innerHTML = '<p class="plans-loading">No se pudieron cargar los planes. Recarga la página o escríbenos.</p>'
  }
}
