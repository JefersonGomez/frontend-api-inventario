import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery } from "@tanstack/react-query"
import { CheckCircle2, Loader2, Search, XCircle } from "lucide-react"
import { searchCabys } from "@/api/einvoice"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Código CABYS del producto con ayuda del catálogo de Hacienda:
// - "Buscar": busca por el nombre del producto y al elegir pone el código y su IVA.
// - Con 13 dígitos escritos, revisa que exista y avisa si el IVA del producto no es el que indica Hacienda.
// Va dentro de una grilla: la celda del campo y, abierto, el buscador a todo el ancho (col-span-full).
export function CabysField({ value, onChange, taxRate, onTaxRate, productName, describedBy }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const code = /^\d{13}$/.test(value) ? value : null
  const check = useQuery({
    queryKey: ["cabys", code],
    queryFn: () => searchCabys(code),
    enabled: Boolean(code),
    staleTime: 24 * 3_600_000,
    retry: false,
  })
  const search = useMutation({ mutationFn: (text) => searchCabys(text) })
  const known = code && check.data ? check.data.items[0] : null
  const percent = (item) => (item.taxPercent === 0 ? t("products.cabys.exempt") : `${item.taxPercent}%`)

  function openSearch() {
    const text = q || productName?.trim() || ""
    setQ(text)
    setOpen(true)
    if (text.length >= 3) search.mutate(text)
  }
  function pick(item) {
    onChange(item.code)
    if (item.taxRate) onTaxRate(item.taxRate)
    setOpen(false)
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="product-cabys">{t("products.dialog.label_cabys")}</Label>
        <div className="flex gap-1.5">
          <Input
            id="product-cabys"
            inputMode="numeric"
            maxLength={13}
            pattern="\d{13}"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
            aria-describedby={`product-cabys-status ${describedBy ?? ""}`}
          />
          <Button type="button" variant="outline" size="icon" onClick={openSearch} aria-label={t("products.cabys.search")} title={t("products.cabys.search")}>
            <Search className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* resultado de revisar el código escrito */}
      <div id="product-cabys-status" className="col-span-full -mt-1 text-xs empty:hidden" aria-live="polite">
        {code && check.isFetching && <span className="text-muted-foreground">{t("products.cabys.checking")}</span>}
        {code && !check.isFetching && known && (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex items-center gap-1 text-[var(--stk-ok)]">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {known.description} · {t("products.cabys.tax", { tax: percent(known) })}
            </span>
            {known.taxRate && known.taxRate !== taxRate && (
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                {t("products.cabys.taxMismatch", { tax: percent(known) })}
                <Button type="button" size="xs" variant="outline" onClick={() => onTaxRate(known.taxRate)}>{t("products.cabys.useTax", { tax: percent(known) })}</Button>
              </span>
            )}
          </span>
        )}
        {code && !check.isFetching && check.data && !known && (
          <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" aria-hidden />{t("products.cabys.notFound")}</span>
        )}
        {code && check.isError && <span className="text-muted-foreground">{apiErrorMessage(check.error, t("products.cabys.unavailable"))}</span>}
      </div>

      {/* buscador en el catálogo */}
      {open && (
        <div className="col-span-full space-y-2 rounded-lg border border-border p-3">
          <div className="flex gap-2">
            <Input
              autoFocus
              value={q}
              placeholder={t("products.cabys.placeholder")}
              aria-label={t("products.cabys.search")}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault() // no enviar el formulario del producto
                  if (q.trim().length >= 3) search.mutate(q.trim())
                }
              }}
            />
            <Button type="button" variant="outline" disabled={q.trim().length < 3 || search.isPending} onClick={() => search.mutate(q.trim())}>
              {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
              {t("products.cabys.go")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("common.close")}</Button>
          </div>
          {search.isError && <p role="alert" className="text-xs text-destructive">{apiErrorMessage(search.error, t("products.cabys.unavailable"))}</p>}
          {search.data && (
            search.data.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("products.cabys.empty")}</p>
            ) : (
              <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-md border border-border">
                {search.data.items.map((item) => (
                  <li key={item.code}>
                    <button type="button" onClick={() => pick(item)} className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-muted">
                      <span className="min-w-0 flex-1">
                        <span className="block">{item.description}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{item.code}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{t("products.cabys.tax", { tax: percent(item) })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
          {search.data && search.data.total > search.data.items.length && (
            <p className="text-xs text-muted-foreground">{t("products.cabys.more", { count: search.data.total })}</p>
          )}
        </div>
      )}
    </>
  )
}
