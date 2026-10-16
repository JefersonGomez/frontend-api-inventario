import { createContext, useContext, useEffect, useState } from "react"
import { api } from "@/api/client" // ajustá el path si el archivo se llama distinto
import { switchCompanyRequest } from "@/api/company"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"))
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser && savedUser !== "undefined") {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error("Error al parsear el usuario almacenado:", e);
        return null;
      }
    }
    return null;
  });

  // Las pestañas comparten localStorage: si otra pestaña cierra sesión o entra con otro usuario,
  // esta recarga (así también se descarta la caché de react-query con datos del usuario anterior).
  // El evento "storage" solo llega a las OTRAS pestañas, nunca a la que hizo el cambio.
  const userId = user?.id
  useEffect(() => {
    function onStorage(e) {
      if (e.key === "token") setToken(e.newValue) // refresh hecho en otra pestaña
      if (e.key === "companyId") return window.location.reload() // otra pestaña cambió de empresa
      if (e.key === "locationId") return window.location.reload() // u otra ubicación
      if (e.key !== "user" && e.key !== null) return // key null = localStorage.clear()
      let next
      try {
        next = e.newValue ? JSON.parse(e.newValue) : null
      } catch {
        next = null
      }
      if (next?.id !== userId) window.location.reload()
      else if (next) setUser(next) // mismo usuario, cambió su perfil
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [userId])

  // companyId = empresa activa de la sesión (las otras pestañas recargan si cambia)
  function login(newToken, newRefreshToken, newUser, companyId) {
    localStorage.setItem("token", newToken)
    localStorage.setItem("refreshToken", newRefreshToken)
    localStorage.setItem("user", JSON.stringify(newUser))
    if (companyId) localStorage.setItem("companyId", companyId)
    localStorage.removeItem("locationId") // las ubicaciones son de cada empresa
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

  // ← ahora es async, y avisa al backend para revocar el refresh token
  async function logout() {
    const refreshToken = localStorage.getItem("refreshToken")
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken })
      }
    } catch {
      // si el backend no responde, igual cerramos sesión localmente
    } finally {
      localStorage.removeItem("token")
      localStorage.removeItem("refreshToken") // ← nuevo
      localStorage.removeItem("user")
      localStorage.removeItem("companyId")
      localStorage.removeItem("locationId")
      setToken(null)
      setUser(null)
    }
  }

  function updateUser(partialData) {
    setUser((prev) => {
      const updated = { ...prev, ...partialData }
      localStorage.setItem("user", JSON.stringify(updated))
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