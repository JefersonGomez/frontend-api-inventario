import { useQuery } from "@tanstack/react-query"
import { getMe } from "@/api/auth"
import { useAuth } from "@/context/AuthContext"
import { cached } from "@/lib/offline-sales"

// Permisos efectivos (rol + ajustes) en la empresa activa. Solo deciden qué se MUESTRA:
// el backend valida cada petición. Se releen cuando el admin cambia el acceso (socket → "me").
export function usePermissions() {
  const { token } = useAuth()
  const { data, isSuccess } = useQuery({
    queryKey: ["me"],
    queryFn: cached("me", getMe), // sin red, los últimos permisos guardados (la caja sigue abriendo)
    enabled: !!token,
    staleTime: 5 * 60_000,
    networkMode: "always",
  })
  const permissions = data?.permissions ?? []
  return {
    ready: isSuccess,
    role: data?.role,
    hasPin: data?.hasPin === true,
    // ubicaciones: dónde trabaja (null = todas) y en cuál está (null = todas las suyas)
    locationIds: data?.locationIds ?? null,
    activeLocationId: data?.activeLocationId ?? null,
    // código de caja: vencimiento y hasta cuándo no puede cambiarlo
    code: {
      hasPin: data?.hasPin === true,
      pinExpiresAt: data?.pinExpiresAt ?? null,
      pinExpired: data?.pinExpired === true,
      pinExpiringSoon: data?.pinExpiringSoon === true,
      pinLockedUntil: data?.pinLockedUntil ?? null,
    },
    can: (p) => permissions.includes(p),
  }
}
