import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

export function AdminRoute({ children }) {
  const { user } = useAuth()

  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />
  }

  return children
}