import { createContext, useContext, useState } from "react"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"))
  // ✅ CÓDIGO CORREGIDO
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

  function login(newToken, newUser) {
    localStorage.setItem("token", newToken)
    localStorage.setItem("user", JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
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