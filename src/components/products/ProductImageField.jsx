import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { removeProductImage, uploadProductImage } from "@/api/products"
import { apiErrorMessage } from "@/lib/api-error"
import { shrinkImage } from "@/lib/image"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ProductThumb } from "./ProductThumb"

// Foto del producto en el diálogo de Productos (Fase 5).
// Editando: se sube o se quita al momento. Creando: el archivo se guarda en `pending` y
// Products lo sube después de crear el producto (todavía no tiene id).
export function ProductImageField({ productId, imageUrl, pending, onPendingChange }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const input = useRef(null)
  // lo último que respondió el servidor manda sobre la foto con la que se abrió el diálogo
  const [changed, setChanged] = useState(undefined)
  const current = changed !== undefined ? changed : (imageUrl ?? null)
  // vista previa del archivo elegido al crear (se libera al cambiarlo o al cerrar)
  const preview = useMemo(() => (pending ? URL.createObjectURL(pending) : null), [pending])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const done = (product) => {
    setChanged(product.imageUrl)
    queryClient.invalidateQueries({ queryKey: ["products"] })
    queryClient.invalidateQueries({ queryKey: ["pos-catalog"] })
  }
  const upload = useMutation({ mutationFn: (file) => uploadProductImage(productId, file), onSuccess: done })
  const remove = useMutation({ mutationFn: () => removeProductImage(productId), onSuccess: done })
  const busy = upload.isPending || remove.isPending
  const error = upload.error || remove.error

  async function choose(e) {
    const file = e.target.files?.[0]
    e.target.value = "" // así se puede volver a elegir el mismo archivo
    if (!file) return
    const small = await shrinkImage(file)
    if (productId) upload.mutate(small)
    else onPendingChange(small)
  }

  const shown = productId ? current : preview
  return (
    <div className="space-y-1.5">
      <Label htmlFor="product-image">{t("products.dialog.label_image")}</Label>
      <div className="flex items-center gap-3">
        <ProductThumb url={shown} className="h-20 w-20 rounded-lg border border-border" />
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
              {shown ? t("products.dialog.image_change") : t("products.dialog.image_choose")}
            </Button>
            {shown && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => (productId ? remove.mutate() : onPendingChange(null))}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {t("products.dialog.image_remove")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {!productId && pending ? t("products.dialog.image_pending") : t("products.dialog.image_hint")}
          </p>
          {error && <p role="alert" className="text-xs text-destructive">{apiErrorMessage(error, t("products.dialog.image_hint"))}</p>}
        </div>
      </div>
      <input id="product-image" ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={choose} />
    </div>
  )
}
