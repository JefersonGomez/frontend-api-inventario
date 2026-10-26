import { useTranslation } from "react-i18next"
import { Plus, X } from "lucide-react"
import { TAX_RATES } from "@/lib/units"
import { lineTax } from "@/lib/tax-lines"
import { useMoney } from "@/hoocks/useMoney"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm"

// IVA de la factura por tarifa (54A): una fila por tarifa con su base sin IVA; el IVA se calcula
// solo y se puede corregir si la factura trae otro (redondeos). placeholders = lo calculado de lo recibido.
export function TaxLinesEditor({ rows, onChange, placeholders = {}, fixedRates = false }) {
  const { t } = useTranslation()
  const money = useMoney()
  const set = (i, patch) => onChange(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)))
  const used = new Set(rows.map((r) => r.rate))
  const free = TAX_RATES.filter((r) => !used.has(r))
  const shown = rows.map((r) => ({ ...r, base: r.base === "" && placeholders[r.rate] ? String(placeholders[r.rate]) : r.base }))
  const subtotal = shown.reduce((s, r) => s + (Number(r.base) || 0), 0)
  const tax = shown.reduce((s, r) => s + lineTax(r), 0)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground">
        <span>{t("payables.taxes.rate")}</span>
        <span>{t("payables.taxes.base")}</span>
        <span>{t("payables.taxes.tax")}</span>
        <span className="w-8" />
      </div>
      {rows.map((r, i) => (
        <div key={r.rate} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
          {fixedRates ? (
            <span className="text-sm">{t(`taxRates.${r.rate}`)}</span>
          ) : (
            <select aria-label={t("payables.taxes.rate")} className={selectClass} value={r.rate} onChange={(e) => set(i, { rate: e.target.value, tax: "" })}>
              {[r.rate, ...free].map((rate) => <option key={rate} value={rate}>{t(`taxRates.${rate}`)}</option>)}
            </select>
          )}
          <Input
            type="number" min={0} step="0.01" className="font-mono"
            aria-label={t("payables.taxes.baseOf", { rate: t(`taxRates.${r.rate}`) })}
            placeholder={placeholders[r.rate] != null ? String(placeholders[r.rate]) : "0"}
            value={r.base}
            onChange={(e) => set(i, { base: e.target.value })}
          />
          <Input
            type="number" min={0} step="0.01" className="font-mono"
            aria-label={t("payables.taxes.taxOf", { rate: t(`taxRates.${r.rate}`) })}
            disabled={r.rate === "EXEMPT"}
            placeholder={lineTax(shown[i]).toFixed(2)}
            value={r.rate === "EXEMPT" ? "" : r.tax}
            onChange={(e) => set(i, { tax: e.target.value })}
          />
          {!fixedRates && rows.length > 1 ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t("payables.taxes.remove")} onClick={() => onChange(rows.filter((_, n) => n !== i))}>
              <X />
            </Button>
          ) : (
            <span className="w-8" />
          )}
        </div>
      ))}
      {!fixedRates && free.length > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, { rate: free[0], base: "", tax: "" }])}>
          <Plus />
          {t("payables.taxes.add")}
        </Button>
      )}
      <p className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
        <span>{t("payables.invoice.subtotal")}: <span className="font-mono">{money.format(subtotal)}</span></span>
        <span>{t("payables.invoice.tax")}: <span className="font-mono">{money.format(tax)}</span></span>
        <span className="font-semibold">{t("payables.invoice.total")}: <span className="font-mono">{money.format(subtotal + tax)}</span></span>
      </p>
    </div>
  )
}
