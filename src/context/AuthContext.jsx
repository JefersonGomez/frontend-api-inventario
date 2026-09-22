import { createContext, useContext, useState } from "react"
import { api } from "@/api/client" // ajustá el path si el archivo se llama distinto

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

  // ← nuevo parámetro newRefreshToken
  function login(newToken, newRefreshToken, newUser) {
    localStorage.setItem("token", newToken)
    localStorage.setItem("refreshToken", newRefreshToken) // ← nuevo
    localStorage.setItem("user", JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
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
    <AuthContext.Provider value={{ token, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}