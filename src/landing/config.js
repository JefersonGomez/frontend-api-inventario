// Datos de la landing de Cubivo que todavía están pendientes o pueden cambiar: TODO en este archivo.
// Lo que diga null o "[...]" se muestra como marcador hasta que se defina (fase de planes de pago).
export const LANDING = {
  // enlaces de la app (misma dirección que la landing)
  registerUrl: "/register",
  registerInvoicingUrl: "/register?plan=facturacion", // deja marcada la opción "Solo facturar"
  loginUrl: "/login",
  demoUrl: "/login?demo=admin", // entra directo a la ferretería de ejemplo (si la demo está activa)

  // contacto (null = no se muestra)
  whatsapp: "50661718236", // solo dígitos con código de país (506 = Costa Rica)
  whatsappMessage: "Hola, quiero saber más de Cubivo",
  email: "hola@cubivo.org", // llega a la bandeja de Cubivo (reenvío con ImprovMX)
  linkedin: null, // opcional (el usuario lo dejó a criterio): "https://www.linkedin.com/in/jefersonbustamantegomez/"

  // planes (decididos el 22-nov-2026; colones, IVA incluido). La fase de cobro los lleva al backend.
  prices: { INVOICING: 5900, BASIC: 14900, PRO: 29900, BUSINESS: 59900 }, // por mes, pago mensual
  annualPrices: { INVOICING: 4900, BASIC: 12400, PRO: 24900, BUSINESS: 49900 }, // por mes, pago anual (≈ 2 meses gratis)
  annualLabel: "2 meses gratis",
  trialDays: 14,
  paymentMethods: "Con tarjeta de crédito o débito, o por SINPE Móvil", // cobro con ONVO
}
