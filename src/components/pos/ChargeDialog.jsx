import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Banknote, CreditCard, HandCoins, Plus, Smartphone, Split, X } from "lucide-react"
import { useMoney } from "@/hoocks/useMoney"
import { quickCash } from "@/lib/pos"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const MODES = [
  { id: "CASH", icon: Banknote },
  { id: "CARD", icon: CreditCard },
  { id: "SINPE", icon: Smartphone },
  { id: "MIXED", icon: Split },
  { id: "CREDIT", icon: HandCoins },
]
const round2 = (v) => Math.round(v * 100) / 100

// Cobrar: arma los pagos y llama a onCharge(payments, credit?). Crédito solo si el cliente lo tiene
// (account = su estado de cuenta): prima opcional, plan quincenal o mensual hasta 6 meses y código del encargado.
export function ChargeDialog({ open, onOpenChange, total, onCharge, pending, error, account }) {
  const { t } = useTranslation()
  const money = useMoney()
  const [mode, setMode] = useState("CASH")
  const [received, setReceived] = useState("")
  const [reference, setReference] = useState("")
  const [split, setSplit] = useState([{ method: "CASH", amount: "" }, { method: "CARD", amount: "", reference: "" }])
  const [credit, setCredit] = useState({ down: "", downMethod: "CASH", frequency: "MONTHLY", installments: 1, pin: "" })
  const modes = MODES.filter((m) => m.id !== "CREDIT" || account?.creditLimit != null)

  const cash = Number(received) || 0
  const change = round2(cash - total)
  const splitPaid = round2(split.reduce((s, p) => s + (Number(p.amount) || 0), 0))
  const splitLeft = round2(total - splitPaid)

  let payments = null
  if (mode === "CASH" && cash >= total) payments = [{ method: "CASH", amount: total, tendered: cash }]
  if (mode === "CARD" || mode === "SINPE") payments = [{ method: mode, amount: total, ...(reference.trim() && { reference: reference.trim() }) }]
  if (mode === "MIXED" && splitLeft === 0) {
    payments = split
      .filter((p) => Number(p.amount) > 0)
      .map((p) => ({ method: p.method, amount: Number(p.amount), ...(p.reference?.trim() && { reference: p.reference.trim() }) }))
  }

  function reset(next) {
    setMode(next)
    setReceived("")
    setReference("")
  }
  const updateSplit = (i, patch) => setSplit(split.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  const down = Number(credit.down) || 0
  const financed = round2(total - down)
  const maxInstallments = credit.frequency === "MONTHLY" ? 6 : 12
  const creditProblem =
    account?.overdueCount > 0 ? t("pos.credit.overdue", { amount: money.format(account.overdue) })
    : financed > (account?.available ?? 0) ? t("pos.credit.overLimit", { amount: money.format(account?.available ?? 0) })
    : financed <= 0 ? t("pos.credit.nothing")
    : null
  if (mode === "CREDIT" && !creditProblem && credit.pin.length >= 4) {
    payments = down > 0 ? [{ method: credit.downMethod, amount: down, ...(credit.downMethod === "CASH" && { tendered: down }) }] : []
  }
  const charge = (e) => {
    e.preventDefault()
    if (!payments || pending) return
    if (mode === "CREDIT") onCharge(payments, { credit: { frequency: credit.frequency, installments: credit.installments }, creditPin: credit.pin })
    else onCharge(payments)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("pos.charge.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={charge} className="space-y-5">
          <div className="rounded-xl bg-[var(--stk-kpi-dark)] px-5 py-4 text-white">
            <p className="text-xs uppercase tracking-wide opacity-70">{t("pos.charge.toPay")}</p>
            <p className="font-mono text-4xl font-semibold">{money.format(total)}</p>
          </div>

          <div role="radiogroup" aria-label={t("pos.charge.method")} className={cn("grid gap-2", modes.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
            {modes.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mode === id}
                onClick={() => reset(id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                  mode === id ? "border-[var(--stk-accent)] bg-[var(--stk-accent-soft)] text-[var(--stk-accent-strong)]" : "border-border hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {t(`pos.modes.${id}`)}
              </button>
            ))}
          </div>

          {mode === "CASH" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cash-received">{t("pos.charge.received")}</Label>
                <Input
                  id="cash-received"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  autoFocus
                  className="h-12 font-mono text-2xl"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {quickCash(total, money.currency).map((v) => (
                  <Button key={v} type="button" variant="outline" size="sm" className="font-mono" onClick={() => setReceived(String(v))}>
                    {v === round2(total) ? t("pos.charge.exact") : money.format(v)}
                  </Button>
                ))}
              </div>
              <div
                className={cn(
                  "flex items-baseline justify-between rounded-xl px-4 py-3",
                  received === "" ? "bg-muted" : change >= 0 ? "bg-[var(--stk-ok-bg)] text-[var(--stk-ok)]" : "bg-[var(--stk-crit-bg)] text-[var(--stk-crit)]"
                )}
              >
                <span className="text-sm font-medium">{change >= 0 || received === "" ? t("pos.change") : t("pos.charge.missing")}</span>
                <span className="font-mono text-2xl font-semibold">{money.format(received === "" ? 0 : Math.abs(change))}</span>
              </div>
            </div>
          )}

          {(mode === "CARD" || mode === "SINPE") && (
            <div className="space-y-2">
              <Label htmlFor="pay-reference">{t(`pos.charge.reference${mode}`)}</Label>
              <Input id="pay-reference" autoFocus maxLength={60} className="font-mono" value={reference} onChange={(e) => setReference(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t(`pos.charge.hint${mode}`)}</p>
            </div>
          )}

          {mode === "MIXED" && (
            <div className="space-y-2">
              {split.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    aria-label={t("pos.charge.method")}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={p.method}
                    onChange={(e) => updateSplit(i, { method: e.target.value })}
                  >
                    {["CASH", "CARD", "SINPE"].map((m) => (
                      <option key={m} value={m}>{t(`pos.methods.${m}`)}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    aria-label={t("pos.charge.amount")}
                    className="font-mono"
                    value={p.amount}
                    onFocus={() => !p.amount && splitLeft > 0 && updateSplit(i, { amount: String(splitLeft) })}
                    onChange={(e) => updateSplit(i, { amount: e.target.value })}
                  />
                  {p.method !== "CASH" && (
                    <Input
                      aria-label={t("pos.charge.referenceShort")}
                      placeholder={t("pos.charge.referenceShort")}
                      maxLength={60}
                      value={p.reference ?? ""}
                      onChange={(e) => updateSplit(i, { reference: e.target.value })}
                    />
                  )}
                  {split.length > 2 && (
                    <Button type="button" variant="ghost" size="icon" aria-label={t("common.delete")} onClick={() => setSplit(split.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {split.length < 5 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setSplit([...split, { method: "CARD", amount: "", reference: "" }])}>
                  <Plus />
                  {t("pos.charge.addPayment")}
                </Button>
              )}
              <p className={cn("text-sm font-medium", splitLeft === 0 ? "text-[var(--stk-ok)]" : "text-[var(--stk-warn)]")}>
                {splitLeft === 0 ? t("pos.charge.complete") : splitLeft > 0 ? t("pos.charge.left", { amount: money.format(splitLeft) }) : t("pos.charge.over", { amount: money.format(-splitLeft) })}
              </p>
            </div>
          )}

          {mode === "CREDIT" && (
            <div className="space-y-3">
              <p className="flex justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span>{t("pos.credit.available")}</span>
                <span className="font-mono font-semibold">{money.format(account.available)}</span>
              </p>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="space-y-2">
                  <Label htmlFor="credit-down">{t("pos.credit.down")}</Label>
                  <Input id="credit-down" type="number" min={0} step="any" inputMode="decimal" className="font-mono" value={credit.down} onChange={(e) => setCredit({ ...credit, down: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credit-down-method">{t("pos.charge.method")}</Label>
                  <select
                    id="credit-down-method"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={credit.downMethod}
                    onChange={(e) => setCredit({ ...credit, downMethod: e.target.value })}
                  >
                    {["CASH", "CARD", "SINPE"].map((m) => <option key={m} value={m}>{t(`pos.methods.${m}`)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="credit-frequency">{t("pos.credit.frequency")}</Label>
                  <select
                    id="credit-frequency"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={credit.frequency}
                    onChange={(e) => setCredit({ ...credit, frequency: e.target.value, installments: Math.min(credit.installments, e.target.value === "MONTHLY" ? 6 : 12) })}
                  >
                    <option value="MONTHLY">{t("pos.credit.MONTHLY")}</option>
                    <option value="BIWEEKLY">{t("pos.credit.BIWEEKLY")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credit-installments">{t("pos.credit.installments")}</Label>
                  <select
                    id="credit-installments"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={credit.installments}
                    onChange={(e) => setCredit({ ...credit, installments: Number(e.target.value) })}
                  >
                    {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              {creditProblem ? (
                <p className="rounded-lg bg-[var(--stk-crit-bg)] px-3 py-2 text-sm text-[var(--stk-crit)]">{creditProblem}</p>
              ) : (
                <p className="rounded-lg bg-[var(--stk-accent-soft)] px-3 py-2 text-sm">
                  {t("pos.credit.plan", { amount: money.format(financed), count: credit.installments, each: money.format(financed / credit.installments) })}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="credit-pin">{t("pos.discount.pin")}</Label>
                <Input
                  id="credit-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  className="font-mono text-lg tracking-widest"
                  value={credit.pin}
                  onChange={(e) => setCredit({ ...credit, pin: e.target.value.replace(/D/g, "") })}
                />
              </div>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, t("pos.error"))}</p>}
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={!payments || pending}>
            {pending ? t("pos.charge.charging") : t("pos.charge.confirm")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
