import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getLowStockReport, getInventoryValueReport, getMovementsReport } from "@/api/reports"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const typeLabels = {
  IN: { label: "Entrada", variant: "default" },
  OUT: { label: "Salida", variant: "destructive" },
  ADJUSTMENT: { label: "Ajuste", variant: "secondary" },
}

export function Reports() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const lowStockQuery = useQuery({
    queryKey: ["reports", "low-stock"],
    queryFn: getLowStockReport,
  })

  const inventoryValueQuery = useQuery({
    queryKey: ["reports", "inventory-value"],
    queryFn: getInventoryValueReport,
  })

  const movementsReportQuery = useQuery({
    queryKey: ["reports", "movements", from, to],
    queryFn: () => getMovementsReport(from || undefined, to || undefined),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="text-sm text-muted-foreground">Visión general del estado del inventario</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Valor total del inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              ${inventoryValueQuery.data?.totalValue?.toLocaleString() ?? "..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {inventoryValueQuery.data?.totalProducts ?? 0} productos en catálogo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Productos con stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{lowStockQuery.data?.length ?? "..."}</p>
            <p className="text-xs text-muted-foreground mt-1">requieren reposición</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock bajo — detalle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Stock actual</TableHead>
                  <TableHead>Stock mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockQuery.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay productos con stock bajo. 🎉
                    </TableCell>
                  </TableRow>
                )}
                {lowStockQuery.data?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{product.stock}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.minStock}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos por rango de fechas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsReportQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Cargando...
                    </TableCell>
                  </TableRow>
                )}
                {movementsReportQuery.data?.map((movement) => {
                  const config = typeLabels[movement.type]
                  return (
                    <TableRow key={movement.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(movement.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{movement.product?.name}</TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </TableCell>
                      <TableCell>{movement.quantity}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}