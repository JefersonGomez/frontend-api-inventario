import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FileSpreadsheet, History, Printer } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  getLowStockReport, getInventoryValueReport, getMovementsReport, getInventoryValueBreakdown, getStockForecast,
} from "@/api/reports"
import { getCompany } from "@/api/company"
import { downloadXlsx } from "@/lib/xlsx"
import { Button } from "@/components/ui/button"
import { useMoney } from "@/hoocks/useMoney"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ImmobilizedCapitalReport } from "@/components/reports/ImmobilizedCapitalReport"
import { StockForecastReport } from "@/components/reports/StockForecastReport"
import { SalesReport } from "@/components/reports/SalesReport"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatQty } from "@/lib/units"
import { usePermissions } from "@/hoocks/usePermissions"

// Reportes: pestañas de inventario y de ventas (?tab=sales)
export function Reports() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") === "sales" ? "sales" : "inventory"
  return (
    <Tabs value={tab} onValueChange={(v) => setParams(v === "sales" ? { tab: v } : {}, { replace: true })} className="gap-4">
      <TabsList className="print:hidden">
        <TabsTrigger value="inventory">{t("reports.tabs.inventory")}</TabsTrigger>
        <TabsTrigger value="sales">{t("reports.tabs.sales")}</TabsTrigger>
      </TabsList>
      <TabsContent value="inventory">
        <InventoryReports />
      </TabsContent>
      <TabsContent value="sales" className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">{t("salesReport.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("salesReport.subtitle")}</p>
        </div>
        <SalesReport />
      </TabsContent>
    </Tabs>
  )
}

