import { useState } from "react"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from "@/api/products"
import { Pagination } from "@/components/Pagination"
import { SearchInput } from "@/components/SearchInput"
import { useListParams } from "@/hoocks/useListParams"
import { getCategories } from "@/api/categories"
import { getSuppliers } from "@/api/suppliers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Plus, Pencil, Trash2, FileUp, Layers, ChevronRight } from "lucide-react"
import { BarcodeScanner } from "@/components/BarcodeScanner"
import { useMoney } from "@/hoocks/useMoney"
import { usePermissions } from "@/hoocks/usePermissions"
import { ImportProductsDialog } from "@/components/products/ImportProductsDialog"
import { ProductPriceHistory } from "@/components/products/ProductPriceHistory"
import { UNITS, TAX_RATES, qtyStep, formatQty } from "@/lib/units"
import { apiErrorMessage } from "@/lib/api-error"
import { LocationSelect } from "@/components/LocationSelect"
import { getProductGroups } from "@/api/productGroups"
import { ProductGroupsDialog } from "@/components/products/ProductGroupsDialog"

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
  groupId: "", // "" = no es una variante
  attributes: {}, // { Talla: "M", Color: "Rojo" }
  locationId: "", // dónde entra el stock inicial ("" = la ubicación activa)
}

// "Talla M · Color Rojo" debajo del nombre de una variante
const variantLabel = (p) =>
  p.group ? p.group.attributeNames.map((a) => `${a} ${p.attributes?.[a] ?? ""}`.trim()).join(" · ") : null

