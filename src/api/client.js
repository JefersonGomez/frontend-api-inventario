import axios from 'axios'

// URL del backend: VITE_API_URL en .env (ver .env.example); en desarrollo, localhost:3000
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // ubicación elegida en el selector (sin ella: todas las de la persona); el backend la valida
  const locationId = localStorage.getItem("locationId")
  if (locationId) config.headers["X-Location-Id"] = locationId
  return config
})

// --- nuevo: interceptor de response, maneja el refresh automático ---

let refreshPromise = null

// El refresh token rota: si dos pestañas lo renuevan a la vez, la segunda manda uno ya
// invalidado y cierra la sesión. El lock del navegador las pone en fila, y la que llega tarde
// ve que el token ya no es el que falló (lo cambió otra pestaña) y lo reutiliza.
async function refreshAccessToken(failedToken) {
  const run = async () => {
    const current = localStorage.getItem("token")
    if (current && current !== failedToken) return current

    const refreshToken = localStorage.getItem("refreshToken")
    if (!refreshToken) {
      throw new Error("No hay refresh token")
    }

    // axios "pelado", no la instancia "api" — evita pasar de nuevo por este interceptor
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken,
    })

    const { token, refreshToken: newRefreshToken } = response.data
    localStorage.setItem("token", token)
    localStorage.setItem("refreshToken", newRefreshToken)
    return token
  }
  return navigator.locks ? navigator.locks.request("stockly-auth-refresh", run) : run()
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        if (!refreshPromise) {
          const failedToken = String(originalRequest.headers?.Authorization ?? "").replace(/^Bearer /, "")
          refreshPromise = refreshAccessToken(failedToken).finally(() => {
            refreshPromise = null
          })
        }

        const newToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem("token")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("user")
        window.location.href = "/login"
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)