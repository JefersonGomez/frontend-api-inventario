import { useQuery } from "@tanstack/react-query"
import { getCompany } from "@/api/company"
import { moneyFormatter } from "@/lib/money"

// Formateador de montos con la moneda de la empresa activa: { format, compact, currency }
// Comparte la query ["company"] con el resto de la app (no agrega peticiones).
export function useMoney() {
  const { data } = useQuery({ queryKey: ["company"], queryFn: getCompany })
  return moneyFormatter(data?.currency)
}
