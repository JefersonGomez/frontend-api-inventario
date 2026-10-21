import { useState } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Plus, Search, UserRound } from "lucide-react"
import { createCustomer, getCustomers } from "@/api/customers"
import { usePermissions } from "@/hoocks/usePermissions"
import { apiErrorMessage } from "@/lib/api-error"
import { cleanIdNumber, formatFiscalId, isValidId } from "@/lib/fiscal"
import { FiscalIdFields } from "@/components/FiscalIdFields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const emptyForm = { name: "", idType: "FISICA", idNumber: "", email: "", phone: "" }

// Cliente de la venta: buscar por nombre o cédula, o registrarlo rápido. Con identificación sale factura.
export function CustomerPicker({ open, onClose, onPick }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">{open && <PickerBody onPick={onPick} />}</DialogContent>
    </Dialog>
  )
}

function PickerBody({ onPick }) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const [q, setQ] = useState("")
  const [form, setForm] = useState(null) // null = buscando; objeto = registrando uno nuevo
  const { data } = useQuery({
    queryKey: ["customers", "pos", q],
    queryFn: () => getCustomers({ page: 1, pageSize: 8, ...(q.trim() && { q: q.trim() }) }),
    placeholderData: keepPreviousData,
    enabled: !form,
  })
  const create = useMutation({
    mutationFn: () =>
      createCustomer({
        name: form.name.trim(),
        idType: form.idType || null,
        idNumber: form.idType ? cleanIdNumber(form.idNumber) : null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      }),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      onPick(customer)
    },
  })

  if (form) {
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (isValidId(form.idType, form.idNumber)) create.mutate()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("pos.customer.newTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="pos-customer-name">{t("customers.fields.name")}</Label>
          <Input id="pos-customer-name" required autoFocus maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <FiscalIdFields idPrefix="pos-customer" value={form} onChange={(patch) => setForm({ ...form, ...patch })} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pos-customer-email">{t("customers.fields.email")}</Label>
            <Input id="pos-customer-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pos-customer-phone">{t("customers.fields.phone")}</Label>
            <Input id="pos-customer-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("pos.customer.invoiceHint")}</p>
        {create.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(create.error, t("customers.save_error"))}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setForm(null)}>{t("pos.customer.back")}</Button>
          <Button type="submit" disabled={create.isPending || !form.name.trim()}>{t("pos.customer.saveAndUse")}</Button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t("pos.customer.title")}</DialogTitle>
      </DialogHeader>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input autoFocus className="pl-9" placeholder={t("pos.customer.search")} aria-label={t("pos.customer.search")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {data?.items.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onPick(c)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted">
              <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block text-xs text-muted-foreground">{formatFiscalId(t, c.idType, c.idNumber) || t("pos.customer.noId")}</span>
              </span>
            </button>
          </li>
        ))}
        {data?.items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t("pos.customer.notFound")}</li>}
      </ul>
      {can("customers.manage") && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setForm({ ...emptyForm, ...(/^\d{9,12}$/.test(cleanIdNumber(q)) ? { idNumber: cleanIdNumber(q) } : { name: q.trim() }) })}
        >
          <Plus />
          {t("pos.customer.new")}
        </Button>
      )}
    </div>
  )
}
