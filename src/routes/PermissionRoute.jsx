import { Navigate } from "react-router-dom"
import { usePermissions } from "@/hoocks/usePermissions"

// Pantalla solo para quien tiene el permiso (el backend igual responde 403 sin él)
export function PermissionRoute({ perm, children }) {
  const { ready, can } = usePermissions()
  if (!ready) return null
  // perm: uno o varios (alcanza con cualquiera)
  if (![perm].flat().some(can)) return <Navigate to="/" replace />
  return children
}
