import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getCompany, updateCompany } from "@/api/company"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FiscalIdFields } from "@/components/FiscalIdFields"
import { cleanIdNumber, isValidId } from "@/lib/fiscal"
import { apiErrorMessage } from "@/lib/api-error"
import TERRITORY from "@/lib/cr-territory.json"

const FIELDS = ["legalName", "idType", "idNumber", "economicActivity", "invoiceEmail", "phone", "province", "canton", "district", "addressDetail"]
const fromCompany = (c) => Object.fromEntries(FIELDS.map((k) => [k, c?.[k] ?? ""]))

// Datos de la empresa como emisor de comprobantes (solo ADMIN). Opcionales hasta que facture.
// Provincia, cantón y distrito salen del catálogo territorial oficial de Hacienda (Codificación de
// ubicación v4.4 → lib/cr-territory.json); se guardan los códigos de 2 dígitos que pide el comprobante.
// "Buscar" junto a la cédula trae de Hacienda la razón social y la actividad.
export function FiscalDataCard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ["company"], queryFn: getCompany })
  const [draft, setDraft] = useState(null) // null = sin cambios: se muestra lo guardado
  const form = draft ?? fromCompany(data)
  const set = (patch) => setDraft({ ...form, ...patch })

  const provinceItems = [
    { value: "none", label: t("settings.fiscal.province_none") },
    ...["1", "2", "3", "4", "5", "6", "7"].map((p) => ({ value: p, label: `${p} · ${t(`settings.fiscal.provinces.${p}`)}` })),
  ]
  const two = (v) => (v ? String(v).padStart(2, "0") : "")
  const cantons = TERRITORY[form.province]?.cantons ?? {}
  const districts = cantons[two(form.canton)]?.districts ?? {}
  const cantonItems = Object.entries(cantons).map(([code, c]) => ({ value: code, label: `${code} · ${c.name}` }))
  const districtItems = Object.entries(districts).map(([code, name]) => ({ value: code, label: `${code} · ${name}` }))

  const mutation = useMutation({
    mutationFn: () =>
      updateCompany({
        ...Object.fromEntries(FIELDS.map((k) => [k, form[k].trim()])),
        idType: form.idType || null,
        idNumber: form.idType ? cleanIdNumber(form.idNumber) : "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] })
      setDraft(null)
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!isValidId(form.idType, form.idNumber)) return
    mutation.mutate()
  }

  const field = (key, props = {}) => (
    <Input id={`fiscal-${key}`} value={form[key]} onChange={(e) => set({ [key]: e.target.value })} {...props} />
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.fiscal.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("settings.fiscal.description")}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fiscal-legalName">{t("settings.fiscal.legalName")}</Label>
            {field("legalName", { "aria-describedby": "fiscal-legalName-hint" })}
            <p id="fiscal-legalName-hint" className="text-xs text-muted-foreground">{t("settings.fiscal.legalName_hint")}</p>
          </div>

          <FiscalIdFields
            idPrefix="fiscal"
            value={form}
            onChange={set}
            onFound={({ name, idType, idNumber, activities }) =>
              set({ legalName: name, idNumber, ...(idType && { idType }), ...(!form.economicActivity && activities?.[0] && { economicActivity: activities[0].code }) })
            }
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fiscal-economicActivity">{t("settings.fiscal.activity")}</Label>
              {field("economicActivity", { inputMode: "numeric", "aria-describedby": "fiscal-activity-hint" })}
              <p id="fiscal-activity-hint" className="text-xs text-muted-foreground">{t("settings.fiscal.activity_hint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscal-invoiceEmail">{t("settings.fiscal.invoiceEmail")}</Label>
              {field("invoiceEmail", { type: "email" })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscal-phone">{t("settings.fiscal.phone")}</Label>
              {field("phone", { type: "tel" })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fiscal-province">{t("settings.fiscal.province")}</Label>
              <Select items={provinceItems} value={form.province || "none"} onValueChange={(v) => set({ province: v === "none" ? "" : v, canton: "", district: "" })}>
                <SelectTrigger id="fiscal-province" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {provinceItems.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscal-canton">{t("settings.fiscal.canton")}</Label>
              <Select items={cantonItems} value={two(form.canton) || null} onValueChange={(v) => set({ canton: v, district: "" })} disabled={!form.province}>
                <SelectTrigger id="fiscal-canton" className="w-full" aria-describedby="fiscal-code-hint">
                  <SelectValue placeholder={t("settings.fiscal.pick")} />
                </SelectTrigger>
                <SelectContent>
                  {cantonItems.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscal-district">{t("settings.fiscal.district")}</Label>
              <Select items={districtItems} value={two(form.district) || null} onValueChange={(v) => set({ district: v })} disabled={!form.canton}>
                <SelectTrigger id="fiscal-district" className="w-full" aria-describedby="fiscal-code-hint">
                  <SelectValue placeholder={t("settings.fiscal.pick")} />
                </SelectTrigger>
                <SelectContent>
                  {districtItems.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p id="fiscal-code-hint" className="text-xs text-muted-foreground sm:col-span-3">{t("settings.fiscal.code_hint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscal-addressDetail">{t("settings.fiscal.addressDetail")}</Label>
            {field("addressDetail")}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={draft === null || mutation.isPending}>
              {mutation.isPending ? t("common.saving") : t("settings.fiscal.save")}
            </Button>
            {mutation.isSuccess && draft === null && (
              <p role="status" className="text-xs text-muted-foreground">{t("settings.fiscal.saved")}</p>
            )}
            {mutation.isError && (
              <p role="alert" className="text-xs text-destructive">{apiErrorMessage(mutation.error, t("settings.fiscal.error"))}</p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
