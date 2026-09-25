// src/components/reports/StockForecastReport.jsx
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { TrendingDown } from "lucide-react"
import { getStockForecast } from "@/api/reports"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export function StockForecastReport() {
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ["stock-forecast"],
    queryFn: () => getStockForecast(),
  })

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">{t("reports.stockForecast.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("reports.stockForecast.subtitle", { days: data.velocityWindowDays })}
        </p>
      </div>

      {/* Sección urgente */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-destructive" />
          {t("reports.stockForecast.urgentTitle")}
        </h4>

        {data.urgent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("reports.stockForecast.noUrgent")}</p>
        ) : (
          <div className="space-y-2">
            {data.urgent.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between rounded-lg border border-[#221F3B] bg-[#151325] px-4 py-2"
              >
                <span className="text-sm font-medium">{item.productName}</span>
                <Badge variant="destructive">
                  {item.daysRemaining} {t("reports.stockForecast.daysRemaining").toLowerCase()}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabla completa */}
      {data.forecast.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("reports.stockForecast.noData")}
        </p>
      ) : (
        <div className="border border-[#221F3B] rounded-xl overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.stockForecast.product")}</TableHead>
                <TableHead className="text-right">{t("reports.stockForecast.currentStock")}</TableHead>
                <TableHead className="text-right">{t("reports.stockForecast.dailyVelocity")}</TableHead>
                <TableHead className="text-right">{t("reports.stockForecast.daysRemaining")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.forecast.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-right">{item.currentStock}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.dailyVelocity}</TableCell>
                  <TableCell className="text-right">
                    {item.willRunOutSoon ? (
                      <Badge variant="destructive">{item.daysRemaining}</Badge>
                    ) : (
                      item.daysRemaining
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}