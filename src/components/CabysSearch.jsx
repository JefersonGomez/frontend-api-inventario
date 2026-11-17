import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Loader2, Search } from "lucide-react"
import { searchCabys } from "@/api/einvoice"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Campo de código CABYS con buscador en el catálogo de Hacienda (por texto). value = los 13 dígitos.
// suggest: texto con el que empieza la búsqueda (el detalle de la línea, por ejemplo).
export function CabysSearch({ id, value, onChange, suggest = "", required, ariaLabel }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const search = useMutation({ mutationFn: (text) => searchCabys(text) })
  const run = (text) => text.trim().length >= 3 && search.mutate(text.trim())

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Input
          id={id}
          inputMode="numeric"
          maxLength={13}
          pattern="\d{13}"
          required={required}
          aria-label={ariaLabel}
          placeholder="13 dígitos"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        />
        <Button
          type="button" variant="outline" size="icon" title={t("products.cabys.search")} aria-label={t("products.cabys.search")}
          onClick={() => {
            const text = q || suggest
            setQ(text)
            setOpen(true)
            run(text)
          }}
        >
          <Search className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      {open && (
        <div className="space-y-2 rounded-lg border border-border p-2">
          <div className="flex gap-1.5">
            <Input
              autoFocus value={q} placeholder={t("products.cabys.placeholder")} aria-label={t("products.cabys.search")}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault() // no enviar el formulario de afuera
                  run(q)
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" disabled={q.trim().length < 3 || search.isPending} onClick={() => run(q)}>
              {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : t("products.cabys.go")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>{t("common.close")}</Button>
          </div>
          {search.isError && <p role="alert" className="text-xs text-destructive">{apiErrorMessage(search.error, t("products.cabys.unavailable"))}</p>}
          {search.data?.items.length === 0 && <p className="text-xs text-muted-foreground">{t("products.cabys.empty")}</p>}
          {search.data?.items.length > 0 && (
            <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-md border border-border">
              {search.data.items.map((item) => (
                <li key={item.code}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      onChange(item.code)
                      setOpen(false)
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      {item.description}
                      <span className="block font-mono text-xs text-muted-foreground">{item.code}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t("products.cabys.tax", { tax: item.taxPercent === 0 ? t("products.cabys.exempt") : `${item.taxPercent}%` })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