export function Products() {
  const { t } = useTranslation()
  const money = useMoney()
  const { can } = usePermissions()
  const canManage = can("products.manage")
  const showCost = can("costs.view")
  const cols = showCost ? 7 : 6
  const [importing, setImporting] = useState(false)
  const [managingGroups, setManagingGroups] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set()) // productos base desplegados
  const toggleGroup = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const queryClient = useQueryClient()

  // búsqueda (también la del buscador global: /products?q=), filtros y página en la URL
  const list = useListParams()
  const highlightId = list.get("highlight")
  const filters = {
    q: list.get("q"),
    categoryId: list.get("categoryId"),
    pending: list.get("pending") === "1",
    lowStock: list.get("lowStock") === "1",
  }
  const filterParams = {
    ...(filters.q && { q: filters.q }),
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.pending && { pending: 1 }),
    ...(filters.lowStock && { lowStock: 1 }),
  }
  const hasFilters = Object.keys(filterParams).length > 0

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deletingProduct, setDeletingProduct] = useState(null)

  // vista agrupada del servidor: productos base (con su resumen) y después productos sueltos
  const productsQuery = useQuery({
    queryKey: ["products", "grouped", list.page, filterParams],
    queryFn: () => getProducts({ view: "grouped", page: list.page, ...filterParams }),
    placeholderData: keepPreviousData,
  })
  const rows = productsQuery.data?.items ?? []
  // importados sin precio: quedan "Por completar" hasta que se editan con su precio
  const pendingCount = productsQuery.data?.pendingCount ?? 0
  // el resaltado (?highlight=) puede estar en otra página: se trae aparte y va arriba
  const pinnedQuery = useQuery({
    queryKey: ["products", "one", highlightId],
    queryFn: () => getProduct(highlightId),
    enabled: Boolean(highlightId) && !productsQuery.isLoading && !rows.some((r) => r.id === highlightId),
  })
  const pinned = pinnedQuery.data && !pinnedQuery.data.groupId ? pinnedQuery.data : null
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories })
  const categoryFilterItems = [
    { value: "all", label: t("list.all") },
    ...(categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]
  const groupsQuery = useQuery({ queryKey: ["product-groups"], queryFn: getProductGroups })
  const groupItems = [
    { value: "none", label: t("products.variants.group_none") },
    ...(groupsQuery.data ?? []).map((g) => ({ value: g.id, label: g.name })),
  ]
  const selectedGroup = (groupsQuery.data ?? []).find((g) => g.id === form.groupId)
  // solo los atributos del grupo elegido (si se cambia de grupo, los de otro no viajan)
  const variantPayload = () =>
    selectedGroup
      ? { groupId: selectedGroup.id, attributes: Object.fromEntries(selectedGroup.attributeNames.map((a) => [a, (form.attributes[a] ?? "").trim()])) }
      : { groupId: null, attributes: null }
  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: () => getSuppliers() })
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
        locationId: form.locationId || undefined,
        minStock: Number(form.minStock),
        supplierId: form.supplierId || null,
        expirationDate: form.expirationDate || undefined,
        cabys: form.cabys.trim() || null,
        ...variantPayload(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product-groups"] })
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
        // vacío = sin costo (null); en la recepción de órdenes se vuelve a calcular solo.
        // Sin permiso de ver costos no se manda: el campo no se mostró y lo borraría
        ...(showCost && { cost: form.cost === "" ? null : Number(form.cost) }),
        minStock: Number(form.minStock),
        categoryId: form.categoryId,
        supplierId: form.supplierId || null,
        expirationDate: form.expirationDate || undefined,
        unit: form.unit,
        taxRate: form.taxRate,
        cabys: form.cabys.trim() || null,
        ...variantPayload(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product-groups"] })
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (productId) => deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product-groups"] })
      setDeletingProduct(null)
    },
  })

  function openCreateDialog() {
    setEditingProduct(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  async function openCreateVariant(group) {
    const siblings = await queryClient.fetchQuery({
      queryKey: ["products", "variants", group.id, {}],
      queryFn: () => getProducts({ groupId: group.id, pageSize: 100 }),
    })
    const sibling = siblings.items[0]
    setEditingProduct(null)
    setForm({
      ...emptyForm,
      name: group.name,
      groupId: group.id,
      ...(sibling && {
        categoryId: sibling.categoryId ?? "",
        supplierId: sibling.supplierId ?? "",
        unit: sibling.unit,
        taxRate: sibling.taxRate,
        cabys: sibling.cabys ?? "",
        price: sibling.pendingReview ? "" : String(sibling.price),
      }),
    })
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
      groupId: product.groupId ?? "",
      attributes: product.attributes ?? {},
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

  function renderProduct(product, nested) {
    return (
      <TableRow key={product.id} className={product.id === highlightId ? "bg-primary/10" : nested ? "bg-muted/30" : undefined}>
        <TableCell className={`text-muted-foreground ${nested ? "pl-8" : ""}`}>{product.sku}</TableCell>
        <TableCell className="font-medium">
          {product.name}
          {variantLabel(product) && (
            <span className="block text-xs font-normal text-muted-foreground">{variantLabel(product)}</span>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground">{product.category?.name}</TableCell>
        <TableCell>
          {product.pendingReview ? <Badge variant="outline">{t("products.pending.badge")}</Badge> : money.format(product.price)}
        </TableCell>
        {showCost && (
          <TableCell className="hidden md:table-cell text-muted-foreground">
            {product.cost == null ? "—" : money.format(product.cost)}
          </TableCell>
        )}
        <TableCell className="whitespace-nowrap">
          {product.stock <= product.minStock ? (
            <Badge variant="destructive">{formatQty(product.stock, product.unit, t)}</Badge>
          ) : (
            formatQty(product.stock, product.unit, t)
          )}
        </TableCell>
        <TableCell className="text-right whitespace-nowrap">
          {canManage && (<>
          <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)} aria-label={`${t("products.dialog.edit_title")}: ${product.name}`}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeletingProduct(product)} aria-label={`${t("products.delete.title")}: ${product.name}`}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
          </>)}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("products.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("products.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button variant="outline" onClick={() => setManagingGroups(true)}>
              <Layers className="w-4 h-4 mr-2" />
              {t("products.variants.manage")}
            </Button>
          )}
          {canManage && (
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileUp className="w-4 h-4 mr-2" />
              {t("products.import.button")}
            </Button>
          )}
          {canManage && (
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {t("products.new_button")}
            </Button>
          )}
        </div>
      </div>
      <ImportProductsDialog open={importing} onOpenChange={setImporting} />
      <ProductGroupsDialog open={managingGroups} onOpenChange={setManagingGroups} />

      {(pendingCount > 0 || filters.pending) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
          <span>{t("products.pending.banner", { count: pendingCount })}</span>
          <Button variant="outline" size="sm" onClick={() => list.set({ pending: filters.pending ? "" : 1 })}>
            {t(filters.pending ? "products.pending.hide" : "products.pending.show")}
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          id="product-search"
          value={filters.q}
          onSearch={(q) => list.set({ q })}
          placeholder={t("list.search")}
          className="w-full max-w-sm"
        />
        <Select items={categoryFilterItems} value={filters.categoryId || "all"} onValueChange={(v) => list.set({ categoryId: v === "all" ? "" : v })}>
          <SelectTrigger className="w-48" aria-label={t("products.table.category")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryFilterItems.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant={filters.lowStock ? "default" : "outline"}
          size="sm"
          aria-pressed={filters.lowStock}
          onClick={() => list.set({ lowStock: filters.lowStock ? "" : 1 })}
        >
          {t("products.lowStockFilter")}
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("products.table.sku")}</TableHead>
              <TableHead>{t("products.table.name")}</TableHead>
              <TableHead>{t("products.table.category")}</TableHead>
              <TableHead>{t("products.table.price")}</TableHead>
              {showCost && <TableHead className="hidden md:table-cell">{t("products.table.cost")}</TableHead>}
              <TableHead>{t("products.table.stock")}</TableHead>
              <TableHead className="text-right">{t("products.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={cols} className="text-center text-muted-foreground">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}

            {!productsQuery.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={cols} className="text-center text-muted-foreground">
                  {filters.q ? t("products.noResults", { q: filters.q }) : t("pagination.none")}
                </TableCell>
              </TableRow>
            )}

            {pinned && renderProduct(pinned, false)}
            {rows.map((r) =>
              r.kind === "group" ? (
                <GroupRows
                  key={r.id}
                  group={r}
                  t={t}
                  money={money}
                  canManage={canManage}
                  showCost={showCost}
                  cols={cols}
                  // con filtros, los grupos que aparecen es porque alguna variante coincide: se abren solos
                  open={expanded.has(r.id) || hasFilters}
                  variantParams={filterParams}
                  onToggle={() => toggleGroup(r.id)}
                  onAddVariant={() => openCreateVariant(r)}
                  renderProduct={(p) => renderProduct(p, true)}
                />
              ) : (
                renderProduct(r, false)
              )
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination data={productsQuery.data} onPage={list.setPage} />

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        {/* ancho y con scroll propio: en pantallas bajas el formulario no queda cortado */}
        <DialogContent className="sm:max-w-3xl max-h-[92dvh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? t("products.dialog.edit_title") : t("products.dialog.create_title")}
              </DialogTitle>
            </DialogHeader>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("products.dialog.section_basic")}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="product-name">{t("products.dialog.label_name")}</Label>
                  <Input id="product-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                {editingProduct ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="product-sku">{t("products.dialog.label_sku")}</Label>
                    <Input id="product-sku" value={form.sku} disabled />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="product-sku">{t("products.dialog.label_sku")}</Label>
                    <Input id="product-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                  </div>
                )}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="product-barcode">{t("products.dialog.label_barcode")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="product-barcode"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      placeholder="Escanea o escribe aquí"
                    />
                    <BarcodeScanner onScan={handleScan} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="product-category">{t("products.dialog.label_category")}</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(value) => setForm({ ...form, categoryId: value })}
                    items={(categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
                  >
                    <SelectTrigger id="product-category" className="w-full">
                      <SelectValue placeholder={t("products.dialog.placeholder_category")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesQuery.data?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="product-description">{t("products.dialog.label_description")}</Label>
                  <Input id="product-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="product-supplier">{t("products.dialog.label_supplier")}</Label>
                  <Select
                    value={form.supplierId || "none"}
                    onValueChange={(value) => setForm({ ...form, supplierId: value === "none" ? "" : value })}
                    items={supplierItems}
                  >
                    <SelectTrigger id="product-supplier" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierItems.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("products.dialog.section_price")}</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="product-price">{t("products.dialog.label_price")}</Label>
                  <Input id="product-price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                {showCost && <div className="space-y-1.5">
                  <Label htmlFor="product-cost">{t("products.dialog.label_cost")}</Label>
                  <Input id="product-cost" type="number" step="0.01" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} aria-describedby="price-hint" />
                </div>}
                <div className="space-y-1.5">
                  <Label htmlFor="product-tax">{t("products.dialog.label_tax")}</Label>
                  <Select value={form.taxRate} onValueChange={(value) => setForm({ ...form, taxRate: value })} items={taxItems}>
                    <SelectTrigger id="product-tax" className="w-full" aria-describedby="price-hint">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taxItems.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="product-cabys">{t("products.dialog.label_cabys")}</Label>
                  <Input
                    id="product-cabys"
                    inputMode="numeric"
                    maxLength={13}
                    pattern="\d{13}"
                    value={form.cabys}
                    onChange={(e) => setForm({ ...form, cabys: e.target.value.replace(/\D/g, "") })}
                    aria-describedby="price-hint"
                  />
                </div>
              </div>
              <p id="price-hint" className="text-xs text-muted-foreground">
                {t("products.dialog.tax_hint")} {t("products.dialog.cost_hint")} {t("products.dialog.cabys_hint")}
              </p>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("products.dialog.section_stock")}</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="product-unit">{t("products.dialog.label_unit")}</Label>
                  <Select value={form.unit} onValueChange={(value) => setForm({ ...form, unit: value })} items={unitItems}>
                    <SelectTrigger id="product-unit" className="w-full" aria-describedby="stock-hint">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitItems.map((u) => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!editingProduct && (
                  <div className="space-y-1.5">
                    <Label htmlFor="product-stock">{t("products.dialog.label_initial_stock")}</Label>
                    <Input id="product-stock" type="number" min="0" step={step} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="product-minstock">{t("products.dialog.label_min_stock")}</Label>
                  <Input id="product-minstock" type="number" min="0" step={step} value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="product-expiration">{t("products.dialog.label_expiration_date", "Fecha de vencimiento")}</Label>
                  <Input id="product-expiration" type="date" value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} />
                </div>
              </div>
              <p id="stock-hint" className="text-xs text-muted-foreground">{t("products.dialog.unit_hint")}</p>
              {editingProduct ? (
                <StockByLocation productId={editingProduct.id} unit={form.unit} t={t} />
              ) : (
                <LocationSelect
                  id="product-location"
                  label={t("products.dialog.label_location")}
                  value={form.locationId}
                  onChange={(locationId) => setForm({ ...form, locationId })}
                />
              )}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("products.dialog.section_variant")}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="product-group">{t("products.variants.label_group")}</Label>
                  <Select
                    value={form.groupId || "none"}
                    onValueChange={(value) => setForm({ ...form, groupId: value === "none" ? "" : value })}
                    items={groupItems}
                  >
                    <SelectTrigger id="product-group" className="w-full" aria-describedby="product-group-hint">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {groupItems.map((g) => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedGroup?.attributeNames.map((a) => (
                  <div key={a} className="space-y-1.5">
                    <Label htmlFor={`attr-${a}`}>{a}</Label>
                    <Input
                      id={`attr-${a}`}
                      value={form.attributes[a] ?? ""}
                      onChange={(e) => setForm({ ...form, attributes: { ...form.attributes, [a]: e.target.value } })}
                      required
                    />
                  </div>
                ))}
              </div>
              <p id="product-group-hint" className="text-xs text-muted-foreground">{t("products.variants.group_hint")}</p>
            </fieldset>

            {/* Historial de precios, solo al editar */}
            {editingProduct && <ProductPriceHistory productId={editingProduct.id} />}

            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(saveError, t("products.dialog.save_error"))}
              </p>
            )}

            {/* pie fijo: Guardar siempre visible aunque el formulario tenga scroll */}
            <DialogFooter className="sticky -bottom-6 -mx-6 -mb-6 border-t border-border bg-popover px-6 py-3">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                {t("common.cancel")}
              </Button>
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
// Fila de un producto base (resumen calculado en el servidor) + sus variantes, que se piden al
// desplegarlo (con los mismos filtros de la tabla)
// Al editar: cuánto hay en cada ubicación (solo lectura; se cambia con movimientos o transferencias)
function StockByLocation({ productId, unit, t }) {
  const { data } = useQuery({ queryKey: ["products", productId, "detail"], queryFn: () => getProduct(productId) })
  const stocks = data?.stocks ?? []
  const inTransit = Number(data?.inTransit ?? 0)
  if (stocks.length <= 1 && !inTransit) return null
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{t("products.dialog.stock_by_location")}</p>
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {stocks.map((s) => (
          <li key={s.location.id} className="flex justify-between gap-3">
            <span className="truncate">{s.location.name}</span>
            <span className="font-mono tabular-nums">{formatQty(s.quantity, unit, t)}</span>
          </li>
        ))}
      </ul>
      {inTransit > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{t("products.dialog.in_transit", { qty: formatQty(inTransit, unit, t) })}</p>
      )}
    </div>
  )
}

