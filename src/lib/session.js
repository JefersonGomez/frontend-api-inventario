// Sesión por cuenta y por pestaña. Antes todo vivía en claves globales de localStorage ("token",
// "user"…) y entrar como cajero en una pestaña pisaba al administrador de la otra.
//  - Cada cuenta guarda lo suyo en localStorage "stockly.acct.<userId>" { token, refreshToken, user, companyId }:
//    las pestañas del MISMO usuario lo comparten (el refresh rotativo sigue sincronizado).
//  - Cada pestaña recuerda en sessionStorage con qué cuenta está y en qué ubicación (el POS fija la suya).
//  - Una pestaña nueva arranca con la última cuenta que inició sesión ("stockly.lastAccount").
const ACCOUNT = "stockly.account"
const LAST = "stockly.lastAccount"
const LOCATION = "stockly.locationId"
export const accountKey = (userId) => `stockly.acct.${userId}`

const read = (store, key) => {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}
const write = (store, key, value) => {
  try {
    if (value == null) store.removeItem(key)
    else store.setItem(key, value)
  } catch {
    // sin almacenamiento (modo privado estricto): la sesión dura lo que la pestaña
  }
}

// sesiones guardadas con las claves viejas (antes de esto): se pasan a su cuenta una sola vez
function migrateLegacy() {
  const token = read(localStorage, "token")
  if (!token) return
  try {
    const user = JSON.parse(read(localStorage, "user"))
    if (user?.id) {
      write(localStorage, accountKey(user.id), JSON.stringify({
        token, refreshToken: read(localStorage, "refreshToken"), user, companyId: read(localStorage, "companyId"),
      }))
      write(localStorage, LAST, user.id)
    }
  } catch {
    // usuario ilegible: se descarta y vuelve a iniciar sesión
  }
  for (const k of ["token", "refreshToken", "user", "companyId", "locationId"]) write(localStorage, k, null)
}
migrateLegacy()

export function currentAccountId() {
  let id = read(sessionStorage, ACCOUNT)
  if (!id) {
    id = read(localStorage, LAST)
    if (id) write(sessionStorage, ACCOUNT, id)
  }
  return id
}

export function getSession() {
  const id = currentAccountId()
  if (!id) return null
  try {
    return JSON.parse(read(localStorage, accountKey(id))) ?? null
  } catch {
    return null
  }
}

export const getToken = () => getSession()?.token ?? null
export const getRefreshToken = () => getSession()?.refreshToken ?? null

// Inicia (o reemplaza) la sesión de ESTA pestaña con esa cuenta
export function startSession({ token, refreshToken, user, companyId }) {
  write(sessionStorage, ACCOUNT, user.id)
  write(sessionStorage, LOCATION, null) // las ubicaciones son de cada empresa
  write(localStorage, LAST, user.id)
  write(localStorage, accountKey(user.id), JSON.stringify({ token, refreshToken, user, companyId: companyId ?? null }))
}

export function updateSession(patch) {
  const id = currentAccountId()
  const current = getSession()
  if (id && current) write(localStorage, accountKey(id), JSON.stringify({ ...current, ...patch }))
}

// Cierra la sesión de esta cuenta (también en las otras pestañas de la misma cuenta)
export function endSession() {
  const id = currentAccountId()
  if (id) {
    write(localStorage, accountKey(id), null)
    if (read(localStorage, LAST) === id) write(localStorage, LAST, null)
  }
  write(sessionStorage, ACCOUNT, null)
  write(sessionStorage, LOCATION, null)
}

// Ubicación elegida en esta pestaña (sin ella: todas las de la persona)
export const getLocationId = () => read(sessionStorage, LOCATION)
export const setLocationId = (id) => write(sessionStorage, LOCATION, id || null)
