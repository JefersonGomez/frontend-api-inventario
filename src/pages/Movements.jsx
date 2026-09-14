import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getMovements, createMovement } from "@/api/movements"
import { getProducts, getProductByBarcode } from "@/api/products" // Importar nueva función
import { Button } from "@/components/ui/button"
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

const emptyForm = { productId: "", type: "IN", quantity: "", reason: "" }

export function Movements() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [isSearching, setIsSearching] = useState(false) // Estado para feedback visual

  const movementsQuery = useQuery({ queryKey: ["movements"], queryFn: getMovements })
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: getProducts })

  const createMutation = useMutation({
    mutationFn: () =>
      createMovement({
        ...form,
        quantity: Number(form.quantity),
        reason: form.reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movements"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      setDialogOpen(false)
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
        setForm((prev) => ({ ...prev, productId: product.id }))
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
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("movements.new_button")}
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("movements.table.date")}</TableHead>
              <TableHead>{t("movements.table.product")}</TableHead>
              <TableHead>{t("movements.table.type")}</TableHead>
              <TableHead>{t("movements.table.quantity")}</TableHead>
              <TableHead>{t("movements.table.user")}</TableHead>
              <TableHead>{t("movements.table.reason")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movementsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}

            {movementsQuery.data?.map((movement) => {
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
                  <TableCell>{movement.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">{movement.user?.name}</TableCell>
                  <TableCell className="text-muted-foreground">{movement.reason ?? "—"}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("movements.dialog.title")}</DialogTitle>
            </DialogHeader>

            {/* CAMPO DE PRODUCTO CON ESCÁNER INTEGRADO */}
            <div className="space-y-2">
              <Label>{t("movements.dialog.label_product")}</Label>
              <div className="flex gap-2">
                <Select
                  value={form.productId}
                  onValueChange={(value) => setForm({ ...form, productId: value })}
                  disabled={isSearching}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("movements.dialog.placeholder_product")} />
                  </SelectTrigger>
                  <SelectContent>
                    {productsQuery.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Botón de escaneo integrado */}
                <BarcodeScanner onScan={handleScan} />
              </div>
              
              {isSearching && (
                <p className="text-xs text-muted-foreground animate-pulse">
                  {t("movements.dialog.scanning")}...
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("movements.dialog.label_type")}</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm({ ...form, type: value })}
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
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("movements.dialog.label_reason")}</Label>
              <Input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {createMutation.error?.response?.data?.error ?? t("movements.errors.save_failed")}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending || isSearching || !form.productId}>
                {createMutation.isPending ? t("common.saving") : t("movements.dialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}