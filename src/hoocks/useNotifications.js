import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getNotifications } from "@/api/notifications";

// Disponible para ADMIN y EMPLOYE: el backend decide qué ve cada rol.
export function useNotifications() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: !!user,
    refetchInterval: 300_000, // respaldo: los cambios llegan por socket (useRealtime)
  })
}
