import { useState } from "react"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { Pagination } from "@/components/Pagination"
import { SearchInput } from "@/components/SearchInput"
import { useListParams } from "@/hoocks/useListParams"
import { useTranslation } from "react-i18next"
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/api/customers"
import { useAuth } from "@/context/AuthContext"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { FiscalIdFields } from "@/components/FiscalIdFields"
import { cleanIdNumber, formatFiscalId, isValidId } from "@/lib/fiscal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"

const emptyForm = {
  name: "", idType: "", idNumber: "", email: "", phone: "", address: "", economicActivity: "", creditLimit: "", creditDays: "",
}

export function Customers() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"
  const money = useMoney()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleting, setDeleting] = useState(null)
  // el servidor pagina y busca por nombre, correo o identificación
  const list = useListParams()
  const q = list.get("q")
  const customersQuery = useQuery({
    queryKey: ["customers", "page", list.page, q],
    queryFn: () => getCustomers({ page: list.page, ...(q && { q }) }),
    placeholderData: keepPreviousData,
  })
  const visible = customersQuery.data?.items ?? []

  const done = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] })
    closeDialog()
  }
  const toPayload = () => ({
    name: form.name.trim(),
    idType: form.idType || null,
    idNumber: form.idType ? cleanIdNumber(form.idNumber) : null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    address: form.address.trim() || null,
    economicActivity: form.economicActivity.trim() || null,
    creditLimit: form.creditLimit === "" ? null : Number(form.creditLimit),
    creditDays: form.creditLimit === "" || form.creditDays === "" ? null : Number(form.creditDays),
  })
  const createMutation = useMutation({ mutationFn: () => createCustomer(toPayload()), onSuccess: done })
  const updateMutation = useMutation({ mutationFn: () => updateCustomer(editing.id, toPayload()), onSuccess: done })
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      setDeleting(null)
    },
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(c) {
    setEditing(c)
    setForm({
      name: c.name,
      idType: c.idType ?? "",
      idNumber: c.idNumber ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      economicActivity: c.economicActivity ?? "",
      creditLimit: c.creditLimit == null ? "" : String(c.creditLimit),
      creditDays: c.creditDays == null ? "" : String(c.creditDays),
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
    setForm(emptyForm)
    createMutation.reset()
    updateMutation.reset()
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!isValidId(form.idType, form.idNumber)) return
    if (editing) updateMutation.mutate()
    else createMutation.mutate()
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const saveError = createMutation.error || updateMutation.error
  const credit = (c) =>
    c.creditLimit == null
      ? t("customers.cash")
      : c.creditDays
        ? t("customers.creditValue", { limit: money.format(c.creditLimit), days: c.creditDays })
        : t("customers.creditNoDays", { limit: money.format(c.creditLimit) })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("customers.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("customers.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("customers.new")}
        </Button>
      </div>

      <SearchInput
        id="customer-search"
        value={q}
        onSearch={(value) => list.set({ q: value })}
        placeholder={t("customers.search")}
        className="mb-4 w-full max-w-sm"
      />

      <div className="overflow-hidden overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("customers.table.name")}</TableHead>
              <TableHead>{t("customers.table.id")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("customers.table.email")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("customers.table.phone")}</TableHead>
              <TableHead>{t("customers.table.credit")}</TableHead>
              <TableHead className="text-right">{t("customers.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customersQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">{t("common.loading")}</TableCell>
              </TableRow>
            )}
            {!customersQuery.isLoading && visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">{t("customers.empty")}</TableCell>
              </TableRow>
            )}
            {visible.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatFiscalId(t, c.idType, c.idNumber) ?? "—"}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{c.email || "—"}</TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">{c.phone || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{credit(c)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label={t("customers.edit_title")}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(c)} aria-label={t("customers.delete_title")}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination data={customersQuery.data} onPage={list.setPage} />

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing ? t("customers.edit_title") : t("customers.create_title")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="customer-name">{t("customers.fields.name")}</Label>
              <Input id="customer-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>

            <FiscalIdFields idPrefix="customer" value={form} onChange={(patch) => setForm({ ...form, ...patch })} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-email">{t("customers.fields.email")}</Label>
                <Input id="customer-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-describedby="customer-email-hint" />
                <p id="customer-email-hint" className="text-xs text-muted-foreground">{t("customers.fields.email_hint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-phone">{t("customers.fields.phone")}</Label>
                <Input id="customer-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-address">{t("customers.fields.address")}</Label>
              <Input id="customer-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-activity">{t("customers.fields.activity")}</Label>
              <Input id="customer-activity" inputMode="numeric" value={form.economicActivity} onChange={(e) => setForm({ ...form, economicActivity: e.target.value })} aria-describedby="customer-activity-hint" />
              <p id="customer-activity-hint" className="text-xs text-muted-foreground">{t("customers.fields.activity_hint")}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-credit">{t("customers.fields.creditLimit")}</Label>
                <Input id="customer-credit" type="number" min="0" step="0.01" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} aria-describedby="customer-credit-hint" />
                <p id="customer-credit-hint" className="text-xs text-muted-foreground">{t("customers.fields.creditLimit_hint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-days">{t("customers.fields.creditDays")}</Label>
                <Input id="customer-days" type="number" min="1" max="365" step="1" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: e.target.value })} disabled={form.creditLimit === ""} />
              </div>
            </div>

            {saveError && (
              <p role="alert" className="text-sm text-destructive">{apiErrorMessage(saveError, t("customers.save_error"))}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? t("common.saving") : t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("customers.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("customers.delete_description", { name: deleting?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleting.id)}>
              {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
