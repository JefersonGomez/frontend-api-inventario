// Contacto y preguntas frecuentes: enlaces de WhatsApp, correo y LinkedIn desde config.js (lo que esté en
// null no se muestra) y el acordeón (una sola respuesta abierta a la vez).
import { LANDING } from "./config.js"

export function initContact() {
  const wa = LANDING.whatsapp ? `https://wa.me/${LANDING.whatsapp}?text=${encodeURIComponent(LANDING.whatsappMessage ?? "")}` : null
  for (const a of document.querySelectorAll("[data-wa]")) {
    if (wa) {
      a.href = wa
      a.target = "_blank"
      a.rel = "noopener"
      a.hidden = false
    } else {
      a.closest("li")?.remove()
      a.hidden = true
    }
  }
  for (const a of document.querySelectorAll("[data-mail]")) {
    if (LANDING.email) {
      a.href = `mailto:${LANDING.email}`
      a.textContent = LANDING.email
    } else a.closest("li")?.remove()
  }
  for (const a of document.querySelectorAll("[data-linkedin]")) {
    if (LANDING.linkedin) a.href = LANDING.linkedin
    else a.closest("li")?.remove()
  }
  const year = document.getElementById("year")
  if (year) year.textContent = String(new Date().getFullYear())
}

export function initFaq() {
  const buttons = [...document.querySelectorAll(".acc-btn")]
  const setOpen = (btn, open) => {
    btn.setAttribute("aria-expanded", String(open))
    document.getElementById(btn.getAttribute("aria-controls")).hidden = !open
  }
  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true"
      for (const other of buttons) if (other !== btn) setOpen(other, false)
      setOpen(btn, open)
    })
  }
}
