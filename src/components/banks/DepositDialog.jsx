import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Landmark } from "lucide-react"
import { createCashDeposit } from "@/api/banks"
import { getLocations } from "@/api/locations"
import { apiErrorMessage } from "@/lib/api-error"
import { useBankAccounts } from "@/hoocks/useBankAccounts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
const today = () => new Date().toLocaleDateString("en-CA")

// Cuentas activas para elegir de dónde sale o a dónde entra un pago. Sin permiso para verlas
// (ni banks.manage ni cash.reconcile) no se muestra: el pago queda sin cuenta.
export function BankAccountSelect({ id, value, onChange, optional = true }) {
  const { t } = useTranslation()
  const { data: accounts = [] } = useBankAccounts()
  const active = accounts.filter((a) => a.isActive)
  if (!active.length) return null
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("banks.account")}</Label>
      <select id={id} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {optional && <option value="">{t("banks.noAccount")}</option>}
        {active.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
      </select>
    </div>
  )
}

// Depósito en el banco del efectivo de las cajas (Bancos o Arqueos de caja)
export function DepositDialog({ open, onClose, defaultAccountId = "" }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{open && <DepositForm onClose={onClose} defaultAccountId={defaultAccountId} />}</DialogContent>
    </Dialog>
  )
}

function DepositForm({ onClose, defaultAccountId }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: accounts = [] } = useBankAccounts()
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: () => getLocations() })
  const active = accounts.filter((a) => a.isActive)
  const [form, setForm] = useState({ bankAccountId: defaultAccountId || active[0]?.id || "", locationId: "", amount: "", depositedAt: today(), reference: "", note: "" })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const save = useMutation({
    mutationFn: () =>
      createCashDeposit({
        bankAccountId: form.bankAccountId || active[0]?.id,
        amount: Number(form.amount),
        depositedAt: form.depositedAt,
        reference: form.reference.trim(),
        ...(form.locationId && { locationId: form.locationId }),
        ...(form.note.trim() && { note: form.note.trim() }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banks"] })
      onClose()
    },
  })
  const valid = (form.bankAccountId || active[0]) && Number(form.amount) > 0 && form.reference.trim() && form.depositedAt
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
          <Landmark className="h-5 w-5" aria-hidden />
          {t("banks.deposit.title")}
        </DialogTitle>
      </DialogHeader>
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("banks.deposit.noAccounts")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="dep-account">{t("banks.account")}</Label>
            <select id="dep-account" className={selectClass} value={form.bankAccountId} onChange={set("bankAccountId")}>
              {active.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}
            </select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="dep-location">{t("banks.deposit.location")}</Label>
            <select id="dep-location" className={selectClass} value={form.locationId} onChange={set("locationId")}>
              <option value="">—</option>
              {locations.filter((l) => l.type === "BRANCH").map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dep-amount">{t("banks.amount")}</Label>
            <Input id="dep-amount" type="number" min="0.01" step="0.01" required className="font-mono" value={form.amount} onChange={set("amount")} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dep-date">{t("banks.date")}</Label>
            <Input id="dep-date" type="date" max={today()} required value={form.depositedAt} onChange={set("depositedAt")} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="dep-reference">{t("banks.deposit.reference")}</Label>
            <Input id="dep-reference" required maxLength={60} className="font-mono" value={form.reference} onChange={set("reference")} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="dep-note">{t("banks.note")}</Label>
            <Input id="dep-note" maxLength={200} value={form.note} onChange={set("note")} />
          </div>
        </div>
      )}
      {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("banks.deposit.error"))}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={!valid || save.isPending}>{t("banks.deposit.submit")}</Button>
      </div>
    </form>
  )
}
