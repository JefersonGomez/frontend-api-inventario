import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getMovements, createMovement } from "@/api/movements"
import { getProductByBarcode } from "@/api/products"
import { ProductPicker } from "@/components/ProductPicker"
import { Pagination } from "@/components/Pagination"
import { SearchInput } from "@/components/SearchInput"
import { useListParams } from "@/hoocks/useListParams"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hoocks/usePermissions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, ArrowDownCircle, ArrowUpCircle, RotateCcw } from "lucide-react"
import { BarcodeScanner } from "@/components/BarcodeScanner" // Importar componente reutilizable
import { qtyStep, formatQty } from "@/lib/units"
import { apiErrorMessage } from "@/lib/api-error"
import { LocationSelect } from "@/components/LocationSelect"
import { getProduct } from "@/api/products"

const emptyForm = { product: null, type: "IN", quantity: "", reason: "", locationId: "", lotCode: "", lotExpires: "" }
const SOURCES = ["MANUAL", "INITIAL", "PURCHASE_RECEIPT", "SALE", "RETURN", "COUNT", "TRANSFER"]

export function Movements() {
  const { t } = useTranslation()
  const { can, activeLocationId } = usePermissions()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  // desde el menú "Escanear producto" (?scan=1): el registro se abre con la cámara lista
  const [params, setParams] = useSearchParams()
  const scanning = can("stock.move") && params.get("scan") === "1"
  const showDialog = dialogOpen || scanning
  const closeDialog = (open) => {
    setDialogOpen(open)
    if (!open && scanning) setParams((p) => { p.delete("scan"); return p }, { replace: true })
  }
  const [form, setForm] = useState(emptyForm)
  const [isSearching, setIsSearching] = useState(false) // Estado para feedback visual

  // página, búsqueda y filtros en la URL; el servidor filtra y pagina
  const list = useListParams()
  const filters = { q: list.get("q"), type: list.get("type"), source: list.get("source") }
  const movementsQuery = useQuery({
    queryKey: ["movements", list.page, filters],
    queryFn: () =>
      getMovements({
        page: list.page,
        ...(filters.q && { q: filters.q }),
        ...(filters.type && { type: filters.type }),
        ...(filters.source && { source: filters.source }),
      }),
    placeholderData: keepPreviousData,
  })
  const movements = movementsQuery.data?.items ?? []
  const selected = form.product
  const step = qtyStep(selected?.unit)
  // stock del producto en la ubicación del movimiento (la elegida o la activa)
  const detail = useQuery({ queryKey: ["products", selected?.id, "detail"], queryFn: () => getProduct(selected.id), enabled: !!selected })
  const needsLot = Boolean(selected?.tracksLots) && form.type !== "OUT"
  const movementLocation = form.locationId || activeLocationId
  const stockHere = movementLocation
    ? Number(detail.data?.stocks?.find((s) => s.location.id === movementLocation)?.quantity ?? 0)
    : detail.data?.stock
  const typeItems = [
    { value: "all", label: t("list.all") },
    { value: "IN", label: t("movements.types.in") },
    { value: "OUT", label: t("movements.types.out") },
    { value: "ADJUSTMENT", label: t("movements.types.adjustment") },
  ]
  const sourceItems = [{ value: "all", label: t("list.all") }, ...SOURCES.map((v) => ({ value: v, label: t(`movements.sources.${v}`) }))]

  const createMutation = useMutation({
    mutationFn: () =>
      createMovement({
        productId: form.product.id,
        type: form.type,
        quantity: Number(form.quantity),
        reason: form.reason || undefined,
        locationId: form.locationId || undefined, // sin elegir: la ubicación activa
        // productos con lotes: la entrada (o un ajuste que suma) va a un lote; la salida toma el que vence antes
        ...(needsLot && form.lotCode.trim() && { lot: { code: form.lotCode.trim(), expiresAt: form.lotExpires || null } }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movements"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      closeDialog(false)
      setForm(emptyForm)
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    createMutation.mutate()
  }

  // Lógica principal del escáner en movimientos
  const handleScan = async (code) => {
    setIsSearching(true)
    try {
      const product = await getProductByBarcode(code)
      if (product) {
        setForm((prev) => ({ ...prev, product }))
      } else {
        alert(t("movements.dialog.product_not_found"))
      }
    } catch (error) {
      alert(t("movements.dialog.product_not_found"),error)
    } finally {
      setIsSearching(false)
    }
  }

  // Configuración de tipos traducida
  const typeConfig = {
    IN: { label: t("movements.types.in"), variant: "default", icon: ArrowDownCircle },
    OUT: { label: t("movements.types.out"), variant: "destructive", icon: ArrowUpCircle },
    ADJUSTMENT: { label: t("movements.types.adjustment"), variant: "secondary", icon: RotateCcw },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("movements.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("movements.subtitle")}</p>
        </div>
        {can("stock.move") && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("movements.new_button")}
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          id="movement-search"
          value={filters.q}
          onSearch={(q) => list.set({ q })}
          placeholder={t("list.search")}
          className="w-full max-w-sm"
        />
        <Select items={typeItems} value={filters.type || "all"} onValueChange={(v) => list.set({ type: v === "all" ? "" : v })}>
          <SelectTrigger className="w-40" aria-label={t("movements.table.type")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={sourceItems} value={filters.source || "all"} onValueChange={(v) => list.set({ source: v === "all" ? "" : v })}>
          <SelectTrigger className="w-44" aria-label={t("movements.table.reason")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sourceItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("movements.table.date")}</TableHead>
              <TableHead>{t("movements.table.product")}</TableHead>
              <TableHead>{t("movements.table.type")}</TableHead>
              <TableHead>{t("movements.table.quantity")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("movements.table.location")}</TableHead>
              <TableHead>{t("movements.table.user")}</TableHead>
              <TableHead>{t("movements.table.reason")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movementsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}

            {!movementsQuery.isLoading && movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t("pagination.none")}
                </TableCell>
              </TableRow>
            )}

            {movements.map((movement) => {
              const config = typeConfig[movement.type]
              const Icon = config.icon
              return (
                <TableRow key={movement.id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(movement.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{movement.product?.name}</TableCell>
                  <TableCell>
                    <Badge variant={config.variant} className="gap-1">
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatQty(movement.quantity, movement.product?.unit, t)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{movement.location?.name}</TableCell>
                  <TableCell className="text-muted-foreground">{movement.user?.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {movement.source && movement.source !== "MANUAL" && (
                      <Badge variant="outline" className="mr-2">{t(`movements.sources.${movement.source}`)}</Badge>
                    )}
                    {movement.reason ?? (movement.source && movement.source !== "MANUAL" ? null : "—")}
                    {movement.lots?.length > 0 && (
                      <span className="block text-xs">
                        {t("products.lots.short")}: {movement.lots.map((l) => `${l.code} (${formatQty(l.quantity, movement.product?.unit, t)})`).join(", ")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <Pagination data={movementsQuery.data} onPage={list.setPage} />

      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("movements.dialog.title")}</DialogTitle>
            </DialogHeader>

            {/* CAMPO DE PRODUCTO CON ESCÁNER INTEGRADO */}
            <div className="space-y-2">
              <Label htmlFor="movement-product">{t("movements.dialog.label_product")}</Label>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <ProductPicker
                    id="movement-product"
                    value={form.product}
                    onChange={(product) => setForm({ ...form, product })}
                    disabled={isSearching}
                    required
                  />
                </div>

                {/* Botón de escaneo integrado */}
                <BarcodeScanner onScan={handleScan} autoStart={scanning} />
              </div>
              
              {isSearching && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  {t("movements.dialog.scanning")}...
                </p>
              )}
            </div>

            <LocationSelect
              id="movement-location"
              value={form.locationId}
              onChange={(locationId) => setForm({ ...form, locationId })}
            />

            <div className="space-y-2">
              <Label>{t("movements.dialog.label_type")}</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm({ ...form, type: value })}
                items={[
                  { value: "IN", label: t("movements.types.in") },
                  { value: "OUT", label: t("movements.types.out") },
                  { value: "ADJUSTMENT", label: t("movements.types.adjustment_full") },
                ]}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">{t("movements.types.in")}</SelectItem>
                  <SelectItem value="OUT">{t("movements.types.out")}</SelectItem>
                  <SelectItem value="ADJUSTMENT">{t("movements.types.adjustment_full")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {form.type === "ADJUSTMENT" 
                  ? t("movements.dialog.label_quantity_final") 
                  : t("movements.dialog.label_quantity")}
              </Label>
              <Input
                type="number"
                min={step}
                step={step}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                aria-describedby="movement-stock"
                required
              />
              {selected && stockHere !== undefined && (
                <p id="movement-stock" className="text-xs text-muted-foreground">
                  {t("movements.dialog.current_stock", { stock: formatQty(stockHere, selected.unit, t) })}
                </p>
              )}
            </div>

            {needsLot && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="movement-lot">{t("products.lots.code")}</Label>
                  <Input id="movement-lot" maxLength={40} value={form.lotCode} onChange={(e) => setForm({ ...form, lotCode: e.target.value })} required={form.type === "IN"} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="movement-lot-expires">{t("products.lots.expires")}</Label>
                  <Input id="movement-lot-expires" type="date" value={form.lotExpires} onChange={(e) => setForm({ ...form, lotExpires: e.target.value })} />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">{t("products.lots.movementHint")}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("movements.dialog.label_reason")}</Label>
              <Input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {apiErrorMessage(createMutation.error, t("movements.errors.save_failed"))}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending || isSearching || !form.product}>
                {createMutation.isPending ? t("common.saving") : t("movements.dialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}