function GroupRows({ group, t, money, canManage, showCost, cols, open, variantParams, onToggle, onAddVariant, renderProduct }) {
  const { variantCount: count, minPrice, maxPrice, totalStock, unit, lowCount: low } = group
  const variantsQuery = useQuery({
    queryKey: ["products", "variants", group.id, variantParams],
    queryFn: () => getProducts({ groupId: group.id, pageSize: 100, ...variantParams }),
    enabled: open && count > 0,
  })
  const variants = variantsQuery.data?.items ?? []
  const attrs = group.attributeNames.join(", ")
  const price =
    minPrice == null ? "—" : minPrice === maxPrice ? money.format(minPrice) : `${money.format(minPrice)} – ${money.format(maxPrice)}`
  return (
    <>
      <TableRow className="bg-muted/50">
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 size-7"
            onClick={onToggle}
            disabled={count === 0}
            aria-expanded={open}
            aria-label={t(open ? "products.variants.collapse" : "products.variants.expand", { name: group.name })}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
          </Button>
        </TableCell>
        <TableCell className="font-semibold">
          <span className="inline-flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
            {group.name}
          </span>
          <span className="block text-xs font-normal text-muted-foreground">
            {count > 0 ? t("products.variants.summary", { count, attrs }) : t("products.variants.no_variants", { attrs })}
          </span>
        </TableCell>
        <TableCell className="text-muted-foreground">
          <Badge variant="outline">{t("products.variants.base_badge")}</Badge>
        </TableCell>
        <TableCell className="whitespace-nowrap">{price}</TableCell>
        {showCost && <TableCell className="hidden md:table-cell text-muted-foreground">—</TableCell>}
        <TableCell className="whitespace-nowrap">
          {totalStock != null && unit ? formatQty(totalStock, unit, t) : "—"}
          {low > 0 && <Badge variant="destructive" className="ml-2">{t("products.variants.low", { count: low })}</Badge>}
        </TableCell>
        <TableCell className="text-right">
          {canManage && (
            <Button variant="outline" size="sm" onClick={onAddVariant} aria-label={t("products.variants.add_variant_aria", { name: group.name })}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("products.variants.add_variant")}
            </Button>
          )}
        </TableCell>
      </TableRow>
      {open && variantsQuery.isLoading && (
        <TableRow>
          <TableCell colSpan={cols} className="pl-8 text-sm text-muted-foreground">{t("common.loading")}</TableCell>
        </TableRow>
      )}
      {open && variants.map((p) => renderProduct(p))}
    </>
  )
}
