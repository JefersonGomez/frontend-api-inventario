import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next" // 1. Importar hook
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/api/categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"

export function Categories() {
  const { t } = useTranslation() // 2. Llamar al hook
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [name, setName] = useState("")
  const [deletingCategory, setDeletingCategory] = useState(null)

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  })

  const createMutation = useMutation({
    mutationFn: () => createCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      closeDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => updateCategory(editingCategory.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCategory(deletingCategory.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setDeletingCategory(null)
    },
  })

  function openCreateDialog() {
    setEditingCategory(null)
    setName("")
    setDialogOpen(true)
  }

  function openEditDialog(category) {
    setEditingCategory(category)
    setName(category.name)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingCategory(null)
    setName("")
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (editingCategory) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          {/* 3. Reemplazar texto por t() */}
          <h1 className="text-2xl font-semibold">{t("categories.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("categories.subtitle")}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          {t("categories.new_button")}
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("categories.table.name")}</TableHead>
              <TableHead className="text-right">{t("categories.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoriesQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}

            {categoriesQuery.data?.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingCategory(category)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? t("categories.dialog.edit_title") : t("categories.dialog.create_title")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <Label htmlFor="category-name">{t("categories.dialog.label_name")}</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

     {/* Confirmación de borrado */}
<AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t("categories.delete.title")}</AlertDialogTitle>
      <AlertDialogDescription>
        {t("categories.delete.description", { name: deletingCategory?.name })}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setDeletingCategory(null)}>
        {t("common.cancel")}
      </AlertDialogCancel>
      <AlertDialogAction 
        onClick={() => {
          if (deletingCategory) {
            deleteMutation.mutate(deletingCategory.id)
            setDeletingCategory(null)
          }
        }}
      >
        {t("common.delete")}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
    </div>
  )
}