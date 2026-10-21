import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Percent } from "lucide-react"
import { useMoney } from "@/hoocks/useMoney"
import { discountAmount, discountMax } from "@/lib/pos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Descuento de una línea o del total: el cajero elige el tipo (y cuánto, si es libre) y el encargado
// escribe su código, SIEMPRE. target = { scope: "LINE" | "TOTAL", base, name?, pick? } o { scope: "PIN" }
// (solo pedir el código otra vez, cuando el servidor lo rechazó). El servidor valida todo al cobrar.
export function DiscountDialog({ target, types, onApply, onRemove, onClose }) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{target && <DiscountForm key={JSON.stringify(target)} target={target} types={types} onApply={onApply} onRemove={onRemove} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function DiscountForm({ target, types, onApply, onRemove, onClose }) {
  const { t } = useTranslation()
  const money = useMoney()
  const pinOnly = target.scope === "PIN"
  const options = types.filter((d) => d.isActive && (d.appliesTo === "BOTH" || d.appliesTo === target.scope))
  const [typeId, setTypeId] = useState(target.pick?.typeId ?? options[0]?.id ?? null)
  const [value, setValue] = useState(target.pick?.value != null ? String(target.pick.value) : "")
  const [pin, setPin] = useState("")
  const type = options.find((d) => d.id === typeId)
  const free = type && type.value == null
  const max = free ? discountMax(type, target.base) : null
  const amount = type ? discountAmount(type, { value }, target.base) : 0
  const valid = pinOnly || (type && amount > 0 && amount <= target.base && (!free || Number(value) <= max))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onApply(pinOnly ? null : { typeId, ...(free && { value: Number(value) }) }, pin)
      }}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" aria-hidden />
          {pinOnly ? t("pos.discount.pinTitle") : target.scope === "LINE" ? t("pos.discount.lineTitle", { name: target.name }) : t("pos.discount.totalTitle")}
        </DialogTitle>
      </DialogHeader>
      {pinOnly ? (
        <p className="text-sm text-muted-foreground">{t("pos.discount.pinAgain")}</p>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("pos.discount.none")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("pos.discount.type")}>
            {options.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={d.id === typeId}
                onClick={() => setTypeId(d.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  d.id === typeId ? "border-[var(--stk-accent)] bg-[var(--stk-accent-soft)]" : "border-border hover:bg-muted"
                )}
              >
                <span className="block font-medium">{d.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {d.value == null ? t("discounts.freeUpTo", { pct: Number(d.maxPercent) }) : d.kind === "PERCENT" ? `${Number(d.value)} %` : money.format(d.value)}
                </span>
              </button>
            ))}
          </div>
          {free && (
            <div className="space-y-2">
              <Label htmlFor="discount-amount">{type.kind === "PERCENT" ? t("pos.discount.percent") : t("pos.discount.amount")}</Label>
              <Input id="discount-amount" type="number" min="0.01" max={max} step="0.01" required className="font-mono" value={value} onChange={(e) => setValue(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("pos.discount.max", { max: type.kind === "PERCENT" ? `${max} %` : money.format(max) })}</p>
            </div>
          )}
          {type && amount > 0 && (
            <p className="flex justify-between rounded-lg bg-muted px-3 py-2 font-mono text-sm">
              <span>−{money.format(Math.min(amount, target.base))}</span>
              <span>{t("pos.discount.remains", { amount: money.format(Math.max(target.base - amount, 0)) })}</span>
            </p>
          )}
        </>
      )}
      {(pinOnly || options.length > 0) && (
        <div className="space-y-2">
          <Label htmlFor="discount-pin">{t("pos.discount.pin")}</Label>
          <Input
            id="discount-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus={pinOnly || !free}
            maxLength={6}
            className="font-mono text-lg tracking-widest"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {target.pick && (
          <Button type="button" variant="ghost" className="mr-auto" onClick={onRemove}>
            {t("pos.discount.remove")}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={!valid || pin.length < 4}>{t("pos.discount.apply")}</Button>
      </div>
    </form>
  )
}
