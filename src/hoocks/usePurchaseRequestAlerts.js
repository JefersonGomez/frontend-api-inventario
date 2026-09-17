// src/hooks/usePurchaseRequestAlerts.js
import { useQuery } from "@tanstack/react-query";
import { getPurchaseRequestAlerts } from "@/api/PurchaseRequests";
import { useAuth } from "@/context/AuthContext";

export function usePurchaseRequestAlerts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["purchase-request-alerts"],
    queryFn: getPurchaseRequestAlerts,
    enabled: user?.role === "ADMIN",
    refetchInterval: 60_000,
  });
}