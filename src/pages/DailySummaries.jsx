import { useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Download, FileSpreadsheet, Loader2 } from "lucide-react"
import { getSummaryHistory } from "@/api/reports"
import { useListParams } from "@/hoocks/useListParams"
import { downloadXlsx } from "@/lib/xlsx"
import { Pagination } from "@/components/Pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const NUMBERS = ["in", "out", "lowStock", "expiringSoon", "pendingRequests", "openOrders", "transfersInTransit", "openCounts"]
const valueOf = (data, key) => (key === "in" || key === "out" ? data.movements?.[key] : data[key]) ?? 0

// descarga un resumen como texto (para guardarlo o mandarlo)
function downloadText(s, t) {
  const lines = [
    `${t("dailySummary.title")} — ${s.date}`,
    `${t("dailySummary.generatedAt", { time: new Date(s.generatedAt).toLocaleString() })}`,
    "",
    s.text,
    "",
    ...NUMBERS.map((k) => `${t(`dailySummary.numbers.${k}`)}: ${valueOf(s.data, k)}`),
  ]
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }))
  const a = Object.assign(document.createElement("a"), { href: url, download: `resumen-${s.date}.txt` })
  a.click()
  URL.revokeObjectURL(url)
}

// Historial de resúmenes del día: todos los generados (también los que se volvieron a generar), por fechas,
// con descarga de cada uno (texto) o de todo el rango (Excel).
export function DailySummaries() {
  const { t } = useTranslation()
  const list = useListParams()
  const from = list.get("from")
  const to = list.get("to")
  const [exporting, setExporting] = useState(false)
  const history = useQuery({
    queryKey: ["daily-summaries", list.page, from, to],
    queryFn: () => getSummaryHistory({ page: list.page, ...(from && { from }), ...(to && { to }) }),
    placeholderData: keepPreviousData,
  })
  const items = history.data?.items ?? []

  async function exportExcel() {
    setExporting(true)
    try {
      const all = await getSummaryHistory({ all: 1, ...(from && { from }), ...(to && { to }) })
      downloadXlsx(`resumenes-del-dia-${new Date().toLocaleDateString("sv")}.xlsx`, [
        {
          name: t("dailySummaries.sheet"),
          rows: [
            [t("dailySummaries.date"), t("dailySummaries.time"), t("dailySummary.title"), ...NUMBERS.map((k) => t(`dailySummary.numbers.${k}`))],
            ...all.map((s) => [s.date, new Date(s.generatedAt).toLocaleTimeString(), s.text, ...NUMBERS.map((k) => valueOf(s.data, k))]),
          ],
        },
      ])
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("dailySummaries.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dailySummaries.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={exportExcel} disabled={exporting || items.length === 0}>
          {exporting ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
          {t("dailySummaries.export")}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="summaries-from">{t("dailySummaries.from")}</Label>
          <Input id="summaries-from" type="date" value={from} onChange={(e) => list.set({ from: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="summaries-to">{t("dailySummaries.to")}</Label>
          <Input id="summaries-to" type="date" value={to} onChange={(e) => list.set({ to: e.target.value })} />
        </div>
      </div>

      {history.isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {!history.isLoading && items.length === 0 && <p className="text-sm text-muted-foreground">{t("dailySummaries.empty")}</p>}
      <ul className="space-y-3">
        {items.map((s) => (
          <li key={s.id} className="stk-card space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">
                {new Date(`${s.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{new Date(s.generatedAt).toLocaleTimeString()}</span>
              </h2>
              <Button size="sm" variant="ghost" onClick={() => downloadText(s, t)} aria-label={t("dailySummaries.download", { date: s.date })}>
                <Download />
                <span className="hidden sm:inline">{t("dailySummaries.downloadShort")}</span>
              </Button>
            </div>
            <p className="whitespace-pre-line text-sm">{s.text}</p>
            <ul className="flex flex-wrap gap-1.5 text-xs">
              {NUMBERS.map((k) => (
                <li key={k} className="rounded-md border border-border px-2 py-0.5">
                  {t(`dailySummary.numbers.${k}`)}: <span className="font-semibold tabular-nums">{valueOf(s.data, k)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <Pagination data={history.data} onPage={list.setPage} />
    </div>
  )
}
