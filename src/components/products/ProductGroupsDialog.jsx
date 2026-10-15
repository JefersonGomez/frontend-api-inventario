import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getProductGroups, createProductGroup, updateProductGroup, deleteProductGroup } from "@/api/productGroups"
import { apiErrorMessage } from "@/lib/api-error"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2 } from "lucide-react"

const splitAttributes = (v) => v.split(",").map((a) => a.trim()).filter(Boolean)
const empty = { name: "", attributes: "" }

// Productos base (agrupan variantes): crear, editar nombre/atributos y borrar. Solo ADMIN.
export function ProductGroupsDialog({ open, onOpenChange }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: groups = [] } = useQuery({ queryKey: ["product-groups"], queryFn: getProductGroups, enabled: open })
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["product-groups"] })
    queryClient.invalidateQueries({ queryKey: ["products"] })
  }
  const save = useMutation({
    mutationFn: () => {
      const data = { name: form.name.trim(), attributeNames: splitAttributes(form.attributes) }
      return editingId ? updateProductGroup(editingId, data) : createProductGroup(data)
    },
    onSuccess: () => {
      refresh()
      setForm(empty)
      setEditingId(null)
    },
  })
  const remove = useMutation({
    mutationFn: deleteProductGroup,
    onSuccess: () => {
      refresh()
      setDeleting(null)
    },
  })

  function edit(g) {
    setEditingId(g.id)
    setForm({ name: g.name, attributes: g.attributeNames.join(", ") })
    save.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("products.variants.manage_title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("products.variants.manage_intro")}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="group-name">{t("products.variants.name")}</Label>
            <Input id="group-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-attributes">{t("products.variants.attributes")}</Label>
            <Input
              id="group-attributes"
              value={form.attributes}
              onChange={(e) => setForm({ ...form, attributes: e.target.value })}
              placeholder={t("products.variants.attributes_hint")}
              required
            />
          </div>
          <Button type="submit" disabled={save.isPending}>
            {editingId ? t("products.variants.edit_attributes") : t("products.variants.add")}
          </Button>
          {save.isError && (
            <p role="alert" className="text-sm text-destructive sm:col-span-3">
              {apiErrorMessage(save.error, t("products.variants.save_error"))}
            </p>
          )}
        </form>

        <ul className="divide-y divide-border rounded-lg border border-border">
          {groups.length === 0 && <li className="p-3 text-sm text-muted-foreground">{t("products.variants.empty")}</li>}
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {g.attributeNames.join(" · ")} — {t("products.variants.count", { count: g._count?.products ?? 0 })}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => edit(g)} aria-label={`${t("common.edit", "Editar")} ${g.name}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleting(g)}
                aria-label={`${t("products.variants.delete")} ${g.name}`}
                title={t("products.variants.delete_hint")}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>

        <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("products.variants.delete")} “{deleting?.name}”</AlertDialogTitle>
              <AlertDialogDescription>{t("products.variants.delete_hint")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction disabled={remove.isPending} onClick={() => remove.mutate(deleting.id)}>
                {remove.isPending ? t("common.deleting") : t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
