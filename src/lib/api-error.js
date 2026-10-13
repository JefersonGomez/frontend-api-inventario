// Mensaje legible de un error de la API. El backend devuelve `error` como texto
// o, cuando falla la validación, como lista de problemas ({ message, path }).
export function apiErrorMessage(error, fallback) {
  const data = error?.response?.data?.error
  if (typeof data === "string") return data
  if (Array.isArray(data) && typeof data[0]?.message === "string") return data[0].message
  return fallback
}
