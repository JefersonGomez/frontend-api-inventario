import { useQueryClient } from "@tanstack/react-query"

// Fija la ubicación activa en la sucursal de la caja: el stock que se ve en el POS es el de ahí
export function useRegisterLocation() {
  const queryClient = useQueryClient()
  return (locationId) => {
    try {
      if (localStorage.getItem("locationId") === locationId) return
      localStorage.setItem("locationId", locationId)
    } catch {
      // sin almacenamiento: se ve el stock de todas las ubicaciones
    }
    queryClient.invalidateQueries()
  }
}
