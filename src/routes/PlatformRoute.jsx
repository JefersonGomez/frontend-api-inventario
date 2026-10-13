import { Navigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getProfile } from "@/api/profile"

// Solo el dueño de la plataforma. Es una comodidad de la interfaz: el backend responde 403 a cualquier otro.
export function PlatformRoute({ children }) {
  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: getProfile, staleTime: 5 * 60_000 })
  if (isLoading) return null
  if (!profile?.isPlatformOwner) return <Navigate to="/" replace />
  return children
}
