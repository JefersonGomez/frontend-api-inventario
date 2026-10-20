import { createContext, useContext, useEffect, useState } from "react"
import { api } from "@/api/client" // ajustá el path si el archivo se llama distinto
import { switchCompanyRequest } from "@/api/company"
import { accountKey, endSession, getRefreshToken, getSession, getToken, startSession, updateSession } from "@/lib/session"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken())
  const [user, setUser] = useState(() => getSession()?.user ?? null)

  // Cada pestaña está con SU cuenta (lib/session): otra pestaña puede estar con otra persona sin
  // afectarla. Solo se escucha la cuenta propia: refresh, cambio de empresa o cierre de sesión hechos
  // en otra pestaña del mismo usuario. El evento "storage" solo llega a las OTRAS pestañas.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    const key = accountKey(userId)
    const companyId = getSession()?.companyId
    function onStorage(e) {
      if (e.key !== key && e.key !== null) return // key null = localStorage.clear()
      let next
      try {
        next = e.newValue ? JSON.parse(e.newValue) : null
      } catch {
        next = null
      }
      if (!next) return window.location.reload() // cerró sesión en otra pestaña
      if (next.companyId !== companyId) return window.location.reload() // cambió de empresa
      setToken(next.token) // refresh hecho en otra pestaña
      setUser(next.user) // cambió su perfil
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [userId])

  // Entra en ESTA pestaña con esa cuenta; companyId = empresa activa de la sesión
  function login(newToken, newRefreshToken, newUser, companyId) {
    startSession({ token: newToken, refreshToken: newRefreshToken, user: newUser, companyId })
    setToken(newToken)
    setUser(newUser)
  }

  // Cambiar de empresa = sesión nueva en esa empresa. Se recarga en el panel: así no queda
  // caché ni pantallas con datos de la empresa anterior.
  async function switchCompany(companyId) {
    const data = await switchCompanyRequest(companyId)
    login(data.token, data.refreshToken, data.user, data.company.id)
    window.location.assign("/")
  }

  // Avisa al backend para revocar el refresh token y cierra la sesión de esta cuenta
  async function logout() {
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken })
      }
    } catch {
      // si el backend no responde, igual cerramos sesión localmente
    } finally {
      endSession()
      setToken(null)
      setUser(null)
    }
  }

  function updateUser(partialData) {
    setUser((prev) => {
      const updated = { ...prev, ...partialData }
      updateSession({ user: updated })
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser, switchCompany }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}