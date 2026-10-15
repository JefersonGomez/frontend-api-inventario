import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
} from "@/api/suppliers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { FiscalIdFields } from "@/components/FiscalIdFields"
import { cleanIdNumber, formatFiscalId, isValidId } from "@/lib/fiscal"
import { apiErrorMessage } from "@/lib/api-error"

const emptyForm = { name: "", email: "", phone: "", address: "", idType: "", idNumber: "" }
// la identificación va sin guiones y solo si hay tipo
const toPayload = (form) => ({ ...form, idType: form.idType || null, idNumber: form.idType ? cleanIdNumber(form.idNumber) : null })

export function Suppliers() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deletingSupplier, setDeletingSupplier] = useState(null)

  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: getSuppliers })

  const createMutation = useMutation({
    mutationFn: (data) => createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      closeDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      setDeletingSupplier(null)
    },
  })

  function openCreateDialog() {
    setEditingSupplier(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEditDialog(supplier) {
    setEditingSupplier(supplier)
    setForm({
      name: supplier.name ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      idType: supplier.idType ?? "",
      idNumber: supplier.idNumber ?? "",
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingSupplier(null)
    setForm(emptyForm)
    createMutation.reset()
    updateMutation.reset()
  }

  function handleOpenChange(open) {
    if (!open) {
      closeDialog()
    } else {
      setDialogOpen(true)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!isValidId(form.idType, form.idNumber)) return
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: toPayload(form) })
    } else {
      createMutation.mutate(toPayload(form))
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const saveError = createMutation.error || updateMutation.error

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Gestiona tus proveedores" : "Consulta los proveedores y sus productos"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo proveedor
          </Button>
        )}
      </div>

      <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">{t("fiscal.idNumber")}</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Productos</TableHead>
              {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliersQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-6">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!suppliersQuery.isLoading && suppliersQuery.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-6">
                  No hay proveedores registrados.
                </TableCell>
              </TableRow>
            )}

            {suppliersQuery.data?.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                  {formatFiscalId(t, supplier.idType, supplier.idNumber) ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{supplier.email || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{supplier.phone || "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{supplier.products?.length ?? 0}</Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(supplier)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingSupplier(supplier)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isAdmin && (
        <>
          <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
            <DialogContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>
                    {editingSupplier ? "Editar proveedor" : "Nuevo proveedor"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-2">
                  <Label htmlFor="supplier-name">Nombre</Label>
                  <Input
                    id="supplier-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <FiscalIdFields idPrefix="supplier" value={form} onChange={(patch) => setForm({ ...form, ...patch })} />
                <div className="space-y-2">
                  <Label htmlFor="supplier-email">Email</Label>
                  <Input
                    id="supplier-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-phone">Teléfono</Label>
                  <Input
                    id="supplier-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-address">Dirección</Label>
                  <Input
                    id="supplier-address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                {saveError && (
                  <p role="alert" className="text-sm text-destructive">{apiErrorMessage(saveError, "No se pudo guardar el proveedor.")}</p>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!deletingSupplier} onOpenChange={(open) => !open && setDeletingSupplier(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este proveedor?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. "{deletingSupplier?.name}" se eliminará permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deletingSupplier.id)}
                >
                  {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}