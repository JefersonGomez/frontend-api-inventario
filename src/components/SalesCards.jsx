import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getMySales, getSalesToday } from "@/api/reports"
import { useMoney } from "@/hoocks/useMoney"
import { Input } from "@/components/ui/input"

// Panel (reports.view): ventas de hoy contra ayer
export function SalesTodayCard() {
  const { t } = useTranslation()
  const money = useMoney()
  const { data } = useQuery({ queryKey: ["reports", "sales-today"], queryFn: getSalesToday, refetchInterval: 60_000 })
  // sin ventas hoy ni ayer (empresa que no usa la caja): no ocupa lugar
  if (!data || (!data.today.tickets && !data.yesterday.tickets)) return null
  const { today, yesterday } = data
  const change = yesterday.net ? Math.round(((today.net - yesterday.net) / yesterday.net) * 100) : null

  return (
    <article className="stk-card">
      <header className="dash-card-head">
        <h2>{t("salesCards.todayTitle")}</h2>
        <Link to="/reports?tab=sales" className="dash-link">{t("salesCards.seeReport")}</Link>
      </header>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <p>
          <span className="block font-mono text-3xl font-semibold">{money.format(today.net)}</span>
          <span className="text-sm text-muted-foreground">
            {t("salesCards.tickets", { count: today.tickets })}
            {today.returns > 0 && ` · ${t("salesCards.returns", { amount: money.format(today.returns) })}`}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t("salesCards.yesterday", { amount: money.format(yesterday.net) })}
          {change != null && ` (${change > 0 ? "+" : ""}${change} %)`}
        </p>
      </div>
    </article>
  )
}

// Panel (sales.sell): lo que vendió la persona en el mes, menos lo devuelto de sus ventas
export function MySalesCard() {
  const { t } = useTranslation()
  const money = useMoney()
  const [month, setMonth] = useState(() => new Date().toLocaleDateString("sv").slice(0, 7))
  const { data } = useQuery({ queryKey: ["reports", "my-sales", month], queryFn: () => getMySales(month) })

  return (
    <article className="stk-card">
      <header className="dash-card-head">
        <h2>{t("salesCards.mineTitle")}</h2>
        <Input type="month" aria-label={t("salesCards.month")} className="h-8 w-40" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </header>
      {data && (
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <p>
            <span className="block text-xs uppercase tracking-wide text-muted-foreground">{t("salesCards.net")}</span>
            <span className="font-mono text-2xl font-semibold">{money.format(data.net)}</span>
          </p>
          <p>
            <span className="block text-xs uppercase tracking-wide text-muted-foreground">{t("salesCards.sold")}</span>
            <span className="font-mono text-lg">{money.format(data.gross)}</span>
          </p>
          <p>
            <span className="block text-xs uppercase tracking-wide text-muted-foreground">{t("salesCards.returnsLabel")}</span>
            <span className="font-mono text-lg">{money.format(data.returns)}</span>
          </p>
          <p>
            <span className="block text-xs uppercase tracking-wide text-muted-foreground">{t("salesCards.ticketsLabel")}</span>
            <span className="font-mono text-lg">{data.tickets}</span>
          </p>
        </div>
      )}
    </article>
  )
}
