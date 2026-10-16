// Mismas reglas que el backend (pin.service.ts): 4 a 6 dígitos, nada de repetidos ni seguidos
export const isObviousPin = (pin) => /^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)

// Código de 6 dígitos al azar (crypto del navegador) que cumple las reglas
export function randomPin() {
  const n = new Uint32Array(1)
  let pin
  do {
    crypto.getRandomValues(n)
    pin = String(n[0] % 1_000_000).padStart(6, "0")
  } while (isObviousPin(pin))
  return pin
}
