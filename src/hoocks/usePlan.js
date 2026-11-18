import { useQuery } from "@tanstack/react-query"
import { getCompany } from "@/api/company"

// Plan de la empresa activa. invoicingOnly = plan "Solo facturación": sin inventario ni cajas,
// el menú y las pantallas muestran solo lo de facturar (el backend también lo hace cumplir).
export function usePlan() {
  const { data, isLoading } = useQuery({ queryKey: ["company"], queryFn: getCompany })
  return {
    plan: data?.plan,
    limits: data?.limits,
    usage: data?.usage,
    invoicingOnly: data?.limits?.invoicingOnly === true,
    isLoading,
  }
}
