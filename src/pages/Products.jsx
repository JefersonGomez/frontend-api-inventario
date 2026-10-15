import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/api/products"
import { getCategories } from "@/api/categories"
import { getSuppliers } from "@/api/suppliers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSearchParams } from "react-router-dom"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, FileUp } from "lucide-react"
import { BarcodeScanner } from "@/components/BarcodeScanner"
import { useMoney } from "@/hoocks/useMoney"
import { useAuth } from "@/context/AuthContext"
import { ImportProductsDialog } from "@/components/products/ImportProductsDialog"
import { ProductPriceHistory } from "@/components/products/ProductPriceHistory"
import { UNITS, TAX_RATES, qtyStep, formatQty } from "@/lib/units"
import { apiErrorMessage } from "@/lib/api-error"

const emptyForm = { 
  sku: "", 
  barcode: "", 
  name: "", 
  description: "", 
  price: "", 
  cost: "",
  stock: "", 
  minStock: "", 
  categoryId: "",
  supplierId: "",
  expirationDate: "",
  unit: "UNIT",
  taxRate: "RATE_13",
  cabys: "",
}

export function Products() {
  const { t } = useTranslation()
  const money = useMoney()
  const { user } = useAuth()
  const [importing, setImporting] = useState(false)
  const queryClient = useQueryClient()

  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get("highlight")
  const fold = (v) => (v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  const q = fold(searchParams.get("q")).trim()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deletingProduct, setDeletingProduct] = useState(null)

  const productsQuery = useQuery({ queryKey: ["products"], queryFn: getProducts })
  // importados sin precio: quedan "Por completar" hasta que se editan con su precio
  const [onlyPending, setOnlyPending] = useState(false)
  const pendingCount = (productsQuery.data ?? []).filter((p) => p.pendingReview).length
  const visibleProducts = (productsQuery.data ?? []).filter(
    (p) => (!onlyPending || p.pendingReview) &&
      (!q || [p.name, p.sku, p.barcode, p.category?.name].some((v) => fold(v).includes(q)))
  )
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories })
  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: getSuppliers })
  // "none" es el valor del ítem "Sin proveedor" del Select; en el form vacío = sin proveedor
  const unitItems = UNITS.map((u) => ({ value: u, label: t(`units.long.${u}`) }))
  const taxItems = TAX_RATES.map((r) => ({ value: r, label: t(`taxRates.${r}`) }))
  const supplierItems = [
    { value: "none", label: t("products.dialog.supplier_none") },
    ...(suppliersQuery.data ?? []).map((s) => ({ value: s.id, label: s.name })),
  ]

  const createMutation = useMutation({
    mutationFn: () =>
      createProduct({
        ...form,
        price: Number(form.price),
        cost: form.cost === "" ? null : Number(form.cost),
        stock: Number(form.stock),
        minStock: Number(form.minStock),
        supplierId: form.supplierId || null,
        expirationDate: form.expirationDate || undefined,
        cabys: form.cabys.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["movements"] })
      closeDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProduct(editingProduct.id, {
        name: form.name,
        barcode: form.barcode,
        description: form.description,
        price: Number(form.price),
        // vacío = sin costo (null); en la recepción de órdenes se vuelve a calcular solo
        cost: form.cost === "" ? null : Number(form.cost),
        minStock: Number(form.minStock),
        categoryId: form.categoryId,
        supplierId: form.supplierId || null,
        expirationDate: form.expirationDate || undefined,
        unit: form.unit,
        taxRate: form.taxRate,
        cabys: form.cabys.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (productId) => deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setDeletingProduct(null)
    },
  })

  function openCreateDialog() {
    setEditingProduct(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(product) {
    setEditingProduct(product)
    setForm({
      sku: product.sku,
      barcode: product.barcode || "",
      name: product.name,
      description: product.description ?? "",
      price: product.pendingReview ? "" : String(product.price),
      cost: product.cost == null ? "" : String(Number(product.cost)),
      stock: String(product.stock),
      minStock: String(product.minStock),
      categoryId: product.categoryId ?? "",
      supplierId: product.supplierId ?? "",
      expirationDate: product.expirationDate
        ? product.expirationDate.slice(0, 10)
        : "",
      unit: product.unit ?? "UNIT",
      taxRate: product.taxRate ?? "RATE_13",
      cabys: product.cabys ?? "",
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingProduct(null)
    setForm(emptyForm)
    createMutation.reset()
    updateMutation.reset()
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (editingProduct) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  function handleDelete() {
    if (deletingProduct?.id) {
      deleteMutation.mutate(deletingProduct.id)
    }
  }

  const handleScan = (code) => {
    setForm((prev) => ({ ...prev, barcode: code }))
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const saveError = createMutation.error || updateMutation.error
  const step = qtyStep(form.unit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("products.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("products.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role === "ADMIN" && (
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileUp className="w-4 h-4 mr-2" />
              {t("products.import.button")}
            </Button>
          )}
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            {t("products.new_button")}
          </Button>
        </div>
      </div>
      <ImportProductsDialog open={importing} onOpenChange={setImporting} />

      {(pendingCount > 0 || onlyPending) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
          <span>{t("products.pending.banner", { count: pendingCount })}</span>
          <Button variant="outline" size="sm" onClick={() => setOnlyPending((v) => !v)}>
            {t(onlyPending ? "products.pending.hide" : "products.pending.show")}
          </Button>
        </div>
      )}

      <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("products.table.sku")}</TableHead>
              <TableHead>{t("products.table.name")}</TableHead>
              <TableHead>{t("products.table.category")}</TableHead>
              <TableHead>{t("products.table.price")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("products.table.cost")}</TableHead>
              <TableHead>{t("products.table.stock")}</TableHead>
              <TableHead className="text-right">{t("products.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}

            {!productsQuery.isLoading && visibleProducts.length === 0 && q && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t("products.noResults", { q: searchParams.get("q") })}
                </TableCell>
              </TableRow>
            )}

            {visibleProducts.map((product) => (
              <TableRow key={product.id}  className={product.id === highlightId ? "bg-primary/10" : undefined}>
                <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-muted-foreground">{product.category?.name}</TableCell>
                <TableCell>
                  {product.pendingReview ? <Badge variant="outline">{t("products.pending.badge")}</Badge> : money.format(product.price)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {product.cost == null ? "—" : money.format(product.cost)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {product.stock <= product.minStock ? (
                    <Badge variant="destructive">{formatQty(product.stock, product.unit, t)}</Badge>
                  ) : (
                    formatQty(product.stock, product.unit, t)
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeletingProduct(product)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? t("products.dialog.edit_title") : t("products.dialog.create_title")}
              </DialogTitle>
            </DialogHeader>

            {!editingProduct && (
              <div className="space-y-2">
                <Label>{t("products.dialog.label_sku")}</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("products.dialog.label_barcode")}</Label>
              <div className="flex gap-2">
                <Input
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="Escanea o escribe aquí"
                />
                <BarcodeScanner onScan={handleScan} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("products.dialog.label_name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("products.dialog.label_description")}</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("products.dialog.label_price")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{t("products.dialog.label_cost")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  aria-describedby="cost-hint"
                />
                <p id="cost-hint" className="text-xs text-muted-foreground">{t("products.dialog.cost_hint")}</p>
              </div>

              <div className="space-y-2">
                <Label>{t("products.dialog.label_unit")}</Label>
                <Select value={form.unit} onValueChange={(value) => setForm({ ...form, unit: value })} items={unitItems}>
                  <SelectTrigger className="w-full" aria-describedby="unit-hint">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitItems.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("products.dialog.label_tax")}</Label>
                <Select value={form.taxRate} onValueChange={(value) => setForm({ ...form, taxRate: value })} items={taxItems}>
                  <SelectTrigger className="w-full" aria-describedby="tax-hint">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taxItems.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p id="unit-hint" className="col-span-2 -mt-1 text-xs text-muted-foreground">
                {t("products.dialog.unit_hint")} <span id="tax-hint">{t("products.dialog.tax_hint")}</span>
              </p>

              {!editingProduct && (
                <div className="space-y-2">
                  <Label>{t("products.dialog.label_initial_stock")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step={step}
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("products.dialog.label_min_stock")}</Label>
                <Input
                  type="number"
                  min="0"
                  step={step}
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{t("products.dialog.label_expiration_date", "Fecha de vencimiento")}</Label>
                <Input
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("products.dialog.label_category")}</Label>
              <Select
                value={form.categoryId}
                onValueChange={(value) => setForm({ ...form, categoryId: value })}
                items={(categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("products.dialog.placeholder_category")} />
                </SelectTrigger>
                <SelectContent>
                  {categoriesQuery.data?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("products.dialog.label_supplier")}</Label>
              <Select
                value={form.supplierId || "none"}
                onValueChange={(value) => setForm({ ...form, supplierId: value === "none" ? "" : value })}
                items={supplierItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supplierItems.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-cabys">{t("products.dialog.label_cabys")}</Label>
              <Input
                id="product-cabys"
                inputMode="numeric"
                maxLength={13}
                pattern="\d{13}"
                value={form.cabys}
                onChange={(e) => setForm({ ...form, cabys: e.target.value.replace(/\D/g, "") })}
                aria-describedby="cabys-hint"
              />
              <p id="cabys-hint" className="text-xs text-muted-foreground">{t("products.dialog.cabys_hint")}</p>
            </div>

            {/* Historial de precios, solo al editar */}
            {editingProduct && (
              <ProductPriceHistory productId={editingProduct.id} />
            )}

            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(saveError, t("products.dialog.save_error"))}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("products.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("products.delete.description", { name: deletingProduct?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProduct(null)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}