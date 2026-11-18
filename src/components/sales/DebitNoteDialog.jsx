import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { issueDebitNote } from "@/api/sales"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { TAX_RATES } from "@/lib/units"
import { CabysSearch } from "@/components/CabysSearch"
import { BankAccountSelect } from "@/components/banks/DepositDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
let nextKey = 1
const newCharge = () => ({ key: nextKey++, description: "", quantity: "1", price: "", taxRate: "RATE_13", cabys: "" })

// Nota de débito: cobrarle al cliente un cargo extra sobre esta venta (flete olvidado, intereses…)
export function DebitNoteDialog({ open, sale, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">{open && <DebitForm sale={sale} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function DebitForm({ sale, onClose }) {
  const { t } = useTranslation()
  const money = useMoney()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const doc = sale.document
  const canCredit = doc.customer?.creditLimit != null
  const [reason, setReason] = useState("")
  const [charges, setCharges] = useState([newCharge()])
  const [mode, setMode] = useState("cash")
  const [payment, setPayment] = useState({ method: "TRANSFER", reference: "", bankAccountId: "" })
  const [credit, setCredit] = useState({ frequency: "MONTHLY", installments: "1" })
  const update = (key, patch) => setCharges((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  const total = charges.reduce((s, c) => s + (Number(c.quantity) || 0) * (Number(c.price) || 0), 0)
  const ready = reason.trim().length >= 3 && charges.every((c) => c.description.trim() && Number(c.quantity) > 0 && Number(c.price) > 0 && /^\d{13}$/.test(c.cabys))

  const save = useMutation({
    mutationFn: () =>
      issueDebitNote(doc.id, {
        reason: reason.trim(),
        lines: charges.map((c) => ({ description: c.description.trim(), quantity: Number(c.quantity), unitPriceWithTax: Number(c.price), taxRate: c.taxRate, cabys: c.cabys })),
        ...(mode === "cash"
          ? { payment: { method: payment.method, ...(payment.reference.trim() && { reference: payment.reference.trim() }), ...(payment.bankAccountId && { bankAccountId: payment.bankAccountId }) } }
          : { credit: { frequency: credit.frequency, installments: Number(credit.installments) } }),
      }),
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["receivables"] })
      onClose()
      navigate(`/sales/${ticket.document.id}`)
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <DialogHeader>
        <DialogTitle>{t("debit.title", { number: doc.consecutive.slice(-10) })}</DialogTitle>
        <p className="text-sm text-muted-foreground">{t("debit.subtitle")}</p>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="debit-reason">{t("debit.reason")}</Label>
        <Input id="debit-reason" required minLength={3} maxLength={180} placeholder={t("debit.reasonPlaceholder")} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>

      <ul className="space-y-3">
        {charges.map((c, i) => (
          <li key={c.key} className="space-y-2 rounded-lg border border-border p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_80px_130px_110px_36px] sm:items-end">
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label htmlFor={`debit-d-${c.key}`}>{t("debit.charge", { n: i + 1 })}</Label>
                <Input id={`debit-d-${c.key}`} maxLength={200} placeholder={t("invoice.servicePlaceholder")} value={c.description} onChange={(e) => update(c.key, { description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`debit-q-${c.key}`}>{t("invoice.qty")}</Label>
                <Input id={`debit-q-${c.key}`} type="number" min="0" step="any" value={c.quantity} onChange={(e) => update(c.key, { quantity: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`debit-p-${c.key}`}>{t("invoice.price")}</Label>
                <Input id={`debit-p-${c.key}`} type="number" min="0" step="0.01" value={c.price} onChange={(e) => update(c.key, { price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`debit-t-${c.key}`}>{t("invoice.tax")}</Label>
                <select id={`debit-t-${c.key}`} className={selectClass} value={c.taxRate} onChange={(e) => update(c.key, { taxRate: e.target.value })}>
                  {TAX_RATES.map((r) => <option key={r} value={r}>{t(`taxRates.${r}`)}</option>)}
                </select>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" className="justify-self-end" disabled={charges.length === 1} onClick={() => setCharges((cs) => cs.filter((x) => x.key !== c.key))} aria-label={t("invoice.removeLine", { n: i + 1 })}>
                <Trash2 />
              </Button>
            </div>
            <div className="space-y-1.5 sm:max-w-xl">
              <Label htmlFor={`debit-c-${c.key}`}>{t("invoice.serviceCabys")}</Label>
              <CabysSearch id={`debit-c-${c.key}`} required value={c.cabys} suggest={c.description} onChange={(cabys) => update(c.key, { cabys })} />
            </div>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={() => setCharges((cs) => [...cs, newCharge()])}><Plus />{t("debit.addCharge")}</Button>

      <div className="space-y-3 rounded-lg border border-border p-3">
        <div className="flex gap-2" role="group" aria-label={t("invoice.payment")}>
          {["cash", "credit"].map((m) => (
            <Button key={m} type="button" size="sm" variant={mode === m ? "default" : "outline"} aria-pressed={mode === m} disabled={m === "credit" && !canCredit} onClick={() => setMode(m)}>
              {t(`invoice.modes.${m}`)}
            </Button>
          ))}
        </div>
        {!canCredit && <p className="text-xs text-muted-foreground">{t("invoice.noCredit")}</p>}
        {mode === "cash" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="debit-method">{t("invoice.method")}</Label>
              <select id="debit-method" className={selectClass} value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
                {["TRANSFER", "SINPE", "CARD"].map((m) => <option key={m} value={m}>{t(`pos.methods.${m}`)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="debit-ref">{t("invoice.reference")}</Label>
              <Input id="debit-ref" maxLength={60} value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
            </div>
            <BankAccountSelect id="debit-bank" value={payment.bankAccountId} onChange={(v) => setPayment({ ...payment, bankAccountId: v })} />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="debit-freq">{t("pos.credit.frequency")}</Label>
              <select id="debit-freq" className={selectClass} value={credit.frequency} onChange={(e) => setCredit({ ...credit, frequency: e.target.value, installments: "1" })}>
                {["MONTHLY", "BIWEEKLY"].map((f) => <option key={f} value={f}>{t(`pos.credit.${f}`)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="debit-inst">{t("pos.credit.installments")}</Label>
              <select id="debit-inst" className={selectClass} value={credit.installments} onChange={(e) => setCredit({ ...credit, installments: e.target.value })}>
                {Array.from({ length: credit.frequency === "MONTHLY" ? 6 : 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("debit.error"))}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto text-xs text-muted-foreground">{t("debit.sendsAlone")}</p>
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={!ready || save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t("debit.issue", { total: money.format(total) })}
        </Button>
      </div>
    </form>
  )
}
