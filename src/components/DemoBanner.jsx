import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { FlaskConical } from "lucide-react"
import { getDemoInfo } from "@/api/auth"
import { useAuth } from "@/context/AuthContext"

// Aviso para quien entró a la demo pública: es de ejemplo, se reinicia cada noche y los códigos de caja
export function DemoBanner() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data } = useQuery({ queryKey: ["demo-info"], queryFn: getDemoInfo, enabled: !!user?.isDemo, staleTime: Infinity })
  if (!user?.isDemo) return null
  return (
    <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-[var(--stk-accent-strong)] bg-[var(--stk-accent-soft)] px-4 py-2 text-sm print:hidden">
      <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
      <span className="font-medium">{t("demo.banner")}</span>
      {data?.codes && (
        <span className="text-muted-foreground">
          {t("demo.codes", { cashier: data.codes.cashier, manager: data.codes.manager })}
        </span>
      )}
    </p>
  )
}
