import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { getProducts } from "@/api/products"
import { getLowStockReport, getInventoryValueReport, getMovementsReport } from "@/api/reports"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Package, AlertTriangle, DollarSign, Clock } from "lucide-react"
import { MovementsChart } from "@/components/charts/MovementsChart"
import { CategoryStockChart } from "@/components/charts/CategoryStockChart"
import { aggregateMovementsByDay, aggregateStockByCategory } from "@/lib/chart-utils"
import { usePurchaseRequestAlerts } from "@/hoocks/usePurchaseRequestAlerts"

// ← renombrado de PurchaseRequestAlertsCard a AlertsCard, ya que ahora
// mezcla solicitudes de compra Y productos por vencer
function AlertsCard() {
  const { t } = useTranslation();
  const { data: alerts, isLoading } = usePurchaseRequestAlerts();

  if (isLoading || !alerts) return null;

  // ← nuevo: expiringSoonProducts, con el mismo patrón de default [] que ya usabas
  const { expiringSoon = [], approvedUnfulfilled = [], expiringSoonProducts = [] } = alerts;
  if (expiringSoon.length === 0 && approvedUnfulfilled.length === 0 && expiringSoonProducts.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-500/20 bg-amber-500/5 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          {t("dashboard.alerts", "Alertas")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {expiringSoon.length > 0 && (
          <Link
            to="/purchase-requests"
            className="flex items-center gap-2 text-sm text-foreground/90 hover:underline hover:text-amber-500 transition-colors"
          >
            <Clock className="w-4 h-4 text-amber-500" />
            {t("dashboard.expiringSoon", "{{count}} solicitud(es) por vencer en menos de 3 días", {
              count: expiringSoon.length,
            })}
          </Link>
        )}

        {approvedUnfulfilled.length > 0 && (
          <Link
            to="/purchase-orders"
            className="flex items-center gap-2 text-sm text-foreground/90 hover:underline hover:text-orange-500 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            {t("dashboard.approvedUnfulfilled", "{{count}} solicitud(es) aprobada(s) sin orden de compra", {
              count: approvedUnfulfilled.length,
            })}
          </Link>
        )}

        {/* ← nuevo bloque */}
        {expiringSoonProducts.length > 0 && (
          <Link
            to="/products"
            className="flex items-center gap-2 text-sm text-foreground/90 hover:underline hover:text-red-500 transition-colors"
          >
            <Clock className="w-4 h-4 text-red-500" />
            {t("dashboard.expiringSoonProducts", "{{count}} producto(s) por vencer en menos de 7 días", {
              count: expiringSoonProducts.length,
            })}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { t } = useTranslation();

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const lowStockQuery = useQuery({
    queryKey: ["reports", "low-stock"],
    queryFn: getLowStockReport,
  });

  const inventoryValueQuery = useQuery({
    queryKey: ["reports", "inventory-value"],
    queryFn: getInventoryValueReport,
  });

  const movementsQuery = useQuery({
    queryKey: ["reports", "movements"],
    queryFn: getMovementsReport,
  });

  const movementsChartData = movementsQuery.data
    ? aggregateMovementsByDay(movementsQuery.data)
    : [];

  const categoryChartData = productsQuery.data
    ? aggregateStockByCategory(productsQuery.data)
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      {/* ← renombrado de <PurchaseRequestAlertsCard /> a <AlertsCard /> */}
      <AlertsCard />

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
  );
}