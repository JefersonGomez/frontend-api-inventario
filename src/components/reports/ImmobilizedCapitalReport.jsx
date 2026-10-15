// src/components/reports/ImmobilizedCapitalReport.jsx
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, TrendingUp } from "lucide-react"
import { getInventoryValueBreakdown } from "@/api/reports"
import { useMoney } from "@/hoocks/useMoney"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

// `days` vive en Reports para que el Excel exporte el mismo período que se ve
export function ImmobilizedCapitalReport({ days, onDaysChange }) {
  const { t } = useTranslation()
  const money = useMoney()

  const { data, isLoading } = useQuery({
    queryKey: ["inventory-value-breakdown", days],
    queryFn: () => getInventoryValueBreakdown(Number(days)),
  })

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  }

  const immobilizedPercent = data.totalValue > 0
    ? ((data.immobilizedValue / data.totalValue) * 100).toFixed(1)
    : "0.0"
  const activePercent = data.totalValue > 0
    ? ((data.activeValue / data.totalValue) * 100).toFixed(1)
    : "0.0"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{t("reports.immobilizedCapital.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("reports.immobilizedCapital.subtitle", { days: data.daysThreshold })}
          </p>
        </div>
        <Select value={days} onValueChange={onDaysChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("reports.immobilizedCapital.daysFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 días</SelectItem>
            <SelectItem value="60">60 días</SelectItem>
            <SelectItem value="90">90 días</SelectItem>
            <SelectItem value="180">180 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("reports.immobilizedCapital.activeValue")}
            </span>
          </div>
          <p className="text-2xl font-semibold">{money.format(data.activeValue)}</p>
          <p className="text-sm text-muted-foreground">{activePercent}%</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[var(--stk-warn-mid)]" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("reports.immobilizedCapital.immobilizedValue")}
            </span>
          </div>
          <p className="text-2xl font-semibold">{money.format(data.immobilizedValue)}</p>
          <p className="text-sm text-muted-foreground">{immobilizedPercent}%</p>
        </div>
      </div>

      {data.productsWithoutCost > 0 && (
        <p className="text-xs text-[var(--stk-warn)]">
          {t("reports.immobilizedCapital.withoutCost", { count: data.productsWithoutCost })}
        </p>
      )}

      {data.immobilizedProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("reports.immobilizedCapital.noImmobilized")}
        </p>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("reports.immobilizedCapital.sku")}</TableHead>
                <TableHead>{t("reports.immobilizedCapital.product")}</TableHead>
                <TableHead className="text-right">{t("reports.immobilizedCapital.value")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.immobilizedProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">
                    {p.hasCost ? money.format(p.value) : <span className="text-muted-foreground">—</span>}
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