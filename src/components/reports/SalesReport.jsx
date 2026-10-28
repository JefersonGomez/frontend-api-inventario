import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { ArrowDownRight, ArrowUpRight, FileSpreadsheet } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { getSalesReport } from "@/api/reports"
import { useMoney } from "@/hoocks/useMoney"
import { downloadXlsx } from "@/lib/xlsx"
import { formatQty } from "@/lib/units"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

const ymd = (d) => d.toLocaleDateString("sv")
const shift = (days) => ymd(new Date(Date.now() + days * 86_400_000))
// atajos de período: [desde, hasta]
const PRESETS = {
  today: () => [ymd(new Date()), ymd(new Date())],
  week: () => [shift(-6), ymd(new Date())],
  month: () => {
    const n = new Date()
    return [ymd(new Date(n.getFullYear(), n.getMonth(), 1)), ymd(n)]
  },
  lastMonth: () => {
    const n = new Date()
    return [ymd(new Date(n.getFullYear(), n.getMonth() - 1, 1)), ymd(new Date(n.getFullYear(), n.getMonth(), 0))]
  },
}
const pct = (now, before) => (before ? Math.round(((now - before) / before) * 1000) / 10 : null)

// Reporte de ventas (reports.view): totales con comparación, por día, medio de pago, cajero, caja,
// descuentos, ganancia estimada (costs.view), más vendidos y lo que no se vendió; descarga en Excel.
export function SalesReport() {
  const { t } = useTranslation()
  const money = useMoney()
  const [range, setRange] = useState(PRESETS.month)
  const [preset, setPreset] = useState("month")
  const [sortBy, setSortBy] = useState("amount")
  const [from, to] = range
  const { data: r, isLoading, isError } = useQuery({
    queryKey: ["reports", "sales", from, to],
    queryFn: () => getSalesReport(from, to),
    enabled: !!from && !!to && from <= to,
    placeholderData: keepPreviousData,
  })
  const products = r ? [...r.products].sort((a, b) => b[sortBy] - a[sortBy]).slice(0, 20) : []

  function exportExcel() {
    const x = (k) => t(`salesReport.${k}`)
    downloadXlsx(`${x("fileName")}-${from}-${to}.xlsx`, [
      {
        name: x("summary"),
        rows: [
          [x("metric"), x("value")],
          [x("period"), `${from} → ${to}`],
          [x("net"), r.totals.net], [x("gross"), r.totals.gross], [x("returns"), r.totals.returns],
          [x("tickets"), r.totals.tickets], [x("average"), r.totals.average], [x("discounts"), r.discounts.total],
          ...(r.profit ? [[x("profit"), r.profit.profit], [x("margin"), `${r.profit.margin} %`]] : []),
          ...Object.entries(r.byMethod).map(([m, v]) => [t(m === "CREDIT" ? "pos.modes.CREDIT" : `pos.methods.${m}`), v]),
        ],
      },
      { name: x("byDay"), rows: [[x("date"), x("gross"), x("returns"), x("net"), x("tickets")], ...r.byDay.map((d) => [d.date, d.gross, d.returns, d.net, d.tickets])] },
      { name: x("byCashier"), rows: [[x("cashier"), x("gross"), x("returns"), x("net"), x("tickets")], ...r.byCashier.map((c) => [c.name, c.gross, c.returns, c.net, c.tickets])] },
      { name: x("products"), rows: [[x("product"), x("quantity"), x("amount")], ...r.products.map((p) => [p.name, p.quantity, p.amount])] },
      { name: x("notSold"), rows: [["SKU", x("product"), x("stock")], ...r.notSold.map((p) => [p.sku, p.name, p.stock])] },
    ])
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("salesReport.period")}>
          {Object.keys(PRESETS).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={preset === k ? "secondary" : "ghost"}
              onClick={() => {
                setPreset(k)
                setRange(PRESETS[k]())
              }}
            >
              {t(`salesReport.presets.${k}`)}
            </Button>
          ))}
        </div>
        <div className="space-y-1">
          <Label htmlFor="sr-from" className="text-xs">{t("sales.from")}</Label>
          <Input id="sr-from" type="date" className="w-40" value={from} onChange={(e) => { setPreset(""); setRange([e.target.value, to]) }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sr-to" className="text-xs">{t("sales.to")}</Label>
          <Input id="sr-to" type="date" className="w-40" value={to} onChange={(e) => { setPreset(""); setRange([from, e.target.value]) }} />
        </div>
        <Button variant="outline" size="sm" className="ml-auto" disabled={!r} onClick={exportExcel}>
          <FileSpreadsheet />
          {t("reports.export.excel")}
        </Button>
      </div>

      {isError && <p role="alert" className="text-sm text-destructive">{t("salesReport.error")}</p>}
      {isLoading && <p className="text-muted-foreground">{t("common.loading")}</p>}
      {r && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label={t("salesReport.net")} value={money.format(r.totals.net)} change={pct(r.totals.net, r.previous.net)} strong />
            <Kpi label={t("salesReport.gross")} value={money.format(r.totals.gross)} />
            <Kpi label={t("salesReport.returns")} value={money.format(r.totals.returns)} />
            <Kpi label={t("salesReport.tickets")} value={r.totals.tickets} change={pct(r.totals.tickets, r.previous.tickets)} />
            <Kpi label={t("salesReport.average")} value={money.format(r.totals.average)} />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{t("salesReport.vsPrevious", { amount: money.format(r.previous.net) })}</p>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("salesReport.byDayTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64" role="img" aria-label={t("salesReport.byDayTitle")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={r.byDay} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} width={64} tickLine={false} axisLine={false} tickFormatter={(v) => money.format(v).replace(/[.,]00$/, "")} />
                    <Tooltip
                      cursor={{ fill: "var(--muted)" }}
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(d) => new Date(`${d}T12:00`).toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" })}
                      formatter={(v, _n, p) => [`${money.format(v)} · ${t("salesReport.ticketsCount", { count: p.payload.tickets })}`, t("salesReport.net")]}
                    />
                    <Bar dataKey="net" fill="var(--stk-accent)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("salesReport.byMethodTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Shares
                  rows={Object.entries(r.byMethod).map(([m, v]) => ({ key: m, label: t(m === "CREDIT" ? "pos.modes.CREDIT" : `pos.methods.${m}`), value: v }))}
                  money={money}
                />
              </CardContent>
            </Card>
            {r.profit ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("salesReport.profitTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Line label={t("salesReport.revenue")} value={money.format(r.profit.revenue)} />
                  <Line label={t("salesReport.cost")} value={`− ${money.format(r.profit.cost)}`} />
                  <Line label={t("salesReport.profit")} value={`${money.format(r.profit.profit)} (${r.profit.margin} %)`} strong />
                  <p className="pt-2 text-xs text-muted-foreground">
                    {t("salesReport.profitHint")}
                    {r.profit.withoutCost > 0 && ` ${t("salesReport.withoutCost", { count: r.profit.withoutCost })}`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("salesReport.discountsTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Discounts data={r.discounts} money={money} t={t} />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Breakdown title={t("salesReport.byCashierTitle")} rows={r.byCashier} money={money} t={t} />
            <Breakdown title={t("salesReport.byRegisterTitle")} rows={r.byRegister.map((x) => ({ ...x, name: x.name || t("salesReport.noRegister") }))} money={money} t={t} />
          </div>
          {r.profit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("salesReport.discountsTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Discounts data={r.discounts} money={money} t={t} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{t("salesReport.topTitle")}</CardTitle>
              <div className="flex gap-1" role="group" aria-label={t("salesReport.sortBy")}>
                {["amount", "quantity"].map((k) => (
                  <Button key={k} size="sm" variant={sortBy === k ? "secondary" : "ghost"} onClick={() => setSortBy(k)}>
                    {t(`salesReport.by_${k}`)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t("salesReport.product")}</TableHead>
                    <TableHead className="text-right">{t("salesReport.quantity")}</TableHead>
                    <TableHead className="text-right">{t("salesReport.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t("salesReport.noSales")}</TableCell></TableRow>}
                  {products.map((p, i) => (
                    <TableRow key={p.productId ?? p.name}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right font-mono">{p.quantity}</TableCell>
                      <TableCell className="text-right font-mono">{money.format(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("salesReport.notSoldTitle")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("salesReport.notSoldHint")}</p>
            </CardHeader>
            <CardContent>
              {r.notSold.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("salesReport.allSold")}</p>
              ) : (
                <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {r.notSold.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2 border-b border-border py-1">
                      <span className="truncate">{p.name}</span>
                      <span className="shrink-0 font-mono text-muted-foreground">{formatQty(p.stock, p.unit, t)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export function Kpi({ label, value, change, strong }) {
  const up = change > 0
  return (
    <div className={cn("rounded-xl border border-border px-4 py-3", strong && "bg-[var(--stk-kpi-dark)] text-white")}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="font-mono text-xl font-semibold">{value}</p>
      {change != null && (
        <p className="mt-0.5 flex items-center gap-0.5 text-xs opacity-80">
          {up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
          {up ? "+" : ""}{change} %
        </p>
      )}
    </div>
  )
}

export const Line = ({ label, value, strong }) => (
  <p className={cn("flex justify-between", strong && "border-t border-border pt-1 font-semibold")}>
    <span>{label}</span>
    <span className="font-mono">{value}</span>
  </p>
)

// Participación de cada parte en el total: barra fina + monto y porcentaje en texto
function Shares({ rows, money }) {
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (!total) return <p className="text-sm text-muted-foreground">—</p>
  return (
    <ul className="space-y-3 text-sm">
      {rows.sort((a, b) => b.value - a.value).map((r) => (
        <li key={r.key}>
          <p className="flex justify-between">
            <span>{r.label}</span>
            <span className="font-mono">{money.format(r.value)} · {Math.round((r.value / total) * 100)} %</span>
          </p>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-[var(--stk-accent)]" style={{ width: `${(r.value / total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Breakdown({ title, rows, money, t }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("salesReport.name")}</TableHead>
              <TableHead className="text-right">{t("salesReport.tickets")}</TableHead>
              <TableHead className="text-right">{t("salesReport.returns")}</TableHead>
              <TableHead className="text-right">{t("salesReport.net")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t("salesReport.noSales")}</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-right font-mono">{r.tickets}</TableCell>
                <TableCell className="text-right font-mono">{r.returns ? money.format(r.returns) : "—"}</TableCell>
                <TableCell className="text-right font-mono">{money.format(r.net)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function Discounts({ data, money, t }) {
  if (!data.total) return <p className="text-sm text-muted-foreground">{t("salesReport.noDiscounts")}</p>
  return (
    <div className="space-y-1 text-sm">
      <Line label={t("salesReport.discountsTotal")} value={money.format(data.total)} strong />
      {data.byAuthorizer.map((a) => (
        <Line key={a.id} label={t("salesReport.authorizedBy", { name: a.name || "—", count: a.lines })} value={money.format(a.amount)} />
      ))}
    </div>
  )
}
