// src/hooks/usePurchaseRequestAlerts.js
import { useQuery } from "@tanstack/react-query";
import { getPurchaseRequestAlerts } from "@/api/PurchaseRequests";
import { usePermissions } from "@/hoocks/usePermissions";

export function usePurchaseRequestAlerts() {
  const { can } = usePermissions();
  return useQuery({
    queryKey: ["purchase-request-alerts"],
    queryFn: getPurchaseRequestAlerts,
    enabled: can("purchases.manage"),
    refetchInterval: 300_000, // respaldo: los cambios llegan por socket (useRealtime)
  });
}