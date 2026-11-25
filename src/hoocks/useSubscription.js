import { useQuery } from "@tanstack/react-query"
import { getSubscription } from "@/api/billing"
import { usePlatformOwner } from "@/hoocks/usePlatformOwner"

// Estado de la suscripción de la cuenta dueña de la empresa activa (prueba, al día, gracia, vencida).
// Con el cobro apagado en el servidor (enabled: false) no se muestra nada.
export function useSubscription() {
  const { isPlatformOwner, isLoading: ownerLoading } = usePlatformOwner()
  const { data, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
    enabled: !ownerLoading && !isPlatformOwner,
    staleTime: 5 * 60_000,
  })
  return { sub: data, isLoading, active: data?.enabled === true }
}
