import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getPlatformSubscriptions, updatePlatformSubscription } from "@/api/platform"
import { apiErrorMessage } from "@/lib/api-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Suscripciones de todas las cuentas (cobro C5): estado, plan, cómo pagan, ingresos del mes y últimos pagos.
// Soporte: regalar 7 días (a la prueba o al periodo pagado) y marcar / quitar cuenta interna.
const BADGE = { trial: "secondary", active: "default", grace: "outline", expired: "destructive", exempt: "secondary", none: "outline" }

export function SubscriptionsPanel() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({ queryKey: ["platform-subscriptions"], queryFn: getPlatformSubscriptions })
  const [error, setError] = useState(null)
  const mutation = useMutation({
    mutationFn: updatePlatformSubscription,
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ["platform-subscriptions"] })
    },
    onError: (err) => setError(apiErrorMessage(err, t("platform.subs.error"))),
  })
  const money = (n) => `₡${new Intl.NumberFormat("es-CR").format(n)}`
  const day = (d) => (d ? new Date(d).toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" }) : "—")

  if (isLoading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  if (isError) return <p role="alert" className="text-sm text-destructive">{t("platform.subs.error")}</p>
  const { enabled, totals, subscriptions, payments } = data

  return (
    <div className="space-y-5">
      {!enabled && <p className="rounded-lg bg-[var(--stk-warn-bg)] px-3 py-2 text-sm text-[var(--stk-warn)]">{t("platform.subs.disabled")}</p>}
      {enabled && !data.invoicing && <p className="rounded-lg bg-[var(--stk-warn-bg)] px-3 py-2 text-sm text-[var(--stk-warn)]">{t("platform.subs.noInvoicing")}</p>}

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["mrr", money(totals.mrr)],
          ["monthRevenue", money(totals.monthRevenue)],
          ["active", totals.active],
          ["trial", totals.trial],
          ["grace", totals.grace],
          ["expired", totals.expired],
        ].map(([key, value]) => (
          <div key={key} className="stk-card">
            <p className="text-xs text-muted-foreground">{t(`platform.subs.totals.${key}`)}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <section className="stk-card overflow-x-auto" aria-labelledby="subs-title">
        <h2 id="subs-title" className="mb-2 text-sm font-semibold">{t("platform.subs.title")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("platform.subs.account")}</TableHead>
              <TableHead>{t("platform.subs.plan")}</TableHead>
              <TableHead>{t("platform.subs.state")}</TableHead>
              <TableHead className="max-md:hidden">{t("platform.subs.until")}</TableHead>
              <TableHead className="max-md:hidden">{t("platform.subs.method")}</TableHead>
              <TableHead className="text-right">{t("platform.subs.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((s) => (
              <TableRow key={s.userId}>
                <TableCell>
                  <p className="font-medium">{s.companies.join(", ")}</p>
                  <p className="text-xs text-muted-foreground">{s.name} · {s.email}</p>
                </TableCell>
                <TableCell>
                  {t(`billing.plans.${s.plan}`)}
                  <span className="text-xs text-muted-foreground"> · {t(`billing.history.${s.interval}`)}</span>
                  {s.nextPlan && <p className="text-xs text-muted-foreground">{t("platform.subs.next", { plan: t(`billing.plans.${s.nextPlan}`) })}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant={BADGE[s.state]}>{t(`platform.subs.states.${s.state}`)}</Badge>
                  {s.cancelAtPeriodEnd && <p className="text-xs text-[var(--stk-warn)]">{t("platform.subs.cancelled")}</p>}
                </TableCell>
                <TableCell className="max-md:hidden">{day(s.endsAt)}</TableCell>
                <TableCell className="max-md:hidden">{s.method ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {!s.isDemo && (
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ userId: s.userId, extendDays: 7 })}>
                        {t("platform.subs.extend")}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate({ userId: s.userId, exempt: !s.exempt })}>
                        {s.exempt ? t("platform.subs.unexempt") : t("platform.subs.exempt")}
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="stk-card overflow-x-auto" aria-labelledby="pays-title">
        <h2 id="pays-title" className="mb-2 text-sm font-semibold">{t("platform.subs.payments")}</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("platform.subs.noPayments")}</p>
        ) : (
          <Table>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap">{day(p.at)}</TableCell>
                  <TableCell>
                    <p className="font-medium">{p.owner}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.kind === "UPGRADE" ? t("billing.history.upgrade", { plan: t(`billing.plans.${p.plan}`) }) : `${t(`billing.plans.${p.plan}`)} ${t(`billing.history.${p.interval}`)}`}
                      {" · "}{p.method === "SINPE" ? "SINPE Móvil" : t("platform.subs.card")}
                      {p.automatic && ` · ${t("billing.history.automatic")}`}
                      {p.status === "FAILED" && p.failureMessage && ` · ${p.failureMessage}`}
                      {p.invoice && ` · ${t(`platform.subs.invoice.${p.invoice}`)}`}
                      {p.invoice === "ERROR" && p.invoiceError && ` (${p.invoiceError})`}
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-medium">{money(p.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.status === "SUCCEEDED" ? "default" : p.status === "FAILED" ? "destructive" : "outline"}>
                      {t(`billing.history.status.${p.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
