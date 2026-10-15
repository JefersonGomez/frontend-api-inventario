import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ID_TYPES, isValidId } from "@/lib/fiscal"

// Tipo + número de identificación. value = { idType, idNumber }; idType "" = sin identificación.
export function FiscalIdFields({ idPrefix, value, onChange }) {
  const { t } = useTranslation()
  const items = [{ value: "none", label: t("fiscal.none") }, ...ID_TYPES.map((v) => ({ value: v, label: t(`fiscal.types.${v}`) }))]
  const invalid = value.idType && value.idNumber && !isValidId(value.idType, value.idNumber)

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
        <Input
          id={`${idPrefix}-idnumber`}
          value={value.idNumber}
          onChange={(e) => onChange({ idNumber: e.target.value })}
          disabled={!value.idType}
          required={Boolean(value.idType)}
          aria-invalid={invalid || undefined}
          aria-describedby={`${idPrefix}-idhint`}
          inputMode={value.idType === "EXTRANJERO" ? "text" : "numeric"}
        />
      </div>
      <p id={`${idPrefix}-idhint`} className={`text-xs sm:col-span-2 ${invalid ? "text-destructive" : "text-muted-foreground"}`}>
        {invalid ? t("fiscal.invalid") + " " : ""}
        {t(`fiscal.hints.${value.idType || "none"}`)}
      </p>
    </div>
  )
}
