import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, SearchCheck } from "lucide-react"
import { lookupTaxpayer } from "@/api/einvoice"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ID_TYPES, cleanIdNumber, isValidId } from "@/lib/fiscal"

// Tipo + número de identificación. value = { idType, idNumber }; idType "" = sin identificación.
// onFound (opcional): muestra "Buscar en Hacienda", que trae el nombre exacto y el tipo con la cédula
// y llama onFound({ name, idType, idNumber, activities }) para llenar el formulario.
export function FiscalIdFields({ idPrefix, value, onChange, onFound }) {
  const { t } = useTranslation()
  const [lookup, setLookup] = useState({ busy: false, error: null, found: null })
  const items = [{ value: "none", label: t("fiscal.none") }, ...ID_TYPES.map((v) => ({ value: v, label: t(`fiscal.types.${v}`) }))]
  const invalid = value.idType && value.idNumber && !isValidId(value.idType, value.idNumber)
  const digits = cleanIdNumber(value.idNumber ?? "")
  const canLookup = onFound && value.idType !== "EXTRANJERO" && /^\d{9,12}$/.test(digits)

  async function search() {
    setLookup({ busy: true, error: null, found: null })
    try {
      const r = await lookupTaxpayer(digits)
      onFound({ name: r.name, idNumber: r.idNumber, activities: r.activities, ...(r.idType && { idType: r.idType }) })
      setLookup({ busy: false, error: null, found: r.name })
    } catch (err) {
      setLookup({ busy: false, error: apiErrorMessage(err, t("fiscal.lookup.error")), found: null })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-idtype`}>{t("fiscal.idType")}</Label>
        <Select
          items={items}
          value={value.idType || "none"}
          onValueChange={(v) => onChange(v === "none" ? { idType: "", idNumber: "" } : { idType: v })}
        >
          <SelectTrigger id={`${idPrefix}-idtype`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((i) => (
              <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-idnumber`}>{t("fiscal.idNumber")}</Label>
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-idnumber`}
            value={value.idNumber}
            onChange={(e) => {
              setLookup({ busy: false, error: null, found: null })
              onChange({ idNumber: e.target.value })
            }}
            disabled={!value.idType}
            required={Boolean(value.idType)}
            aria-invalid={invalid || undefined}
            aria-describedby={`${idPrefix}-idhint`}
            inputMode={value.idType === "EXTRANJERO" ? "text" : "numeric"}
          />
          {onFound && value.idType !== "EXTRANJERO" && (
            <Button type="button" variant="outline" disabled={!canLookup || lookup.busy} onClick={search} title={t("fiscal.lookup.button")}>
              {lookup.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <SearchCheck className="h-4 w-4" aria-hidden />}
              <span className="sr-only sm:not-sr-only">{t("fiscal.lookup.short")}</span>
            </Button>
          )}
        </div>
      </div>
      <p id={`${idPrefix}-idhint`} className={`text-xs sm:col-span-2 ${invalid ? "text-destructive" : "text-muted-foreground"}`}>
        {invalid ? t("fiscal.invalid") + " " : ""}
        {t(`fiscal.hints.${value.idType || "none"}`)}
        {onFound && value.idType && value.idType !== "EXTRANJERO" && !lookup.found && !lookup.error ? ` ${t("fiscal.lookup.hint")}` : ""}
      </p>
      {lookup.found && <p role="status" className="text-xs text-[var(--stk-ok)] sm:col-span-2">{t("fiscal.lookup.found", { name: lookup.found })}</p>}
      {lookup.error && <p role="alert" className="text-xs text-destructive sm:col-span-2">{lookup.error}</p>}
    </div>
  )
}
