import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getLowStockReport, getInventoryValueReport, getMovementsReport } from "@/api/reports"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ImmobilizedCapitalReport } from "@/components/reports/ImmobilizedCapitalReport"
import { StockForecastReport } from "@/components/reports/StockForecastReport"

export function Reports() {
  const { t } = useTranslation()
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

  const typeLabels = {
    IN: { label: t("reports.types.in"), variant: "default" },
    OUT: { label: t("reports.types.out"), variant: "destructive" },
    ADJUSTMENT: { label: t("reports.types.adjustment"), variant: "secondary" },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("reports.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
      </div>

      {/* Tarjetas resumen y módulos de análisis en grid de 4 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {t("reports.cards.total_value_title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              ${inventoryValueQuery.data?.totalValue?.toLocaleString() ?? "..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {inventoryValueQuery.data?.totalProducts ?? 0} {t("reports.cards.products_in_catalog")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {t("reports.cards.low_stock_title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{lowStockQuery.data?.length ?? "..."}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("reports.cards.require_restock")}</p>
          </CardContent>
        </Card>

        {/* Reporte de Capital Inmovilizado */}
        <div className="rounded-xl border border-[#221F3B] bg-[#151325] p-5 flex flex-col justify-between">
          <ImmobilizedCapitalReport />
        </div>

        {/* Reporte de Pronóstico de Stock */}
        <div className="rounded-xl border border-[#221F3B] bg-[#151325] p-5 flex flex-col justify-between">
          <StockForecastReport />
        </div>
      </div>

      {/* Detalle de Productos con Bajo Stock */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.tables.low_stock_detail_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reports.tables.sku")}</TableHead>
                  <TableHead>{t("reports.tables.product")}</TableHead>
                  <TableHead>{t("reports.tables.current_stock")}</TableHead>
                  <TableHead>{t("reports.tables.min_stock")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockQuery.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {t("reports.messages.no_low_stock")}
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

      {/* Historial de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reports.tables.movements_by_date_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="space-y-1">
              <Label className="text-xs">{t("reports.filters.from")}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("reports.filters.to")}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reports.tables.date")}</TableHead>
                  <TableHead>{t("reports.tables.product")}</TableHead>
                  <TableHead>{t("reports.tables.type")}</TableHead>
                  <TableHead>{t("reports.tables.quantity")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsReportQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {t("common.loading")}
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
                        <Badge variant={config?.variant}>{config?.label}</Badge>
                      </TableCell>
                      <TableCell>{movement.quantity}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}