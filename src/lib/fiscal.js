// Identificación fiscal: mismas reglas que el backend (shared/fiscal.ts). El número va sin guiones.
const ID_RULES = {
  FISICA: /^\d{9}$/,
  JURIDICA: /^\d{10}$/,
  DIMEX: /^\d{11,12}$/,
  NITE: /^\d{10}$/,
  EXTRANJERO: /^[A-Za-z0-9]{1,20}$/,
}
export const ID_TYPES = Object.keys(ID_RULES)
export const cleanIdNumber = (v) => (v ?? "").replace(/[\s-]/g, "").toUpperCase()
export const isValidId = (idType, idNumber) => !idType || ID_RULES[idType].test(cleanIdNumber(idNumber))

// "Cédula física · 112340567" (para tablas); null si no tiene
export function formatFiscalId(t, idType, idNumber) {
  return idType && idNumber ? `${t(`fiscal.types.${idType}`)} · ${idNumber}` : null
}
