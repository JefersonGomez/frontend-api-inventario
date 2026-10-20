import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getAiUsage, setAiBudget } from "@/api/platform"
import { apiErrorMessage } from "@/lib/api-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 })
const FEATURES = ["CHAT", "IMPORT", "DAILY_SUMMARY"]

// Medidor de consumo de IA (solo el dueño): gasto del mes por empresa y función, contra el presupuesto.
// Al llegar al umbral te llega un aviso; al pasar el presupuesto, la IA se pausa hasta el mes siguiente.
export function AiUsagePanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const { data, isLoading } = useQuery({ queryKey: ["platform-ai-usage", month], queryFn: () => getAiUsage(month) })
  const [draft, setDraft] = useState(null) // { monthlyUsd, alertPercent } mientras se edita

  const budget = draft ?? data?.budget
  const save = useMutation({
    mutationFn: () => setAiBudget({ monthlyUsd: Number(budget.monthlyUsd), alertPercent: Number(budget.alertPercent) }),
    onSuccess: () => {
      setDraft(null)
      queryClient.invalidateQueries({ queryKey: ["platform-ai-usage"] })
    },
  })

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  const pct = data.budget.monthlyUsd > 0 ? Math.min(100, (data.spentUsd / data.budget.monthlyUsd) * 100) : 100
  const tone = data.paused ? "crit" : pct >= data.budget.alertPercent ? "warn" : "ok"

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="stk-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{t("platform.ai.month")}</h2>
            <Input type="month" className="w-44" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label={t("platform.ai.month")} />
          </div>
          <p className="text-3xl font-semibold tabular-nums">
            {usd.format(data.spentUsd)}
            <span className="text-base font-normal text-muted-foreground"> / {usd.format(data.budget.monthlyUsd)}</span>
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={t("platform.ai.ofBudget", { pct: Math.round(pct) })}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `var(--stk-${tone}-mid)` }} />
          </div>
          <p className="text-sm text-muted-foreground">
            {data.paused ? <Badge variant="destructive">{t("platform.ai.paused")}</Badge> : t("platform.ai.ofBudget", { pct: Math.round(pct) })}
            {" · "}{t("platform.ai.calls", { count: data.calls })} · {t("platform.ai.tokens", { count: data.tokens.toLocaleString() })}
          </p>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((f) => {
              const row = data.byFeature.find((x) => x.feature === f)
              return (
                <span key={f} className="rounded-lg border border-border px-2.5 py-1 text-xs">
                  {t(`platform.ai.features.${f}`)}: {row?.calls ?? 0} · {usd.format(row?.costUsd ?? 0)}
                </span>
              )
            })}
          </div>
        </section>

        <form
          className="stk-card space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <h2 className="font-semibold">{t("platform.ai.budgetTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("platform.ai.budgetHint")}</p>
          <div className="space-y-1.5">
            <Label htmlFor="ai-budget">{t("platform.ai.monthlyUsd")}</Label>
            <Input id="ai-budget" type="number" min={0} step="0.01" value={budget.monthlyUsd} onChange={(e) => setDraft({ ...budget, monthlyUsd: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-alert">{t("platform.ai.alertPercent")}</Label>
            <Input id="ai-alert" type="number" min={1} max={100} value={budget.alertPercent} onChange={(e) => setDraft({ ...budget, alertPercent: e.target.value })} required />
          </div>
          {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("platform.error"))}</p>}
          <Button type="submit" disabled={!draft || save.isPending}>{t("common.save")}</Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("platform.table.company")}</TableHead>
              {FEATURES.map((f) => <TableHead key={f} className="hidden text-right sm:table-cell">{t(`platform.ai.features.${f}`)}</TableHead>)}
              <TableHead className="text-right">{t("platform.ai.cost")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.byCompany.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("platform.ai.none")}</TableCell></TableRow>
            )}
            {data.byCompany.map((r) => (
              <TableRow key={r.companyId ?? "none"}>
                <TableCell className="font-medium">{r.name}</TableCell>
                {FEATURES.map((f) => <TableCell key={f} className="hidden text-right tabular-nums sm:table-cell">{r.calls[f] ?? 0}</TableCell>)}
                <TableCell className="text-right tabular-nums">{usd.format(r.costUsd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{t("platform.ai.estimateNote")}</p>
    </div>
  )
}
