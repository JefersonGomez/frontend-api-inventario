import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { CalendarClock, Lock, TriangleAlert } from "lucide-react"
import { useSubscription } from "@/hoocks/useSubscription"

// Aviso arriba de cada pantalla: días de prueba, días de gracia o cuenta en solo lectura.
// Al dueño lo lleva a "Mi suscripción"; a los demás les dice a quién avisarle.
const STYLES = {
  trial: { icon: CalendarClock, cls: "border-[var(--stk-accent-strong)] bg-[var(--stk-accent-soft)]" },
  grace: { icon: TriangleAlert, cls: "border-[var(--stk-warn-mid)] bg-[var(--stk-warn-bg)] text-[var(--stk-warn)]" },
  expired: { icon: Lock, cls: "border-[var(--stk-crit-mid)] bg-[var(--stk-crit-bg)] text-[var(--stk-crit)]" },
}

export function SubscriptionBanner() {
  const { t } = useTranslation()
  const { sub, active } = useSubscription()
  const style = active && STYLES[sub.state]
  if (!style) return null
  // durante la prueba solo lo ve el dueño (a los empleados no les incumbe)
  if (sub.state === "trial" && !sub.isOwner) return null
  const Icon = style.icon
  const plan = t(`billing.plans.${sub.plan}`)
  return (
    <p role={sub.state === "trial" ? "status" : "alert"} className={`mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-2 text-sm print:hidden ${style.cls}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="font-medium">{t(`billing.banner.${sub.state}`, { count: sub.daysLeft, plan })}</span>
      {sub.isOwner ? (
        <Link to="/subscription" className="font-semibold underline underline-offset-2">
          {t(sub.state === "trial" ? "billing.banner.seePlans" : "billing.banner.pay")}
        </Link>
      ) : (
        <span>{t("billing.banner.tellOwner", { name: sub.ownerName })}</span>
      )}
    </p>
  )
}
