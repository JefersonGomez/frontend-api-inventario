import { useQueryClient } from "@tanstack/react-query"
import { getLocationId, setLocationId } from "@/lib/session"

// Fija la ubicación activa de esta pestaña en la sucursal de la caja: el stock del POS es el de ahí
export function useRegisterLocation() {
  const queryClient = useQueryClient()
  return (locationId) => {
    if (getLocationId() === locationId) return
    setLocationId(locationId)
    queryClient.invalidateQueries()
  }
}
