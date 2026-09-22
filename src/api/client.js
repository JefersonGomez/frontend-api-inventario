import axios from 'axios'

export const api = axios.create({
  baseURL: "http://localhost:3000",
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// --- nuevo: interceptor de response, maneja el refresh automático ---

let refreshPromise = null

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refreshToken")
  if (!refreshToken) {
    throw new Error("No hay refresh token")
  }

  // axios "pelado", no la instancia "api" — evita pasar de nuevo por este interceptor
  const response = await axios.post("http://localhost:3000/auth/refresh", {
    refreshToken,
  })

  const { token, refreshToken: newRefreshToken } = response.data
  localStorage.setItem("token", token)
  localStorage.setItem("refreshToken", newRefreshToken)
  return token
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
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