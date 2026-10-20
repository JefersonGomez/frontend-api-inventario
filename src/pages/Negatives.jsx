import { useState } from "react"
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { getNegatives, resolveNegative } from "@/api/negatives"
import { useListParams } from "@/hoocks/useListParams"
import { apiErrorMessage } from "@/lib/api-error"
import { formatQty } from "@/lib/units"
import { Pagination } from "@/components/Pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const when = (d) => new Date(d).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" })

// Negativas: ventas de productos que el sistema tenía sin stock, autorizadas en la caja. Inventario
// ve quién vendió, quién autorizó y en qué tiquete, y la resuelve (con la cantidad contada, ajusta el stock).
export function Negatives() {
  const { t } = useTranslation()
  const list = useListParams()
  const status = list.get("status") || "OPEN"
  const [resolving, setResolving] = useState(null)
  const negatives = useQuery({
    queryKey: ["negatives", list.page, status],
    queryFn: () => getNegatives({ page: list.page, ...(status !== "all" && { status }) }),
    placeholderData: keepPreviousData,
  })
  const items = negatives.data?.items ?? []
  const statusItems = [
    { value: "OPEN", label: t("negatives.status.OPEN") },
    { value: "RESOLVED", label: t("negatives.status.RESOLVED") },
    { value: "all", label: t("list.all") },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("negatives.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("negatives.subtitle")}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select items={statusItems} value={status} onValueChange={(v) => list.set({ status: v === "OPEN" ? "" : v })}>
          <SelectTrigger className="w-48" aria-label={t("negatives.statusLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {negatives.data?.openCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--stk-warn-bg)] px-3 py-1 text-sm font-medium text-[var(--stk-warn)]">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {t("negatives.openCount", { count: negatives.data.openCount })}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("negatives.date")}</TableHead>
              <TableHead>{t("negatives.product")}</TableHead>
              <TableHead className="text-right">{t("negatives.quantity")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("negatives.location")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("negatives.ticket")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("negatives.reportedBy")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("negatives.authorizedBy")}</TableHead>
              <TableHead className="text-right">{t("negatives.statusLabel")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {negatives.isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
            )}
            {!negatives.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-[var(--stk-ok)]" aria-hidden />
                  {status === "OPEN" ? t("negatives.emptyOpen") : t("negatives.empty")}
                </TableCell>
              </TableRow>
            )}
            {items.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="whitespace-nowrap">{when(n.createdAt)}</TableCell>
                <TableCell>
                  <span className="font-medium">{n.product.name}</span>
                  <span className="block text-xs text-muted-foreground">{t("negatives.systemHad", { stock: formatQty(n.stockBefore, n.product.unit, t) })}</span>
                </TableCell>
                <TableCell className="text-right font-mono">{formatQty(n.quantity, n.product.unit, t)}</TableCell>
                <TableCell className="hidden md:table-cell">{n.location.name}</TableCell>
                <TableCell className="hidden lg:table-cell font-mono text-xs">{n.document.consecutive}</TableCell>
                <TableCell className="hidden sm:table-cell">{n.reportedBy.name}</TableCell>
                <TableCell className="hidden lg:table-cell">{n.authorizedBy.name}</TableCell>
                <TableCell className="text-right">
                  {n.status === "OPEN" ? (
                    <Button size="sm" onClick={() => setResolving(n)}>{t("negatives.resolve")}</Button>
                  ) : (
                    <span className="inline-flex flex-col items-end">
                      <Badge variant="secondary">{t("negatives.status.RESOLVED")}</Badge>
                      <span className="mt-1 max-w-56 truncate text-xs text-muted-foreground" title={n.resolution}>
                        {n.resolvedBy?.name} · {n.resolution}
                      </span>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination data={negatives.data} onPage={list.setPage} />

      <ResolveDialog negative={resolving} onClose={() => setResolving(null)} />
    </div>
  )
}

function ResolveDialog({ negative, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [resolution, setResolution] = useState("")
  const [counted, setCounted] = useState("")
  const save = useMutation({
    mutationFn: () => resolveNegative(negative.id, { resolution: resolution.trim(), ...(counted !== "" && { countedQuantity: Number(counted) }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negatives"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      close()
    },
  })
  function close() {
    setResolution("")
    setCounted("")
    save.reset()
    onClose()
  }
  return (
    <Dialog open={!!negative} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("negatives.resolveTitle", { name: negative?.product.name })}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="neg-counted">{t("negatives.counted", { location: negative?.location.name })}</Label>
            <Input id="neg-counted" type="number" min={0} step="any" className="font-mono" value={counted} onChange={(e) => setCounted(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("negatives.countedHint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="neg-resolution">{t("negatives.resolution")}</Label>
            <Input id="neg-resolution" required maxLength={500} placeholder={t("negatives.resolutionPlaceholder")} value={resolution} onChange={(e) => setResolution(e.target.value)} />
          </div>
          {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("negatives.error"))}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={save.isPending || !resolution.trim()}>{t("negatives.resolve")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
