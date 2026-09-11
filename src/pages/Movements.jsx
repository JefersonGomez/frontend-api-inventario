import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getMovements, createMovement } from "@/api/movements"
import { getProducts } from "@/api/products"
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

const emptyForm = { productId: "", type: "IN", quantity: "", reason: "" }

const typeConfig = {
  IN: { label: "Entrada", variant: "default", icon: ArrowDownCircle },
  OUT: { label: "Salida", variant: "destructive", icon: ArrowUpCircle },
  ADJUSTMENT: { label: "Ajuste", variant: "secondary", icon: RotateCcw },
}

export function Movements() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

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

  const productItems = productsQuery.data?.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Movimientos</h1>
          <p className="text-sm text-muted-foreground">Historial de entradas, salidas y ajustes de stock</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo movimiento
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movementsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Cargando...
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
              <DialogTitle>Nuevo movimiento de stock</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              <Label>Producto</Label>
              <Select
                items={productItems}
                value={form.productId}
                onValueChange={(value) => setForm({ ...form, productId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {productsQuery.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de movimiento</Label>
              <Select
                items={[
                  { value: "IN", label: "Entrada" },
                  { value: "OUT", label: "Salida" },
                  { value: "ADJUSTMENT", label: "Ajuste (valor final)" },
                ]}
                value={form.type}
                onValueChange={(value) => setForm({ ...form, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Entrada</SelectItem>
                  <SelectItem value="OUT">Salida</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajuste (valor final)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {form.type === "ADJUSTMENT" ? "Cantidad final (conteo físico)" : "Cantidad"}
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
              <Label>Motivo (opcional)</Label>
              <Input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {createMutation.error?.response?.data?.error ?? "No se pudo registrar el movimiento."}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Registrando..." : "Registrar movimiento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}