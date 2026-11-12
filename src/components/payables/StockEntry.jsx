import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { CheckCircle2, Loader2, PackagePlus, Sparkles } from "lucide-react"
import { getInvoiceStockPlan, receiveInvoiceStock } from "@/api/payables"
import { getCategories } from "@/api/categories"
import { usePermissions } from "@/hoocks/usePermissions"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { ProductPicker } from "@/components/ProductPicker"
import { LocationSelect } from "@/components/LocationSelect"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Botón de cada factura importada desde su XML: entrar su mercadería al inventario (o "ya entró")
export function StockEntry({ invoice }) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const [open, setOpen] = useState(false)
  if (!invoice.clave || invoice.voidedAt) return null
  if (invoice.stockReceivedAt) {
    return (
      <Badge variant="outline" className="mt-1 border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        {t("payables.stock.done")}
      </Badge>
    )
  }
  if (!can("stock.move")) return null
  return (
    <>
      <Button size="xs" variant="outline" className="mt-1" onClick={() => setOpen(true)}>
        <PackagePlus aria-hidden />
        {t("payables.stock.button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">{open && <StockForm invoiceId={invoice.id} onClose={() => setOpen(false)} />}</DialogContent>
      </Dialog>
    </>
  )
}

const MODES = ["product", "new", "skip"]

function StockForm({ invoiceId, onClose }) {
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const { data: plan, isLoading, error } = useQuery({ queryKey: ["payables", "stock", invoiceId], queryFn: () => getInvoiceStockPlan(invoiceId) })
  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories })
  const [rows, setRows] = useState(null) // null = lo que sugiere el sistema
  const [locationId, setLocationId] = useState("")
  const [categoryId, setCategoryId] = useState("")

  const initial = (l) => ({
    mode: "product", // sin sugerencia: se busca el producto (o se cambia a "Crear nuevo")
    product: l.suggestion?.product ?? null,
    reason: l.suggestion?.reason ?? null,
    factor: String(l.suggestion?.factor ?? 1),
    name: l.description,
    price: "",
  })
  const current = rows ?? Object.fromEntries((plan?.lines ?? []).map((l) => [l.line, initial(l)]))
  const set = (line, patch) => setRows({ ...current, [line]: { ...current[line], ...patch } })

  const save = useMutation({
    mutationFn: () =>
      receiveInvoiceStock(invoiceId, {
        ...(locationId && { locationId }),
        lines: plan.lines.map((l) => {
          const r = current[l.line]
          if (r.mode === "skip") return { line: l.line, skip: true }
          const factor = Number(r.factor) || 1
          if (r.mode === "new") return { line: l.line, factor, newProduct: { name: r.name.trim(), price: Number(r.price), categoryId } }
          return { line: l.line, factor, ...(r.product && { productId: r.product.id }) }
        }),
      }),
    onSuccess: () => {
      for (const key of ["payables", "products", "movements"]) queryClient.invalidateQueries({ queryKey: [key] })
      onClose()
    },
  })

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>
  if (error) return <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, t("payables.stock.error"))}</p>
  const lines = plan.lines
  const anyNew = lines.some((l) => current[l.line]?.mode === "new")
  const missing = lines.some((l) => {
    const r = current[l.line]
    return (r.mode === "product" && !r.product) || (r.mode === "new" && (!r.name.trim() || !(Number(r.price) > 0)))
  })
  const nothing = lines.every((l) => current[l.line].mode === "skip")
  const categoryItems = (categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t("payables.stock.title", { number: plan.invoice.number.slice(-10), supplier: plan.invoice.supplier })}</DialogTitle>
        <p className="text-sm text-muted-foreground">{t("payables.stock.subtitle")}</p>
      </DialogHeader>

      <ul className="space-y-3">
        {lines.map((l) => {
          const r = current[l.line]
          const factor = Number(r.factor) || 1
          return (
            <li key={l.line} className={cn("space-y-3 rounded-lg border p-3", r.mode === "skip" ? "border-dashed border-border opacity-70" : "border-border")}>
              <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{l.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.quantity} {l.unit} · {t("payables.stock.cost", { amount: money.format(l.unitCost) })}
                    {l.code ? ` · ${t("payables.stock.code", { code: l.code })}` : ""}
                  </p>
                </div>
                <div className="flex gap-1" role="group" aria-label={t("payables.stock.what", { name: l.description })}>
                  {MODES.map((m) => (
                    <Button key={m} type="button" size="xs" variant={r.mode === m ? "default" : "outline"} aria-pressed={r.mode === m} onClick={() => set(l.line, { mode: m })}>
                      {t(`payables.stock.modes.${m}`)}
                    </Button>
                  ))}
                </div>
              </div>

              {r.mode === "product" && (
                <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
                  <div className="space-y-1.5">
                    <Label htmlFor={`stock-p-${l.line}`} className="flex items-center gap-1.5">
                      {t("payables.stock.product")}
                      {r.reason && r.product && (
                        <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3" aria-hidden />{t(`payables.stock.reasons.${r.reason}`)}</Badge>
                      )}
                    </Label>
                    <ProductPicker id={`stock-p-${l.line}`} value={r.product} onChange={(p) => set(l.line, { product: p, reason: null })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`stock-f-${l.line}`}>{t("payables.stock.factor")}</Label>
                    <Input id={`stock-f-${l.line}`} type="number" min="0.001" step="any" value={r.factor} onChange={(e) => set(l.line, { factor: e.target.value })} aria-describedby={`stock-fh-${l.line}`} />
                    <p id={`stock-fh-${l.line}`} className="text-xs text-muted-foreground">
                      {t("payables.stock.enters", { qty: +(l.quantity * factor).toFixed(3), cost: money.format(l.unitCost / factor) })}
                    </p>
                  </div>
                </div>
              )}

              {r.mode === "new" && (
                <div className="grid gap-3 sm:grid-cols-[1fr_160px_160px]">
                  <div className="space-y-1.5">
                    <Label htmlFor={`stock-n-${l.line}`}>{t("payables.stock.newName")}</Label>
                    <Input id={`stock-n-${l.line}`} maxLength={160} value={r.name} onChange={(e) => set(l.line, { name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`stock-pr-${l.line}`}>{t("payables.stock.price")}</Label>
                    <Input id={`stock-pr-${l.line}`} type="number" min="0.01" step="0.01" value={r.price} onChange={(e) => set(l.line, { price: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`stock-nf-${l.line}`}>{t("payables.stock.factor")}</Label>
                    <Input id={`stock-nf-${l.line}`} type="number" min="0.001" step="any" value={r.factor} onChange={(e) => set(l.line, { factor: e.target.value })} />
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-3">
                    {t("payables.stock.newHint", { unit: t(`units.short.${l.suggestedUnit}`), tax: t(`taxRates.${l.rate}`), cabys: l.cabys ?? "—" })}
                  </p>
                </div>
              )}

              {r.mode === "skip" && <p className="text-xs text-muted-foreground">{t("payables.stock.skipHint")}</p>}
            </li>
          )
        })}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <LocationSelect id="stock-location" label={t("payables.stock.location")} value={locationId} onChange={setLocationId} hint={t("payables.stock.locationHint")} />
        {anyNew && (
          <div className="space-y-1.5">
            <Label htmlFor="stock-category">{t("payables.stock.category")}</Label>
            <Select items={categoryItems} value={categoryId || null} onValueChange={setCategoryId}>
              <SelectTrigger id="stock-category" className="w-full"><SelectValue placeholder={t("payables.stock.pickCategory")} /></SelectTrigger>
              <SelectContent>
                {categoryItems.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("payables.stock.error"))}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="button" disabled={save.isPending || missing || nothing || (anyNew && !categoryId)} onClick={() => save.mutate()}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t("payables.stock.save")}
        </Button>
      </div>
    </div>
  )
}
