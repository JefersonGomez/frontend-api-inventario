import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Undo2 } from "lucide-react"
import { createReturn } from "@/api/sales"
import { moneyFormatter } from "@/lib/money"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const round2 = (v) => Math.round(v * 100) / 100

// Devolución de una venta (nota de crédito): cantidades por línea con su estado, motivo, cómo se devuelve
// el dinero y el código del encargado. sale = respuesta de GET /sales/:id. onDone(tiquete de la nota).
export function ReturnDialog({ sale, onClose, onDone }) {
  return (
    <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {sale && <ReturnForm key={sale.document.id} sale={sale} onClose={onClose} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  )
}

function ReturnForm({ sale, onDone }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const doc = sale.document
  const money = moneyFormatter(sale.company.currency)
  const left = (l) => Number(l.quantity) - (sale.returned[l.id] ?? 0)
  const [rows, setRows] = useState(() => Object.fromEntries(doc.lines.map((l) => [l.id, { quantity: "", condition: "GOOD" }])))
  const [reason, setReason] = useState("")
  const [method, setMethod] = useState(doc.payments[0]?.method ?? "CASH")
  const [reference, setReference] = useState("")
  const [pin, setPin] = useState("")
  const expired = sale.returnUntil && new Date(sale.returnUntil) < new Date()
  const credit = doc.saleCondition === "CREDIT"

  const picked = doc.lines.filter((l) => Number(rows[l.id].quantity) > 0)
  // aproximado (el servidor calcula la nota): la parte proporcional del total de la línea
  const estimate = round2(picked.reduce((s, l) => s + (Number(l.total) * Number(rows[l.id].quantity)) / Number(l.quantity), 0))
  const tooMany = picked.some((l) => Number(rows[l.id].quantity) > left(l))
  const valid = picked.length > 0 && !tooMany && reason.trim().length >= 3 && pin.length >= 4 && !expired

  const save = useMutation({
    mutationFn: () =>
      createReturn(doc.id, {
        lines: picked.map((l) => ({ lineId: l.id, quantity: Number(rows[l.id].quantity), condition: rows[l.id].condition })),
        reason: reason.trim(),
        refund: { method, ...(reference.trim() && { reference: reference.trim() }) },
        pin,
      }),
    onSuccess: (data) => {
      for (const key of ["sales", "products", "cash-session", "receivables"]) queryClient.invalidateQueries({ queryKey: [key] })
      onDone(data)
    },
  })
  const setRow = (id, patch) => setRows({ ...rows, [id]: { ...rows[id], ...patch } })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid && !save.isPending) save.mutate()
      }}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Undo2 className="h-5 w-5" aria-hidden />
          {t("sales.return.title", { number: doc.consecutive.slice(-10) })}
        </DialogTitle>
      </DialogHeader>
      {expired && (
        <p className="rounded-lg bg-[var(--stk-crit-bg)] px-3 py-2 text-sm text-[var(--stk-crit)]">
          {t("sales.return.expired", { date: new Date(sale.returnUntil).toLocaleDateString("es-CR") })}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t("sales.return.what")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows(Object.fromEntries(doc.lines.map((l) => [l.id, { ...rows[l.id], quantity: left(l) > 0 ? String(left(l)) : "" }])))}
        >
          {t("sales.return.all")}
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {doc.lines.map((l) => {
          const r = rows[l.id]
          const max = left(l)
          return (
            <li key={l.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{l.description}</span>
                <span className="text-xs text-muted-foreground">
                  {t("sales.return.sold", { sold: Number(l.quantity), left: max })} · {money.format(Number(l.total) / Number(l.quantity))}
                </span>
              </span>
              <Input
                type="number"
                min={0}
                max={max}
                step={l.unit === "UNIT" ? 1 : "any"}
                disabled={max <= 0}
                aria-label={t("sales.return.quantity", { name: l.description })}
                className={cn("w-20 font-mono", Number(r.quantity) > max && "border-destructive")}
                value={r.quantity}
                onChange={(e) => setRow(l.id, { quantity: e.target.value })}
              />
              <div role="radiogroup" aria-label={t("sales.return.condition")} className="flex overflow-hidden rounded-md border border-border text-xs">
                {["GOOD", "DAMAGED"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={r.condition === c}
                    onClick={() => setRow(l.id, { condition: c })}
                    className={cn(
                      "px-2 py-1.5",
                      r.condition === c ? (c === "GOOD" ? "bg-[var(--stk-ok-bg)] text-[var(--stk-ok)]" : "bg-[var(--stk-crit-bg)] text-[var(--stk-crit)]") : "hover:bg-muted"
                    )}
                  >
                    {t(`sales.condition.${c}`)}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted-foreground">{t("sales.return.conditionHint")}</p>

      <div className="space-y-2">
        <Label htmlFor="return-reason">{t("sales.return.reason")}</Label>
        <Input id="return-reason" required minLength={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>

      {estimate > 0 && (
        <p className="flex justify-between rounded-lg bg-[var(--stk-accent-soft)] px-3 py-2 text-sm">
          <span>{credit ? t("sales.return.creditFirst") : t("sales.return.toRefund")}</span>
          <span className="font-mono font-semibold">≈ {money.format(estimate)}</span>
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="return-method">{credit ? t("sales.return.methodIfAny") : t("sales.return.method")}</Label>
          <select id="return-method" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
            {["CASH", "CARD", "SINPE", "TRANSFER"].map((m) => <option key={m} value={m}>{t(`pos.methods.${m}`)}</option>)}
          </select>
        </div>
        {method !== "CASH" && (
          <div className="space-y-2">
            <Label htmlFor="return-reference">{t("pos.charge.referenceShort")}</Label>
            <Input id="return-reference" maxLength={60} className="font-mono" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="return-pin">{t("pos.discount.pin")}</Label>
        <Input
          id="return-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          className="font-mono text-lg tracking-widest"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("sales.return.error"))}</p>}
      <Button type="submit" className="w-full" disabled={!valid || save.isPending}>{t("sales.return.submit")}</Button>
    </form>
  )
}
