import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Pencil, Percent, Plus } from "lucide-react"
import { createDiscountType, getDiscountTypes, updateDiscountType } from "@/api/pos"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const emptyForm = { name: "", kind: "PERCENT", free: false, value: "", maxPercent: "", appliesTo: "BOTH" }

// Tipos de descuento del POS (/configuracion → Cajas). El cajero elige uno y SIEMPRE lo autoriza el
// encargado con su código. Libre = el cajero escribe cuánto, hasta el tope. No se borran: se desactivan.
export function DiscountTypesCard() {
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const { data: types = [] } = useQuery({ queryKey: ["discount-types"], queryFn: getDiscountTypes })
  const [editing, setEditing] = useState(null) // null = cerrado; {} = nuevo; objeto = editar
  const [form, setForm] = useState(emptyForm)

  const kindItems = ["PERCENT", "AMOUNT"].map((v) => ({ value: v, label: t(`discounts.kinds.${v}`) }))
  const scopeItems = ["BOTH", "LINE", "TOTAL"].map((v) => ({ value: v, label: t(`discounts.scopes.${v}`) }))

  const payload = (d) => ({
    name: d.name, kind: d.kind, value: d.value == null ? null : Number(d.value), maxPercent: d.maxPercent == null ? null : Number(d.maxPercent),
    appliesTo: d.appliesTo, isActive: d.isActive,
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["discount-types"] })
  const save = useMutation({
    mutationFn: () => {
      const data = {
        name: form.name.trim(), kind: form.kind, appliesTo: form.appliesTo,
        value: form.free ? null : Number(form.value), maxPercent: form.free ? Number(form.maxPercent) : null,
        isActive: editing?.isActive ?? true,
      }
      return editing?.id ? updateDiscountType(editing.id, data) : createDiscountType(data)
    },
    onSuccess: () => {
      refresh()
      setEditing(null)
    },
  })
  const toggle = useMutation({ mutationFn: (d) => updateDiscountType(d.id, { ...payload(d), isActive: !d.isActive }), onSuccess: refresh })

  function open(d) {
    setEditing(d ?? {})
    setForm(
      d
        ? { name: d.name, kind: d.kind, free: d.value == null, value: d.value == null ? "" : String(Number(d.value)), maxPercent: d.maxPercent == null ? "" : String(Number(d.maxPercent)), appliesTo: d.appliesTo }
        : emptyForm
    )
    save.reset()
  }

  const amountLabel = (d) =>
    d.value == null
      ? t("discounts.freeUpTo", { pct: Number(d.maxPercent) })
      : d.kind === "PERCENT" ? `${Number(d.value)} %` : money.format(d.value)
  const valid = form.name.trim() && (form.free ? Number(form.maxPercent) > 0 && Number(form.maxPercent) <= 100 : Number(form.value) > 0 && (form.kind !== "PERCENT" || Number(form.value) <= 100))

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{t("discounts.title")}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{t("discounts.hint")}</p>
        </div>
        <Button onClick={() => open(null)}>
          <Plus />
          {t("discounts.new")}
        </Button>
      </CardHeader>
      <CardContent>
        {types.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Percent className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">{t("discounts.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("discounts.emptyHint")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("discounts.name")}</TableHead>
                  <TableHead>{t("discounts.amount")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("discounts.appliesTo")}</TableHead>
                  <TableHead className="text-right">{t("discounts.active")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((d) => (
                  <TableRow key={d.id} className={d.isActive ? undefined : "opacity-60"}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="font-mono text-sm">{amountLabel(d)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{t(`discounts.scopes.${d.appliesTo}`)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => open(d)} aria-label={t("discounts.edit", { name: d.name })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Switch
                        className="ml-2 align-middle"
                        checked={d.isActive}
                        disabled={toggle.isPending}
                        onCheckedChange={() => toggle.mutate(d)}
                        aria-label={t("discounts.activeAria", { name: d.name })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {toggle.isError && <p role="alert" className="mt-2 text-sm text-destructive">{apiErrorMessage(toggle.error, t("discounts.error"))}</p>}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("discounts.editTitle") : t("discounts.newTitle")}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              save.mutate()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="discount-name">{t("discounts.name")}</Label>
              <Input id="discount-name" value={form.name} maxLength={60} required autoFocus placeholder={t("discounts.namePlaceholder")} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount-kind">{t("discounts.kind")}</Label>
                <Select items={kindItems} value={form.kind} onValueChange={(kind) => setForm({ ...form, kind })}>
                  <SelectTrigger id="discount-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kindItems.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-scope">{t("discounts.appliesTo")}</Label>
                <Select items={scopeItems} value={form.appliesTo} onValueChange={(appliesTo) => setForm({ ...form, appliesTo })}>
                  <SelectTrigger id="discount-scope" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeItems.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="discount-free">{t("discounts.free")}</Label>
                <p className="text-xs text-muted-foreground">{t("discounts.freeHint")}</p>
              </div>
              <Switch id="discount-free" checked={form.free} onCheckedChange={(free) => setForm({ ...form, free })} />
            </div>
            {form.free ? (
              <div className="space-y-2">
                <Label htmlFor="discount-max">{t("discounts.maxPercent")}</Label>
                <Input id="discount-max" type="number" min="1" max="100" step="0.01" required className="font-mono" value={form.maxPercent} onChange={(e) => setForm({ ...form, maxPercent: e.target.value })} />
                <p className="text-xs text-muted-foreground">{t("discounts.maxPercentHint")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="discount-value">{form.kind === "PERCENT" ? t("discounts.valuePercent") : t("discounts.valueAmount")}</Label>
                <Input id="discount-value" type="number" min="0.01" max={form.kind === "PERCENT" ? 100 : undefined} step="0.01" required className="font-mono" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            )}
            {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("discounts.error"))}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={save.isPending || !valid}>{t("common.save")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
