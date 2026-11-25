import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getPlans, updateSubscription } from "@/api/billing"
import { useSubscription } from "@/hoocks/useSubscription"
import { apiErrorMessage } from "@/lib/api-error"

// Mi suscripción (fase de cobro C1): estado de la prueba o del periodo pagado, elegir plan y periodo.
// El botón de pagar se enciende en la C2 (ONVO); por ahora explica que llega pronto.
const ORDER = ["INVOICING", "BASIC", "PRO", "BUSINESS"]
const BADGE = { trial: "secondary", active: "default", grace: "outline", expired: "destructive", exempt: "secondary" }

export function Subscription() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { sub, isLoading } = useSubscription()
  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: getPlans, staleTime: 5 * 60_000 })

  const locale = i18n.language?.startsWith("en") ? "en-US" : "es-CR"
  const money = (n) => `₡${new Intl.NumberFormat("es-CR").format(n)}`
  const date = (d) => (d ? new Date(d).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : "")

  const mutation = useMutation({
    mutationFn: updateSubscription,
    onSuccess: (data) => {
      queryClient.setQueryData(["subscription"], data)
      // el plan cambia límites, menú (solo facturación) y uso
      queryClient.invalidateQueries({ queryKey: ["company"] })
      queryClient.invalidateQueries({ queryKey: ["companies"] })
    },
  })

  if (isLoading || !sub) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const planName = (code) => t(`billing.plans.${code}`)

  if (!sub.enabled) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">{t("billing.title")}</h1>
        <Card>
          <CardContent className="space-y-2 pt-6">
            <p className="text-lg font-medium">{t("billing.yourPlan", { plan: planName(sub.plan) })}</p>
            <p className="text-muted-foreground">{t("billing.notEnabled")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const interval = sub.interval
  const canChange = sub.isOwner && sub.state !== "exempt" && sub.state !== "active"
  const priceOf = (code) => sub.prices[code]
  const perMonth = (code) => (interval === "ANNUAL" ? priceOf(code).annual : priceOf(code).monthly)
  const due = interval === "ANNUAL" ? priceOf(sub.plan).annual * 12 : priceOf(sub.plan).monthly

  const status = {
    trial: t("billing.status.trial", { date: date(sub.trialEndsAt), count: sub.daysLeft }),
    active: t("billing.status.active", { date: date(sub.paidUntil) }),
    grace: t("billing.status.grace", { date: date(sub.endsAt), until: date(sub.graceEndsAt) }),
    expired: t("billing.status.expired", { date: date(sub.graceEndsAt) }),
    exempt: t("billing.status.exempt"),
  }[sub.state]

  const choose = (data) => mutation.mutate(data)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("billing.title")}</h1>
        <p className="text-muted-foreground">{t("billing.subtitle", { days: sub.trialDays })}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{t("billing.yourPlan", { plan: planName(sub.plan) })}</CardTitle>
          <Badge variant={BADGE[sub.state]}>{t(`billing.state.${sub.state}`)}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>{status}</p>
          {!sub.isOwner && <p className="text-sm text-muted-foreground">{t("billing.ownerManages", { name: sub.ownerName })}</p>}

          {canChange && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="font-medium">{t("billing.due", { amount: money(due) })}</p>
                <p className="text-sm text-muted-foreground">
                  {interval === "ANNUAL" ? t("billing.dueAnnual", { perMonth: money(priceOf(sub.plan).annual) }) : t("billing.dueMonthly")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button disabled>
                  <CreditCard className="h-4 w-4" aria-hidden />
                  {t("billing.pay", { amount: money(due) })}
                </Button>
                <span className="text-xs text-muted-foreground">{t("billing.payComing")}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {sub.state !== "exempt" && (
        <section className="space-y-4" aria-labelledby="plans-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="plans-title" className="text-lg font-semibold">{t("billing.choosePlan")}</h2>
            <div className="inline-flex rounded-lg border p-1" role="group" aria-label={t("billing.interval")}>
              {["MONTHLY", "ANNUAL"].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={interval === value}
                  disabled={!canChange || mutation.isPending}
                  onClick={() => sub.interval !== value && choose({ interval: value })}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${interval === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t(`billing.intervals.${value}`)}
                </button>
              ))}
            </div>
          </div>

          {mutation.isError && (
            <p role="alert" className="text-sm text-[var(--stk-crit)]">
              {apiErrorMessage(mutation.error, t("billing.changeError"))}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ORDER.map((code) => {
              const limits = plans?.find((p) => p.code === code)
              const current = sub.plan === code
              return (
                <Card key={code} className={current ? "border-primary ring-1 ring-primary" : ""}>
                  <CardContent className="flex h-full flex-col gap-3 pt-6">
                    <div>
                      <p className="font-semibold">{planName(code)}</p>
                      <p className="text-sm text-muted-foreground">{t(`billing.for.${code}`)}</p>
                    </div>
                    <p>
                      <span className="text-2xl font-semibold">{money(perMonth(code))}</span>
                      <span className="text-sm text-muted-foreground"> {t("billing.perMonth")}</span>
                    </p>
                    {limits && (
                      <ul className="flex-1 space-y-1 text-sm">
                        {features(limits, t).map((f) => (
                          <li key={f} className="flex gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--stk-ok-mid)]" aria-hidden />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      variant={current ? "secondary" : "outline"}
                      disabled={current || !canChange || mutation.isPending}
                      onClick={() => choose({ plan: code })}
                    >
                      {current ? t("billing.current") : t("billing.choose")}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <p className="text-sm text-muted-foreground">{t("billing.downgradeNote")}</p>
        </section>
      )}
    </div>
  )
}

// lo principal de cada plan, desde sus límites reales (GET /plans)
function features(p, t) {
  const n = (v) => new Intl.NumberFormat("es-CR").format(v)
  const list = [p.maxUsersPerCompany == null ? t("billing.f.usersUnlimited") : t("billing.f.users", { count: p.maxUsersPerCompany })]
  if (p.invoicingOnly) list.push(t("billing.f.noInventory"))
  else {
    list.push(p.maxBranches == null ? t("billing.f.branchesUnlimited") : t("billing.f.branches", { count: p.maxBranches }))
    list.push(p.maxProducts == null ? t("billing.f.productsUnlimited") : t("billing.f.products", { count: p.maxProducts, n: n(p.maxProducts) }))
  }
  list.push(p.documentsPerMonth == null ? t("billing.f.documentsUnlimited") : t("billing.f.documents", { n: n(p.documentsPerMonth) }))
  list.push(t("billing.f.ai", { n: n(p.aiChatsPerMonth) }))
  return list
}
