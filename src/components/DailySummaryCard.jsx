import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { History, Loader2, RefreshCw, Sparkles, X } from "lucide-react"
import { getDailySummary, generateDailySummary } from "@/api/reports"
import { usePermissions } from "@/hoocks/usePermissions"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"

// día y su inicio en la zona del navegador (la clave del resumen guardado)
function today() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  return { date, since: start.toISOString() }
}

// ocultar es por persona y por día (en este navegador); al día siguiente vuelve a aparecer
const hiddenKey = (date) => `dailySummaryHidden:${date}`
const readHidden = (date) => {
  try {
    return localStorage.getItem(hiddenKey(date)) === "1"
  } catch {
    return false
  }
}

// Resumen del día con IA: los números los calcula el servidor; la IA solo los redacta. Se genera a pedido,
// se guarda cada uno (historial) y se puede volver a generar. Si la IA no está disponible, se ven los números.
export function DailySummaryCard() {
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const enabled = can("reports.view")
  const day = today()
  const [hidden, setHidden] = useState(() => readHidden(day.date))
  const { data, isLoading } = useQuery({ queryKey: ["daily-summary", day.date], queryFn: () => getDailySummary(day), enabled })
  const generate = useMutation({
    mutationFn: (force) => generateDailySummary(day, force),
    onSuccess: (next) => {
      queryClient.setQueryData(["daily-summary", day.date], next)
      queryClient.invalidateQueries({ queryKey: ["daily-summaries"] })
    },
  })
  if (!enabled || isLoading) return null

  function toggleHidden(next) {
    setHidden(next)
    try {
      if (next) localStorage.setItem(hiddenKey(day.date), "1")
      else localStorage.removeItem(hiddenKey(day.date))
    } catch {
      // sin almacenamiento: solo por esta vez
    }
  }

  if (hidden) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("dailySummary.hiddenNote")}{" "}
        <button type="button" className="underline underline-offset-2" onClick={() => toggleHidden(false)}>{t("dailySummary.show")}</button>
      </p>
    )
  }

  const summary = generate.data ?? data
  const d = summary?.data

  return (
    <section className="stk-card space-y-3" aria-labelledby="daily-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="daily-title" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t("dailySummary.title")}
        </h2>
        <div className="flex items-center gap-1">
          {summary?.text ? (
            <Button size="sm" variant="ghost" disabled={generate.isPending} onClick={() => generate.mutate(true)} title={t("dailySummary.regenerateHint")}>
              {generate.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              <span className="hidden sm:inline">{t("dailySummary.regenerate")}</span>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={generate.isPending} onClick={() => generate.mutate(false)}>
              {generate.isPending && <Loader2 className="animate-spin" />}
              {t("dailySummary.generate")}
            </Button>
          )}
          <Button size="sm" variant="ghost" render={<Link to="/daily-summaries" />} title={t("dailySummary.history")}>
            <History />
            <span className="hidden sm:inline">{t("dailySummary.history")}</span>
          </Button>
          <Button size="icon" variant="ghost" onClick={() => toggleHidden(true)} aria-label={t("dailySummary.hide")} title={t("dailySummary.hide")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!summary && <p className="text-sm text-muted-foreground">{t("dailySummary.hint")}</p>}
      {summary?.text && <p className="whitespace-pre-line text-sm">{summary.text}</p>}
      {summary && !summary.text && <p className="text-sm text-muted-foreground">{t("dailySummary.noAi")}</p>}
      {d && (
        <ul className="flex flex-wrap gap-1.5 text-xs">
          {[
            ["in", d.movements.in], ["out", d.movements.out], ["lowStock", d.lowStock], ["expiringSoon", d.expiringSoon],
            ["pendingRequests", d.pendingRequests], ["openOrders", d.openOrders], ["transfersInTransit", d.transfersInTransit], ["openCounts", d.openCounts],
            // ventas (7D-2): solo si hubo, para no llenar de ceros a quien no usa la caja (resúmenes viejos no las traen)
            ...(d.sales?.tickets > 0 || d.sales?.returns > 0 || d.sales?.collections > 0
              ? [
                  ["salesNet", money.format(d.sales.net)], ["tickets", d.sales.tickets], ["returns", money.format(d.sales.returns)],
                  ["collections", money.format(d.sales.collections)],
                ]
              : []),
            ...(d.sales?.overdueInstallments > 0 ? [["overdueInstallments", d.sales.overdueInstallments]] : []),
            ...(d.sales?.cashDifferences > 0 ? [["cashDifferences", d.sales.cashDifferences]] : []),
          ].map(([key, value]) => (
            <li key={key} className="rounded-md border border-border px-2 py-0.5">
              {t(`dailySummary.numbers.${key}`)}: <span className="font-semibold tabular-nums">{value}</span>
            </li>
          ))}
        </ul>
      )}
      {summary?.generatedAt && summary.text && (
        <p className="text-xs text-muted-foreground">{t("dailySummary.generatedAt", { time: new Date(summary.generatedAt).toLocaleTimeString() })}</p>
      )}
      {generate.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(generate.error, t("dailySummary.error"))}</p>}
    </section>
  )
}