function InventoryReports() {
  const { t } = useTranslation()
  const money = useMoney()
  const showCost = usePermissions().can("costs.view") // valor a costo y capital inmovilizado
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [immobilizedDays, setImmobilizedDays] = useState("60")
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(false)
  const queryClient = useQueryClient()

  const { data: company } = useQuery({ queryKey: ["company"], queryFn: getCompany })

  const lowStockQuery = useQuery({
    queryKey: ["reports", "low-stock"],
    queryFn: getLowStockReport,
  })

  const inventoryValueQuery = useQuery({
    queryKey: ["reports", "inventory-value"],
    queryFn: getInventoryValueReport,
    enabled: showCost,
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

  // Mismas queryKey que la pantalla: reutiliza la caché y exporta exactamente lo que se ve
  async function handleExcel() {
    setExporting(true)
    setExportError(false)
    try {
      const [lowStock, value, movements, breakdown, forecast] = await Promise.all([
        queryClient.fetchQuery({ queryKey: ["reports", "low-stock"], queryFn: getLowStockReport }),
        showCost ? queryClient.fetchQuery({ queryKey: ["reports", "inventory-value"], queryFn: getInventoryValueReport }) : null,
        queryClient.fetchQuery({
          queryKey: ["reports", "movements", from, to],
          queryFn: () => getMovementsReport(from || undefined, to || undefined),
        }),
        showCost ? queryClient.fetchQuery({
          queryKey: ["inventory-value-breakdown", immobilizedDays],
          queryFn: () => getInventoryValueBreakdown(Number(immobilizedDays)),
        }) : null,
        queryClient.fetchQuery({ queryKey: ["stock-forecast"], queryFn: () => getStockForecast() }),
      ])
      const x = (key) => t(`reports.export.${key}`)
      const period = from || to ? `${from || "…"} → ${to || "…"}` : x("allDates")
      downloadXlsx(`${x("fileName")}-${new Date().toLocaleDateString("sv")}.xlsx`, [
        {
          name: x("summary"),
          rows: [
            [x("field"), x("value")],
            [x("company"), company?.name ?? "—"],
            [x("generatedAt"), new Date().toLocaleString()],
            [x("currency"), company?.currency ?? "CRC"],
            ...(value ? [
              [t("reports.cards.total_value_title"), value.totalValue],
              [x("productsInCatalog"), value.totalProducts],
              [x("retailValue"), value.retailValue],
              [x("withoutCost"), value.productsWithoutCost],
            ] : []),
            [t("reports.cards.low_stock_title"), lowStock.length],
            ...(breakdown ? [
              [t("reports.immobilizedCapital.activeValue"), breakdown.activeValue],
              [`${t("reports.immobilizedCapital.immobilizedValue")} (${breakdown.daysThreshold} ${x("days")})`, breakdown.immobilizedValue],
            ] : []),
            [x("movementsPeriod"), period],
          ],
        },
        {
          name: x("lowStock"),
          rows: [
            [t("reports.tables.sku"), t("reports.tables.product"), t("reports.tables.current_stock"), t("reports.tables.min_stock")],
            ...lowStock.map((p) => [p.sku, p.name, p.stock, p.minStock]),
          ],
        },
        {
          name: x("movements"),
          rows: [
            [t("reports.tables.date"), t("reports.tables.product"), t("reports.tables.type"), t("reports.tables.quantity")],
            ...movements.map((m) => [
              new Date(m.createdAt).toLocaleString(),
              m.product?.name ?? "",
              typeLabels[m.type]?.label ?? m.type,
              m.quantity,
            ]),
          ],
        },
        ...(breakdown ? [{
          name: x("immobilized"),
          rows: [
            [t("reports.immobilizedCapital.sku"), t("reports.immobilizedCapital.product"), t("reports.immobilizedCapital.value")],
            ...breakdown.immobilizedProducts.map((p) => [p.sku, p.name, p.hasCost ? p.value : ""]),
          ],
        }] : []),
        {
          name: x("forecast"),
          rows: [
            [
              t("reports.stockForecast.product"), t("reports.stockForecast.currentStock"),
              t("reports.stockForecast.dailyVelocity"), t("reports.stockForecast.daysRemaining"),
            ],
            ...forecast.forecast.map((f) => [f.productName, f.currentStock, f.dailyVelocity, f.daysRemaining]),
          ],
        },
      ])
    } catch {
      setExportError(true)
    } finally {
      setExporting(false)
    }
  }

  // Imprimir siempre en tema claro: el tema oscuro sale ilegible en papel (sin fondos)
  function handlePrint() {
    const root = document.documentElement
    const wasDark = root.classList.contains("dark")
    if (wasDark) {
      root.classList.replace("dark", "light")
      window.addEventListener("afterprint", () => root.classList.replace("light", "dark"), { once: true })
    }
    window.print()
  }

  return (
    <div className="space-y-5">
      {/* encabezado que solo aparece en el PDF / papel */}
      <div className="hidden print:block border-b border-border pb-3">
        <p className="text-lg font-semibold">{company?.name ?? ""}</p>
        <p className="text-sm text-muted-foreground">
          {t("reports.title")} · {new Date().toLocaleString()}
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold print:hidden">{t("reports.title")}</h1>
          <p className="text-sm text-muted-foreground print:hidden">{t("reports.subtitle")}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleExcel} disabled={exporting}>
            <FileSpreadsheet />
            {exporting ? t("reports.export.exporting") : t("reports.export.excel")}
          </Button>
          <Button variant="outline" size="sm" render={<Link to="/daily-summaries" />}>
            <History />
            {t("dailySummary.history")}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer />
            {t("reports.export.pdf")}
          </Button>
        </div>
      </div>
      {exportError && (
        <p role="alert" className="text-sm text-destructive print:hidden">{t("reports.export.error")}</p>
      )}

      {/* Tarjetas resumen y módulos de análisis en grid de 2 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-1 gap-5">
        {showCost && <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {t("reports.cards.total_value_title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {inventoryValueQuery.data ? money.format(inventoryValueQuery.data.totalValue) : "..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {inventoryValueQuery.data?.totalProducts ?? 0} {t("reports.cards.products_in_catalog")}
              {inventoryValueQuery.data && (
                <> · {t("reports.cards.retail_value", { value: money.format(inventoryValueQuery.data.retailValue) })}</>
              )}
            </p>
            {inventoryValueQuery.data?.productsWithoutCost > 0 && (
              <p className="text-xs text-[var(--stk-warn)] mt-1">
                {t("reports.cards.without_cost", { count: inventoryValueQuery.data.productsWithoutCost })}
              </p>
            )}
          </CardContent>
        </Card>}

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
        {showCost && (
          <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
            <ImmobilizedCapitalReport days={immobilizedDays} onDaysChange={setImmobilizedDays} />
          </div>
        )}

        {/* Reporte de Pronóstico de Stock */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
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
                      <Badge variant="destructive">{formatQty(product.stock, product.unit, t)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatQty(product.minStock, product.unit, t)}</TableCell>
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
          <div className="flex flex-col sm:flex-row gap-3 mb-4 print:hidden">
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
                      <TableCell className="whitespace-nowrap">{formatQty(movement.quantity, movement.product?.unit, t)}</TableCell>
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