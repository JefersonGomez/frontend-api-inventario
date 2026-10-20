import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Calculator } from "lucide-react"
import { getSessions } from "@/api/pos"
import { useListParams } from "@/hoocks/useListParams"
import { useMoney } from "@/hoocks/useMoney"
import { Pagination } from "@/components/Pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

const at = (d) => new Date(d).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" })
const DIFF = { ok: "text-[var(--stk-ok)]", warn: "text-[var(--stk-warn)]", crit: "text-[var(--stk-crit)]" }

// Arqueos (jefa de caja): los cierres de los cajeros, primero los que esperan arqueo
export function CashClosings() {
  const { t } = useTranslation()
  const money = useMoney()
  const list = useListParams()
  const pending = list.get("pending") || "1"
  const sessions = useQuery({
    queryKey: ["cash-sessions", list.page, pending],
    queryFn: () => getSessions({ page: list.page, ...(pending !== "all" && { pending }) }),
    placeholderData: keepPreviousData,
  })
  const items = sessions.data?.items ?? []
  const filterItems = [
    { value: "1", label: t("cashClosings.filter.pending") },
    { value: "0", label: t("cashClosings.filter.done") },
    { value: "all", label: t("list.all") },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("cashClosings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("cashClosings.subtitle")}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select items={filterItems} value={pending} onValueChange={(v) => list.set({ pending: v === "1" ? "" : v })}>
          <SelectTrigger className="w-48" aria-label={t("cashClosings.filter.label")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {sessions.data?.pendingCount > 0 && (
          <span className="rounded-full bg-[var(--stk-warn-bg)] px-3 py-1 text-sm font-medium text-[var(--stk-warn)]">
            {t("cashClosings.pendingCount", { count: sessions.data.pendingCount })}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("cashClosings.closedAt")}</TableHead>
              <TableHead>{t("cashClosings.register")}</TableHead>
              <TableHead>{t("cashClosings.cashier")}</TableHead>
              <TableHead className="hidden md:table-cell text-right">{t("cashClosings.expected")}</TableHead>
              <TableHead className="hidden md:table-cell text-right">{t("cashClosings.difference")}</TableHead>
              <TableHead className="text-right">{t("cashClosings.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
            )}
            {!sessions.isLoading && items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">{t("cashClosings.empty")}</TableCell></TableRow>
            )}
            {items.map((s) => {
              const diff = s.difference == null ? null : Number(s.difference)
              const tone = diff === null ? null : diff === 0 ? "ok" : diff > 0 ? "warn" : "crit"
              return (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap">{at(s.closedAt)}</TableCell>
                  <TableCell>
                    {s.register.name}
                    <span className="block text-xs text-muted-foreground">{s.register.location.name}</span>
                  </TableCell>
                  <TableCell>{s.openedBy.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-right font-mono">{money.format(s.expectedCash)}</TableCell>
                  <TableCell className={cn("hidden md:table-cell text-right font-mono", tone && DIFF[tone])}>
                    {diff === null ? "—" : money.format(diff)}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.reconciledAt ? (
                      <Button size="sm" variant="ghost" render={<Link to={`/cash-closings/${s.id}`} />}>
                        <Badge variant="secondary">{t("cashClosings.done")}</Badge>
                      </Button>
                    ) : (
                      <Button size="sm" render={<Link to={`/cash-closings/${s.id}`} />}>
                        <Calculator />
                        {t("cashClosings.reconcile")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <Pagination data={sessions.data} onPage={list.setPage} />
    </div>
  )
}
