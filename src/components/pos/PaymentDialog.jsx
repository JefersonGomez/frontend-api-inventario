import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { HandCoins, Printer } from "lucide-react"
import { getAccount, registerPayment } from "@/api/receivables"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PaymentReceipt } from "./PaymentReceipt"

// Abono a crédito de un cliente. inRegister = en la caja abierta (efectivo/tarjeta/SINPE, entra al arqueo);
// si no, desde Cuentas por cobrar con referencia obligatoria. Al terminar muestra el recibo para imprimir.
export function PaymentDialog({ customer, inRegister, onClose }) {
  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {customer && <PaymentBody key={customer.id} customer={customer} inRegister={inRegister} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

const round2 = (v) => Math.round(v * 100) / 100

function PaymentBody({ customer, inRegister, onClose }) {
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const { data: account } = useQuery({ queryKey: ["receivables", customer.id], queryFn: () => getAccount(customer.id) })
  const [form, setForm] = useState({ amount: "", method: inRegister ? "CASH" : "TRANSFER", tendered: "", reference: "", note: "" })
  const pay = useMutation({
    mutationFn: () =>
      registerPayment({
        customerId: customer.id,
        amount: Number(form.amount),
        method: form.method,
        inRegister,
        ...(form.reference.trim() && { reference: form.reference.trim() }),
        ...(form.note.trim() && { note: form.note.trim() }),
        ...(form.method === "CASH" && inRegister && Number(form.tendered) > 0 && { tendered: Number(form.tendered) }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] })
      queryClient.invalidateQueries({ queryKey: ["cash-session"] })
    },
  })

  if (pay.data) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>{t("receivables.pay.done")}</DialogTitle>
        </DialogHeader>
        <PaymentReceipt data={pay.data} />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => window.print()}>
            <Printer />
            {t("pos.print")}
          </Button>
          <Button autoFocus className="flex-1" onClick={onClose}>{t("receivables.pay.close")}</Button>
        </div>
      </div>
    )
  }

  const amount = Number(form.amount) || 0
  const balance = account?.balance ?? 0
  const open = (account?.installments ?? []).filter((i) => Number(i.paid) < Number(i.amount)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const tendered = Number(form.tendered) || 0
  const valid = amount > 0 && amount <= balance && (inRegister || form.reference.trim()) && (form.method !== "CASH" || !inRegister || !form.tendered || tendered >= amount)
  const methods = inRegister ? ["CASH", "CARD", "SINPE"] : ["TRANSFER", "SINPE", "CARD", "CASH"]

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid && !pay.isPending) pay.mutate()
      }}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <HandCoins className="h-5 w-5" aria-hidden />
          {t("receivables.pay.title", { name: customer.name })}
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p className="rounded-lg bg-muted px-3 py-2">
          <span className="block text-xs text-muted-foreground">{t("receivables.balance")}</span>
          <span className="font-mono text-lg font-semibold">{money.format(balance)}</span>
        </p>
        <p className={account?.overdue > 0 ? "rounded-lg bg-[var(--stk-crit-bg)] px-3 py-2 text-[var(--stk-crit)]" : "rounded-lg bg-muted px-3 py-2"}>
          <span className="block text-xs opacity-80">{t("receivables.overdue")}</span>
          <span className="font-mono text-lg font-semibold">{money.format(account?.overdue ?? 0)}</span>
        </p>
      </div>
      {open.length > 0 && (
        <ul className="max-h-36 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
          {open.map((i) => (
            <li key={i.id} className="flex justify-between px-3 py-1.5">
              <span>
                {t("receivables.installment", { n: i.number })} · {new Date(i.dueDate).toLocaleDateString("es-CR", { timeZone: "UTC" })}
              </span>
              <span className="font-mono">{money.format(round2(Number(i.amount) - Number(i.paid)))}</span>
            </li>
          ))}
        </ul>
      )}
      {account && balance === 0 ? (
        <p className="text-sm text-muted-foreground">{t("receivables.pay.nothing")}</p>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="pay-amount">{t("receivables.pay.amount")}</Label>
            <Input id="pay-amount" type="number" min="0.01" max={balance} step="0.01" required autoFocus className="h-12 font-mono text-2xl" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              {open[0] && (
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, amount: String(round2(Number(open[0].amount) - Number(open[0].paid))) })}>
                  {t("receivables.pay.nextInstallment")}
                </Button>
              )}
              {account?.overdue > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, amount: String(account.overdue) })}>
                  {t("receivables.pay.allOverdue")}
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, amount: String(balance) })}>
                {t("receivables.pay.all")}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="pay-method">{t("pos.charge.method")}</Label>
              <select id="pay-method" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {methods.map((m) => <option key={m} value={m}>{t(`pos.methods.${m}`)}</option>)}
              </select>
            </div>
            {form.method === "CASH" && inRegister ? (
              <div className="space-y-2">
                <Label htmlFor="pay-tendered">{t("pos.charge.received")}</Label>
                <Input id="pay-tendered" type="number" min={0} step="any" className="font-mono" value={form.tendered} onChange={(e) => setForm({ ...form, tendered: e.target.value })} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="pay-reference">{t("receivables.pay.reference")}</Label>
                <Input id="pay-reference" required={!inRegister} maxLength={60} className="font-mono" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
            )}
          </div>
          {form.method === "CASH" && inRegister && tendered > amount && amount > 0 && (
            <p className="flex justify-between rounded-lg bg-[var(--stk-ok-bg)] px-3 py-2 text-[var(--stk-ok)]">
              <span>{t("pos.change")}</span>
              <span className="font-mono font-semibold">{money.format(round2(tendered - amount))}</span>
            </p>
          )}
          {!inRegister && (
            <div className="space-y-2">
              <Label htmlFor="pay-note">{t("receivables.pay.note")}</Label>
              <Input id="pay-note" maxLength={200} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          )}
          {amount > 0 && amount <= balance && (
            <p className="flex justify-between rounded-lg bg-[var(--stk-accent-soft)] px-3 py-2 text-sm">
              <span>{t("receivables.pay.newBalance")}</span>
              <span className="font-mono font-semibold">{money.format(round2(balance - amount))}</span>
            </p>
          )}
          {pay.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(pay.error, t("receivables.pay.error"))}</p>}
        </>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={!valid || pay.isPending}>{t("receivables.pay.submit")}</Button>
      </div>
    </form>
  )
}
