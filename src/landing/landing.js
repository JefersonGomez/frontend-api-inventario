// Landing de Cubivo: tema claro/oscuro, menú del celular, enlaces del archivo de configuración y el
// contador de stock de la portada. Sin dependencias: la página tiene que cargar rápido.
import "./landing.css"
import { LANDING } from "./config.js"
import { initPricing } from "./pricing.js"
import { initTour } from "./tour.js"
import { initContact, initFaq } from "./contact.js"

const root = document.documentElement
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

// enlaces que vienen de la configuración (registro, demo, inicio de sesión…)
for (const a of document.querySelectorAll("[data-href]")) {
  const url = LANDING[a.dataset.href]
  if (url) a.setAttribute("href", url)
}

// tema: el del sistema hasta que la persona elija; su elección queda guardada
const themeBtn = document.getElementById("theme-toggle")
const systemDark = window.matchMedia("(prefers-color-scheme: dark)")
const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : systemDark.matches)
const labelTheme = () => themeBtn.setAttribute("aria-label", isDark() ? "Cambiar a modo claro" : "Cambiar a modo oscuro")
labelTheme()
systemDark.addEventListener("change", labelTheme)
themeBtn.addEventListener("click", () => {
  root.dataset.theme = isDark() ? "light" : "dark"
  try {
    localStorage.setItem("cubivo.landing.theme", root.dataset.theme)
  } catch {
    // sin almacenamiento: dura lo que la visita
  }
  labelTheme()
})

// menú del celular
const menuBtn = document.getElementById("menu-toggle")
const menu = document.getElementById("mobile-menu")
const setMenu = (open) => {
  menuBtn.setAttribute("aria-expanded", String(open))
  menuBtn.setAttribute("aria-label", open ? "Cerrar el menú" : "Abrir el menú")
  menu.hidden = !open
}
menuBtn.addEventListener("click", () => setMenu(menu.hidden))
menu.addEventListener("click", (e) => e.target.closest("a") && setMenu(false))
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menu.hidden) {
    setMenu(false)
    menuBtn.focus()
  }
})
window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => e.matches && setMenu(false))

// portada: el cubo se anima cuando entra en pantalla; cada producto que entra suma al stock de la tarjetita
const art = document.querySelector(".hero-art")
const count = document.querySelector(".count")
function startCounter() {
  if (!count || reduceMotion) return
  let n = Number(count.dataset.from)
  const fmt = new Intl.NumberFormat("es-CR")
  count.textContent = fmt.format(n)
  setTimeout(() => {
    setInterval(() => {
      n += 1 + Math.floor(Math.random() * 6)
      count.textContent = fmt.format(n)
    }, 1200)
  }, 5080) // al ritmo de la animación: el primer producto entra a los ~5 s
}
if (art) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      art.classList.add("play")
      startCounter()
      io.disconnect()
    }
  }, { threshold: 0.35 })
  io.observe(art)
}

initPricing()
initTour()
initContact()
initFaq()
