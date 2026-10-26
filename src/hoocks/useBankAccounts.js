import { useQuery } from "@tanstack/react-query"
import { getBankAccounts } from "@/api/banks"
import { usePermissions } from "@/hoocks/usePermissions"

// Cuentas bancarias de la empresa. Solo para quien puede verlas (banks.manage o cash.reconcile):
// sin permiso no se pide nada y los selectores de cuenta no se muestran.
export function useBankAccounts() {
  const { can } = usePermissions()
  return useQuery({ queryKey: ["banks", "accounts"], queryFn: getBankAccounts, enabled: can("banks.manage") || can("cash.reconcile") })
}
