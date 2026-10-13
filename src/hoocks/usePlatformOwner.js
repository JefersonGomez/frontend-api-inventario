import { useQuery } from "@tanstack/react-query"
import { getProfile } from "@/api/profile"

// El dueño de la plataforma solo ve la plataforma, no la app de un cliente.
// Es una decisión de interfaz: el backend valida el permiso en cada petición.
export function usePlatformOwner() {
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: getProfile, staleTime: 5 * 60_000 })
  return { isPlatformOwner: data?.isPlatformOwner === true, isLoading }
}
