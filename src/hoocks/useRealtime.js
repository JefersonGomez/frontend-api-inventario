import { useEffect } from "react"
import { io } from "socket.io-client"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { getProfile } from "@/api/profile"
import { API_URL } from "@/api/client"

// El servidor solo avisa "esto cambió" (topics = raíces de queryKey); los datos se vuelven a pedir por la API.
export function useRealtime() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    // función: cada (re)conexión lee el token más reciente (el interceptor de axios lo renueva)
    const socket = io(API_URL, {
      auth: (cb) => cb({ token: localStorage.getItem("token") }),
    })

    socket.on("invalidate", (topics) => {
      topics.forEach((topic) => queryClient.invalidateQueries({ queryKey: [topic] }))
    })

    // Token vencido: el servidor rechaza y socket.io no reintenta solo. Una llamada a la API
    // dispara el refresh del interceptor de axios; con el token nuevo se reconecta.
    let retries = 0
    socket.on("connect", () => { retries = 0 })
    socket.on("connect_error", (err) => {
      if (err.message === "unauthorized" && retries++ < 2) {
        getProfile().then(() => socket.connect()).catch(() => {})
      }
    })

    return () => socket.disconnect()
  }, [userId, queryClient])
}
