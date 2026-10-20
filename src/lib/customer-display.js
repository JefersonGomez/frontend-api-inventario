// Pantalla del cliente: segunda ventana (/pos/cliente) en otro monitor de la misma computadora.
// La caja le manda lo que está pasando por BroadcastChannel (sin servidor de por medio). Al abrirse,
// la pantalla pide el estado ("hello") y la caja lo reenvía.
const NAME = "stockly-customer-display"

export function openChannel(onMessage) {
  if (typeof BroadcastChannel === "undefined") return { post: () => {}, close: () => {} }
  const channel = new BroadcastChannel(NAME)
  if (onMessage) channel.onmessage = (e) => onMessage(e.data)
  return { post: (data) => channel.postMessage(data), close: () => channel.close() }
}

export const openCustomerWindow = () =>
  window.open("/pos/cliente", "stockly-cliente", "popup,width=1024,height=768")
