import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { CheckCircle2, Circle, X } from "lucide-react"
import { getOnboarding, setOnboardingDismissed } from "@/api/company"
import { usePermissions } from "@/hoocks/usePermissions"
import { Button } from "@/components/ui/button"

// Guía de primeros pasos para quien administra la empresa: lo que falta para dejarla lista. Cada paso se
// marca solo (lo calcula el servidor con los datos reales). Se oculta al completarla o con la X.
export function OnboardingCard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const enabled = can("company.manage")
  const { data } = useQuery({ queryKey: ["onboarding"], queryFn: getOnboarding, enabled })
  const dismiss = useMutation({
    mutationFn: () => setOnboardingDismissed(true),
    onSuccess: (next) => queryClient.setQueryData(["onboarding"], next),
  })

  if (!enabled || !data || data.dismissed || data.completed === data.total) return null
  const pct = Math.round((data.completed / data.total) * 100)

  return (
    <section className="stk-card" aria-labelledby="onboarding-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="onboarding-title" className="font-semibold">{t("onboarding.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("onboarding.subtitle", { done: data.completed, total: data.total })}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => dismiss.mutate()} aria-label={t("onboarding.hide")} title={t("onboarding.hide")}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="my-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t("onboarding.subtitle", { done: data.completed, total: data.total })}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <ol className="grid gap-1 sm:grid-cols-2">
        {data.steps.map((s) => (
          <li key={s.key}>
            <Link
              to={s.link}
              className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted ${s.done ? "text-muted-foreground" : ""}`}
            >
              {s.done
                ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--stk-ok-mid)]" aria-label={t("onboarding.done")} />
                : <Circle className="mt-0.5 h-4 w-4 shrink-0" aria-label={t("onboarding.pending")} />}
              <span>
                <span className={s.done ? "line-through" : "font-medium"}>{t(`onboarding.steps.${s.key}.title`)}</span>
                {!s.done && (
                  <span className="block text-xs text-muted-foreground">
                    {s.key === "taxes" && s.meta
                      ? t("onboarding.steps.taxes.missing", { cabys: s.meta.withoutCabys, pending: s.meta.pending })
                      : t(`onboarding.steps.${s.key}.hint`)}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
