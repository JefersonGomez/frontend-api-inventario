import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/api/products"
import { getCategories } from "@/api/categories"
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
import { Plus, Pencil, Trash2 } from "lucide-react"
import { BarcodeScanner } from "@/components/BarcodeScanner"
import { ProductPriceHistory } from "@/components/products/ProductPriceHistory"

const emptyForm = { 
  sku: "", 
  barcode: "", 
  name: "", 
  description: "", 
  price: "", 
  stock: "", 
  minStock: "", 
  categoryId: "" 
}

export function Products() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deletingProduct, setDeletingProduct] = useState(null)

  const productsQuery = useQuery({ queryKey: ["products"], queryFn: getProducts })
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories })

  const createMutation = useMutation({
    mutationFn: () =>
      createProduct({
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        minStock: Number(form.minStock),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
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
        minStock: Number(form.minStock),
        categoryId: form.categoryId,
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
      price: String(product.price),
      stock: String(product.stock),
      minStock: String(product.minStock),
      categoryId: product.categoryId ?? "",
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingProduct(null)
    setForm(emptyForm)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("products.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("products.subtitle")}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          {t("products.new_button")}
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
              <TableHead>{t("products.table.stock")}</TableHead>
              <TableHead className="text-right">{t("products.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}

            {productsQuery.data?.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-muted-foreground">{product.category?.name}</TableCell>
                <TableCell>${Number(product.price).toFixed(2)}</TableCell>
                <TableCell>
                  {product.stock <= product.minStock ? (
                    <Badge variant="destructive">{product.stock}</Badge>
                  ) : (
                    product.stock
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

              {!editingProduct && (
                <div className="space-y-2">
                  <Label>{t("products.dialog.label_initial_stock")}</Label>
                  <Input
                    type="number"
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
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("products.dialog.label_category")}</Label>
              <Select
                value={form.categoryId}
                onValueChange={(value) => setForm({ ...form, categoryId: value })}
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

            {/* Historial de precios, solo al editar */}
            {editingProduct && (
              <ProductPriceHistory productId={editingProduct.id} />
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