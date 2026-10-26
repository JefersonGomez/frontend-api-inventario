import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Check, CheckCheck } from "lucide-react"
import { getReconcile, matchBankTransaction } from "@/api/banks"
import { apiErrorMessage } from "@/lib/api-error"
import { Pagination } from "@/components/Pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
const DAY = 86_400_000
const local = (offset = 0) => new Date(Date.now() + offset * DAY).toLocaleDateString("sv")
const day = (d) => new Date(d.length === 10 ? `${d}T00:00:00Z` : d).toLocaleDateString("es-CR", { timeZone: "UTC" })
const keyOf = (i) => `${i.type}:${i.id}`

// Lo del sistema en una línea: tipo, a quién/qué, fecha, referencia y monto
export function ItemText({ item, money }) {
  const { t } = useTranslation()
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-medium">{t(`banks.match.types.${item.type}`)}</span>
      <span className="text-muted-foreground">{item.type === "CARD_BATCH" ? day(item.label) : item.label}</span>
      {item.date && item.type !== "CARD_BATCH" && <span className="text-xs text-muted-foreground">{day(item.date)}</span>}
      {item.reference && <span className="font-mono text-xs text-muted-foreground">{item.reference}</span>}
      <span className={cn("ml-auto font-mono", item.amount > 0 && "text-[var(--stk-ok)]")}>{item.amount > 0 ? "+" : "−"}{money(Math.abs(item.amount))}</span>
    </span>
  )
}

// Conciliar (53B): cada movimiento pendiente del banco con lo que el sistema sugiere; la persona confirma
export function Reconcile({ account, money }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [range, setRange] = useState({ from: local(-30), to: local() })
  const [picked, setPicked] = useState({}) // movimiento → clave del elegido ("" = ninguno)
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["banks", "reconcile", account.id, range.from, range.to, page],
    queryFn: () => getReconcile(account.id, { ...range, page }),
    enabled: !!range.from && !!range.to,
  })
  const match = useMutation({
    mutationFn: async (pairs) => {
      // de a uno: si uno falla, los anteriores quedan confirmados y se ve cuál falló
      for (const [id, item] of pairs) await matchBankTransaction(id, { items: [{ type: item.type, id: item.id }] })
    },
    onSettled: () => {
      setPicked({})
      queryClient.invalidateQueries({ queryKey: ["banks"] })
    },
  })

  const rows = data?.items ?? []
  const chosen = (row) => {
    const k = picked[row.id] ?? (row.suggestion ? keyOf(row.suggestion) : "")
    return row.candidates.find((c) => keyOf(c) === k) ?? null
  }
  const ready = rows.map((r) => [r.id, chosen(r)]).filter(([, item]) => item)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="rec-from" className="text-xs">{t("banks.match.from")}</Label>
          <Input id="rec-from" type="date" className="w-40" value={range.from} max={range.to} onChange={(e) => { setRange({ ...range, from: e.target.value }); setPage(1) }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rec-to" className="text-xs">{t("banks.match.to")}</Label>
          <Input id="rec-to" type="date" className="w-40" value={range.to} min={range.from} onChange={(e) => { setRange({ ...range, to: e.target.value }); setPage(1) }} />
        </div>
        <Button className="ml-auto" disabled={!ready.length || match.isPending} onClick={() => match.mutate(ready)}>
          <CheckCheck />
          {t("banks.match.confirmAll", { count: ready.length })}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("banks.match.hint")}</p>
      {match.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(match.error, t("banks.match.error"))}</p>}
      {isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, t("banks.match.error"))}</p>}

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("banks.match.pendingTitle", { count: data?.total ?? 0, paired: data?.suggested ?? 0 })}</h2>
        {isLoading && <p className="text-muted-foreground">{t("common.loading")}</p>}
        {!isLoading && !rows.length && <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">{t("banks.match.nothing")}</p>}
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((row) => {
            const item = chosen(row)
            const amount = Number(row.amount)
            return (
              <li key={row.id} className="grid gap-2 p-3 md:grid-cols-[1fr_1.2fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground">{day(row.date)}</span>
                    <span className={cn("font-mono font-semibold", amount > 0 && "text-[var(--stk-ok)]")}>{amount > 0 ? "+" : "−"}{money(Math.abs(amount))}</span>
                  </p>
                  <p className="truncate text-sm" title={row.description}>{row.description}</p>
                  {row.reference && <p className="font-mono text-xs text-muted-foreground">{row.reference}</p>}
                </div>
                {row.candidates.length ? (
                  <div className="space-y-1">
                    <select
                      aria-label={t("banks.match.pick", { description: row.description })}
                      className={selectClass}
                      value={item ? keyOf(item) : ""}
                      onChange={(e) => setPicked({ ...picked, [row.id]: e.target.value })}
                    >
                      <option value="">{t("banks.match.none")}</option>
                      {row.candidates.map((c) => (
                        <option key={keyOf(c)} value={keyOf(c)}>
                          {t(`banks.match.types.${c.type}`)} · {c.type === "CARD_BATCH" ? day(c.label) : c.label} · {money(Math.abs(c.amount))}
                        </option>
                      ))}
                    </select>
                    {item && <div className="text-sm"><ItemText item={item} money={money} /></div>}
                    {item?.type === "CARD_BATCH" && Math.abs(item.amount - amount) > 0.005 && (
                      <p className="text-xs text-muted-foreground">{t("banks.match.fee", { amount: money(item.amount - amount) })}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("banks.match.noCandidates")}</p>
                )}
                <Button size="sm" variant="outline" disabled={!item || match.isPending} onClick={() => match.mutate([[row.id, item]])}>
                  <Check />
                  {t("banks.match.confirm")}
                </Button>
              </li>
            )
          })}
        </ul>
        <Pagination data={data} onPage={setPage} />
      </section>

      {data?.missing.length > 0 && (
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-[var(--stk-warn)]">
            <AlertTriangle className="h-5 w-5" aria-hidden />
            {t("banks.match.missingTitle", { count: data.missing.length })}
          </h2>
          <p className="mb-2 text-sm text-muted-foreground">{t("banks.match.missingHint")}</p>
          <ul className="divide-y divide-border rounded-xl border border-[var(--stk-warn)]/40">
            {data.missing.map((i) => (
              <li key={keyOf(i)} className="px-3 py-2 text-sm">
                <ItemText item={i} money={money} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
