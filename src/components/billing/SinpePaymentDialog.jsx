import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Smartphone } from "lucide-react"
import { paySinpe } from "@/api/billing"
import { getCompany } from "@/api/company"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Pagar la suscripción por SINPE Móvil (C3). ONVO reconoce la transferencia por la identificación de quien
// la manda y el monto exacto: se pide la cédula de la cuenta que va a transferir y su teléfono.
// Al generarlo, Mi suscripción muestra a qué número y cuánto transferir, y espera la confirmación sola.
export function SinpePaymentDialog({ open, onClose, amountText, onStarted, upgradeTo }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{open && <SinpeForm onClose={onClose} amountText={amountText} onStarted={onStarted} upgradeTo={upgradeTo} />}</DialogContent>
    </Dialog>
  )
}

const ID_TYPES = ["FISICA", "JURIDICA", "DIMEX"]
const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm"

function SinpeForm({ onClose, amountText, onStarted, upgradeTo }) {
  const { t } = useTranslation()
  // se propone la cédula y el teléfono de los datos fiscales de la empresa (se pueden cambiar)
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: getCompany })
  const [draft, setDraft] = useState({})
  const fiscalType = ID_TYPES.includes(company?.idType) ? company.idType : "FISICA"
  const form = {
    idType: draft.idType ?? fiscalType,
    idNumber: draft.idNumber ?? (ID_TYPES.includes(company?.idType) ? company?.idNumber ?? "" : ""),
    phone: draft.phone ?? "",
  }
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (form.idNumber.replace(/\D/g, "").length < 9) return setError(t("billing.sinpe.errors.id"))
    if (form.phone.replace(/\D/g, "").replace(/^506(?=\d{8}$)/, "").length !== 8) return setError(t("billing.sinpe.errors.phone"))
    setBusy(true)
    try {
      const { payment } = await paySinpe({ ...form, ...(upgradeTo && { upgradeTo }) })
      onStarted(payment)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, t("billing.card.errors.generic")))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" aria-hidden />
          {t("billing.sinpe.title", { amount: amountText })}
        </DialogTitle>
        <DialogDescription>{t("billing.sinpe.subtitle")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="sinpe-type">{t("billing.sinpe.idType")}</Label>
          <select id="sinpe-type" className={selectClass} value={form.idType} onChange={set("idType")}>
            {ID_TYPES.map((v) => (
              <option key={v} value={v}>{t(`billing.sinpe.idTypes.${v}`)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sinpe-id">{t("billing.sinpe.idNumber")}</Label>
          <Input id="sinpe-id" inputMode="numeric" value={form.idNumber} onChange={set("idNumber")} placeholder={t(`billing.sinpe.idPlaceholder.${form.idType}`)} aria-describedby="sinpe-id-hint" />
          <p id="sinpe-id-hint" className="text-xs text-muted-foreground">{t("billing.sinpe.idHint")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sinpe-phone">{t("billing.sinpe.phone")}</Label>
          <Input id="sinpe-phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="8888-8888" value={form.phone} onChange={set("phone")} />
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-[var(--stk-crit)]">{error}</p>}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? t("billing.sinpe.creating") : t("billing.sinpe.create")}
      </Button>
    </form>
  )
}
