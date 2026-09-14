import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getProducts } from "@/api/products"
import { getLowStockReport, getInventoryValueReport, getMovementsReport } from "@/api/reports" // Asegúrate de importar getMovementsReport
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, AlertTriangle, DollarSign } from "lucide-react"
import { MovementsChart } from "@/components/charts/MovementsChart"
import { CategoryStockChart } from "@/components/charts/CategoryStockChart"
import { aggregateMovementsByDay, aggregateStockByCategory } from "@/lib/chart-utils"

export function Dashboard() {
  const { t } = useTranslation()

  // Queries existentes
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

  // Nueva query para movimientos (para el gráfico)
  const movementsQuery = useQuery({
    queryKey: ["reports", "movements"],
    queryFn: getMovementsReport,
  })

  // Procesamiento de datos para los gráficos
  const movementsChartData = movementsQuery.data 
    ? aggregateMovementsByDay(movementsQuery.data) 
    : []
  
  const categoryChartData = productsQuery.data 
    ? aggregateStockByCategory(productsQuery.data) 
    : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      {/* Tarjetas de Métricas Existentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {t("dashboard.cards.total_products")}
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
              {t("dashboard.cards.low_stock")}
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
              {t("dashboard.cards.inventory_value")}
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

      {/* Sección de Gráficos Nuevos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.charts.movements")}</CardTitle>
          </CardHeader>
          <CardContent>
            {movementsQuery.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <MovementsChart data={movementsChartData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.charts.stock_by_category")}</CardTitle>
          </CardHeader>
          <CardContent>
            {productsQuery.isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <CategoryStockChart data={categoryChartData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Stock Bajo Existente */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.low_stock_table.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockQuery.isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}

          {lowStockQuery.isError && (
            <p className="text-sm text-destructive">{t("common.error_loading")}</p>
          )}

          {lowStockQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("dashboard.low_stock_table.empty")}</p>
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
                    <Badge variant="destructive">{t("dashboard.badges.low")}</Badge>
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