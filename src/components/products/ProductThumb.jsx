import { useState } from "react"
import { Package } from "lucide-react"
import { API_URL } from "@/api/client"
import { cn } from "@/lib/utils"

// URL pública de la foto de un producto (o de un archivo elegido que todavía no se subió)
const productImageSrc = (url) => (!url ? null : url.startsWith("blob:") ? url : `${API_URL}${url}`)

// Miniatura del producto; sin foto (o si no carga, p. ej. sin conexión) muestra un ícono
export function ProductThumb({ url, className }) {
  const [broken, setBroken] = useState(null)
  const src = productImageSrc(url)
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground", className)}>
      {src && broken !== src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setBroken(src)} />
      ) : (
        <Package className="h-1/2 w-1/2" aria-hidden />
      )}
    </span>
  )
}
