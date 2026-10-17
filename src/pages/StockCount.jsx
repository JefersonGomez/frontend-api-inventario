import { useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { ArrowLeft, ScanBarcode } from "lucide-react"
import { getStockCount, saveStockCount, closeStockCount, cancelStockCount } from "@/api/stockCounts"
import { getProductByBarcode } from "@/api/products"
import { useMoney } from "@/hoocks/useMoney"
import { usePermissions } from "@/hoocks/usePermissions"
import { apiErrorMessage } from "@/lib/api-error"
import { formatQty, qtyStep } from "@/lib/units"
import { BarcodeScanner } from "@/components/BarcodeScanner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const STATUS_VARIANT = { OPEN: "default", CLOSED: "secondary", CANCELLED: "outline" }
const FILTERS = ["all", "pending", "diff"]

// Página para contar: lector o búsqueda por código/SKU (cada lectura suma 1), cantidades a mano,
// diferencias contra el sistema y cierre (ajusta el stock). Lo contado se guarda de a poco.
export function StockCount() {
  const { id } = useParams()
  const { t } = useTranslation()
  const money = useMoney()
  const showCost = usePermissions().can("costs.view")
  const queryClient = useQueryClient()
  const scanRef = useRef(null)
  const [draft, setDraft] = useState({}) // productId → texto escrito (cambios sin guardar)
  const [extra, setExtra] = useState([]) // productos leídos que no estaban en la lista
  const [code, setCode] = useState("")
  const [scanMsg, setScanMsg] = useState(null)
  const [filter, setFilter] = useState("all")

  const { data: count, isError } = useQuery({ queryKey: ["stock-counts", "detail", id], queryFn: () => getStockCount(id) })
  const open = count?.status === "OPEN"

  // líneas visibles: las del conteo + las agregadas con el lector, con el valor que se ve ahora
  const rows = useMemo(() => {
    const base = (count?.items ?? []).map((i) => ({ ...i, product: i.product }))
    const known = new Set(base.map((r) => r.productId))
    const added = extra.filter((p) => !known.has(p.id)).map((p) => ({ productId: p.id, product: p, countedQuantity: null, systemQuantity: null, currentQuantity: Number(p.stock ?? 0) }))
    return [...base, ...added].map((r) => {
      const typed = draft[r.productId]
      const counted = typed !== undefined ? (typed === "" ? null : Number(typed)) : r.countedQuantity == null ? null : Number(r.countedQuantity)
      // si ya se contó, la diferencia es contra lo que decía el sistema en ese momento
      const system = r.systemQuantity != null && typed === undefined ? Number(r.systemQuantity) : Number(r.currentQuantity ?? 0)
      return { ...r, counted, system, diff: counted == null ? null : counted - system }
    })
  }, [count, extra, draft])

  const shown = rows.filter((r) => (filter === "pending" ? r.counted == null : filter === "diff" ? r.diff != null && r.diff !== 0 : true))
  const changes = Object.entries(draft).map(([productId, v]) => ({ productId, countedQuantity: v === "" ? null : Number(v) }))
  const countedRows = rows.filter((r) => r.counted != null)
  const over = countedRows.filter((r) => r.diff > 0).length
  const short = countedRows.filter((r) => r.diff < 0).length
  const diffValue = countedRows.reduce((s, r) => s + (r.product.cost != null ? r.diff * Number(r.product.cost) : 0), 0)

  const refresh = (data) => {
    queryClient.setQueryData(["stock-counts", "detail", id], data)
    queryClient.invalidateQueries({ queryKey: ["stock-counts"] })
    setDraft({})
    setExtra([])
  }
  const save = useMutation({ mutationFn: () => saveStockCount(id, changes), onSuccess: refresh })
  const close = useMutation({
    // lo escrito sin guardar se guarda antes de cerrar
    mutationFn: async () => {
      if (changes.length) await saveStockCount(id, changes)
      return closeStockCount(id)
    },
    onSuccess: (data) => {
      refresh(data)
      for (const key of ["products", "movements", "reports"]) queryClient.invalidateQueries({ queryKey: [key] })
    },
  })
  const cancel = useMutation({ mutationFn: () => cancelStockCount(id), onSuccess: refresh })

  // cada lectura del lector (o código/SKU escrito + Enter) suma 1 a ese producto
  async function addOne(raw) {
    const value = raw.trim()
    if (!value) return
    let row = rows.find((r) => r.product.barcode === value || r.product.sku?.toLowerCase() === value.toLowerCase())
    if (!row) {
      const product = await getProductByBarcode(value).catch(() => null)
      if (!product) {
        setScanMsg({ ok: false, text: t("stockCounts.notFound", { code: value }) })
        return
      }
      setExtra((e) => [...e, product])
      row = { productId: product.id, product, counted: null }
    }
    const next = (row.counted ?? 0) + 1
    setDraft((d) => ({ ...d, [row.productId]: String(next) }))
    setScanMsg({ ok: true, text: t("stockCounts.scanned", { name: row.product.name, qty: formatQty(next, row.product.unit, t) }) })
    setCode("")
    scanRef.current?.focus()
  }

  if (isError) return <p role="alert" className="text-sm text-destructive">{t("stockCounts.loadError")}</p>
  if (!count) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  const error = save.error || close.error || cancel.error

  return (
    <div className="space-y-5">
      <div>
        <Link to="/stock-counts" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("stockCounts.back")}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{t("stockCounts.countOf", { location: count.location.name })}</h1>
          <Badge variant={STATUS_VARIANT[count.status]}>{t(`stockCounts.status.${count.status}`)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {count.category?.name ?? t("stockCounts.allProducts")} · {t("stockCounts.openedByOn", { name: count.createdBy.name, date: new Date(count.createdAt).toLocaleString() })}
          {count.notes && ` · ${count.notes}`}
        </p>
      </div>

      {/* resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t("stockCounts.summary.counted"), `${countedRows.length} / ${rows.length}`],
          [t("stockCounts.summary.over"), over],
          [t("stockCounts.summary.short"), short],
          ...(showCost ? [[t("stockCounts.summary.value"), money.format(diffValue)]] : []),
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {open && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            addOne(code)
          }}
        >
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              ref={scanRef}
              className="pl-9"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("stockCounts.scanPlaceholder")}
              aria-label={t("stockCounts.scanPlaceholder")}
              autoFocus
            />
          </div>
          <BarcodeScanner onScan={addOne} />
          {scanMsg && (
            <p role="status" className={`w-full text-sm ${scanMsg.ok ? "text-muted-foreground" : "text-destructive"}`}>{scanMsg.text}</p>
          )}
        </form>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {t(`stockCounts.filters.${f}`)}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("stockCounts.product")}</TableHead>
              <TableHead className="text-right">{t("stockCounts.system")}</TableHead>
              <TableHead className="text-right">{t("stockCounts.counted")}</TableHead>
              <TableHead className="text-right">{t("stockCounts.difference")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t("stockCounts.nothingHere")}</TableCell></TableRow>
            )}
            {shown.map((r) => (
              <TableRow key={r.productId} className={draft[r.productId] !== undefined ? "bg-primary/5" : undefined}>
                <TableCell>
                  <span className="font-medium">{r.product.name}</span>
                  <span className="block text-xs text-muted-foreground">{r.product.sku}{r.product.barcode && ` · ${r.product.barcode}`}</span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">{formatQty(r.system, r.product.unit, t)}</TableCell>
                <TableCell className="text-right">
                  {open ? (
                    <Input
                      type="number"
                      className="ml-auto w-28 text-right"
                      min={0}
                      step={qtyStep(r.product.unit)}
                      value={draft[r.productId] ?? (r.counted == null ? "" : String(r.counted))}
                      onChange={(e) => setDraft({ ...draft, [r.productId]: e.target.value })}
                      aria-label={t("stockCounts.countedOf", { name: r.product.name })}
                    />
                  ) : r.counted == null ? "—" : (
                    <span className="tabular-nums">{formatQty(r.counted, r.product.unit, t)}</span>
                  )}
                </TableCell>
                <TableCell className={`text-right whitespace-nowrap tabular-nums ${r.diff > 0 ? "text-[var(--stk-ok)]" : r.diff < 0 ? "text-[var(--stk-crit)]" : "text-muted-foreground"}`}>
                  {r.diff == null ? "—" : `${r.diff > 0 ? "+" : ""}${formatQty(r.diff, r.product.unit, t)}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, t("stockCounts.error"))}</p>}

      {open && (
        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" disabled={cancel.isPending}>{t("stockCounts.cancel")}</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("stockCounts.cancelTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("stockCounts.cancelDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => cancel.mutate()}>{t("stockCounts.cancel")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" disabled={!changes.length || save.isPending} onClick={() => save.mutate()}>
            {t("stockCounts.save", { count: changes.length })}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button disabled={close.isPending || countedRows.length === 0}>{t("stockCounts.close")}</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("stockCounts.closeTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("stockCounts.closeDescription", { counted: countedRows.length, over, short, uncounted: rows.length - countedRows.length })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => close.mutate()}>{t("stockCounts.close")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}
