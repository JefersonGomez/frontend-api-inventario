// Datos de la landing de Cubivo que todavía están pendientes o pueden cambiar: TODO en este archivo.
// Lo que diga null o "[...]" se muestra como marcador hasta que se defina (fase de planes de pago).
export const LANDING = {
  // enlaces de la app (misma dirección que la landing)
  registerUrl: "/register",
  registerInvoicingUrl: "/register?plan=facturacion", // deja marcada la opción "Solo facturar"
  loginUrl: "/login",
  demoUrl: "/login?demo=admin", // entra directo a la ferretería de ejemplo (si la demo está activa)

  // contacto (pendiente)
  whatsapp: null, // solo dígitos con código de país, p. ej. "50688887777"
  whatsappMessage: "Hola, quiero saber más de Cubivo",
  email: null, // p. ej. "hola@cubivo.cr"
  linkedin: null,

  // planes de pago (pendiente: fase de planes)
  prices: { INVOICING: null, BASIC: null, PRO: null, BUSINESS: null }, // colones por mes
  annualDiscountPercent: null,
  trialDays: null,
  paymentMethods: null, // p. ej. "Tarjeta de crédito o débito (ONVO)"
}
