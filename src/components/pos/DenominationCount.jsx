import { useTranslation } from "react-i18next"
import { useMoney } from "@/hoocks/useMoney"
import { DENOMINATIONS } from "@/lib/pos"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Conteo de billetes y monedas: counts = { "20000": 3, ... }
export function DenominationCount({ counts, onChange }) {
  const { t } = useTranslation()
  const money = useMoney()
  const { bills, coins } = DENOMINATIONS[money.currency] ?? DENOMINATIONS.CRC

  const group = (title, values) => (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">{title}</legend>
      {values.map((v) => (
        <div key={v} className="grid grid-cols-[1fr_88px_1fr] items-center gap-3">
          <Label htmlFor={`d-${v}`} className="font-mono">{money.format(v)}</Label>
          <Input
            id={`d-${v}`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="text-center font-mono"
            placeholder="0"
            value={counts[v] ?? ""}
            onChange={(e) => onChange({ ...counts, [v]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
          />
          <span className="text-right font-mono text-sm text-muted-foreground">{money.format(v * (counts[v] ?? 0))}</span>
        </div>
      ))}
    </fieldset>
  )

  return (
    <div className="stk-card grid gap-6 sm:grid-cols-2">
      {group(t("pos.close.bills"), bills)}
      {group(t("pos.close.coins"), coins)}
    </div>
  )
}
