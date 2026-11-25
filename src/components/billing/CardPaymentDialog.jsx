import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CreditCard, Lock } from "lucide-react"
import { getCardSetup, payWithCard, registerCard } from "@/api/billing"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Pagar la suscripción con tarjeta (C2). Los datos de la tarjeta van del navegador directo a ONVO con la
// llave pública; a Cubivo solo llega el id. Si el banco pide verificar (3DS) se va a su página y vuelve a
// /subscription?payment=<id>, donde se confirma.
export function CardPaymentDialog({ open, onClose, amountText, savedCard, onDone, upgradeTo }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {open && <CardForm onClose={onClose} amountText={amountText} savedCard={savedCard} onDone={onDone} upgradeTo={upgradeTo} />}
      </DialogContent>
    </Dialog>
  )
}

const digits = (s) => s.replace(/\D/g, "")
// 4242 4242 4242 4242
const groupCard = (s) => digits(s).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ")
// 12/30
function formatExpiry(s) {
  const d = digits(s).slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}

// Luhn: atrapa un número mal escrito antes de mandarlo
function validCardNumber(s) {
  const d = digits(s)
  if (d.length < 13 || d.length > 19) return false
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i])
    if (i % 2 === 1) n = n * 2 > 9 ? n * 2 - 9 : n * 2
    sum += n
  }
  return sum % 10 === 0
}

function CardForm({ onClose, amountText, savedCard, onDone, upgradeTo }) {
  const { t } = useTranslation()
  const [useSaved, setUseSaved] = useState(!!savedCard)
  const [form, setForm] = useState({ number: "", name: "", expiry: "", cvv: "" })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (key, fmt = (v) => v) => (e) => setForm((f) => ({ ...f, [key]: fmt(e.target.value) }))

  function check() {
    if (!validCardNumber(form.number)) return t("billing.card.errors.number")
    if (form.name.trim().length < 3) return t("billing.card.errors.name")
    const [mm, yy] = form.expiry.split("/").map(Number)
    const now = new Date()
    const year = 2000 + (yy || 0)
    if (!mm || mm > 12 || !yy || year < now.getFullYear() || (year === now.getFullYear() && mm < now.getMonth() + 1)) return t("billing.card.errors.expiry")
    if (!/^\d{3,4}$/.test(form.cvv)) return t("billing.card.errors.cvv")
    return null
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!useSaved) {
      const problem = check()
      if (problem) return setError(problem)
    }
    setBusy(true)
    try {
      let paymentMethodId // sin id = la tarjeta guardada
      if (!useSaved) {
        const setup = await getCardSetup()
        const [mm, yy] = form.expiry.split("/").map(Number)
        const pm = await registerCard({
          publishableKey: setup.publishableKey,
          customerId: setup.customerId,
          number: digits(form.number),
          holderName: form.name.trim().toUpperCase(),
          expMonth: mm,
          expYear: 2000 + yy,
          cvv: form.cvv,
        })
        paymentMethodId = pm.id
      }
      const result = await payWithCard(paymentMethodId, upgradeTo)
      if (result.redirectUrl) {
        // el banco pide verificar: su página vuelve sola a Mi suscripción
        window.location.assign(result.redirectUrl)
        return
      }
      onDone(result.payment)
      if (result.payment.status === "SUCCEEDED") onClose()
      else setError(result.payment.failureMessage || t("billing.card.errors.declined"))
    } catch (err) {
      setError(err.onvo ? t("billing.card.errors.onvo", { detail: err.message }) : apiErrorMessage(err, t("billing.card.errors.generic")))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" aria-hidden />
          {t("billing.card.title", { amount: amountText })}
        </DialogTitle>
        <DialogDescription>{t("billing.card.subtitle")}</DialogDescription>
      </DialogHeader>

      {savedCard && (
        <div className="space-y-2" role="radiogroup" aria-label={t("billing.card.which")}>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
            <input type="radio" name="card" checked={useSaved} onChange={() => setUseSaved(true)} />
            {t("billing.card.saved", { brand: savedCard.brand, last4: savedCard.last4 })}
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
            <input type="radio" name="card" checked={!useSaved} onChange={() => setUseSaved(false)} />
            {t("billing.card.other")}
          </label>
        </div>
      )}

      {!useSaved && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="card-number">{t("billing.card.number")}</Label>
            <Input id="card-number" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={form.number} onChange={set("number", groupCard)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="card-name">{t("billing.card.name")}</Label>
            <Input id="card-name" autoComplete="cc-name" value={form.name} onChange={set("name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="card-exp">{t("billing.card.expiry")}</Label>
              <Input id="card-exp" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={form.expiry} onChange={set("expiry", formatExpiry)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="card-cvv">{t("billing.card.cvv")}</Label>
              <Input id="card-cvv" inputMode="numeric" autoComplete="cc-csc" type="password" maxLength={4} value={form.cvv} onChange={set("cvv", (v) => digits(v).slice(0, 4))} />
            </div>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-[var(--stk-crit)]">{error}</p>}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? t("billing.card.paying") : t("billing.card.pay", { amount: amountText })}
      </Button>
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("billing.card.secure")}
      </p>
    </form>
  )
}
