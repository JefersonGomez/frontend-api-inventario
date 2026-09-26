import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {api} from "@/api/client"

const getNotifications = () => api.get("/notifications").then((res) => res.data)

export function useNotifications() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: user?.role === "ADMIN",
    refetchInterval: 60_000,
  })
}