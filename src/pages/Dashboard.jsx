import { useQuery } from "@tanstack/react-query"
import { getProducts } from "@/api/products"
import { getLowStockReport, getInventoryValueReport } from "@/api/reports"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, AlertTriangle, DollarSign } from "lucide-react"

export function Dashboard() {
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  })

  const lowStockQuery = useQuery({
    queryKey: ["reports", "low-stock"],
    queryFn: getLowStockReport,
  })

  const inventoryValueQuery = useQuery({
    queryKey: ["reports", "inventory-value"],
    queryFn: getInventoryValueReport,
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen del inventario de hoy</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Total productos
            </CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {productsQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-semibold">{productsQuery.data?.length ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Stock bajo
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            {lowStockQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-semibold">{lowStockQuery.data?.length ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Valor del inventario
            </CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {inventoryValueQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-semibold">
                ${inventoryValueQuery.data?.totalValue?.toLocaleString() ?? 0}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos con stock bajo</CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockQuery.isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}

          {lowStockQuery.isError && (
            <p className="text-sm text-destructive">No se pudieron cargar los datos.</p>
          )}

          {lowStockQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay productos con stock bajo. 🎉</p>
          )}

          {lowStockQuery.data?.length > 0 && (
            <div className="space-y-3">
              {lowStockQuery.data.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {product.stock} / {product.minStock}
                    </span>
                    <Badge variant="destructive">Bajo</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}