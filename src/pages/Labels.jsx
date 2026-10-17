import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Barcode as BarcodeIcon, Printer, Trash2 } from "lucide-react"
import { generateBarcodes } from "@/api/products"
import { usePermissions } from "@/hoocks/usePermissions"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { encodeEan } from "@/lib/barcode"
import { Barcode } from "@/components/Barcode"
import { ProductPicker } from "@/components/ProductPicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import "./Labels.css"

// Formatos de etiqueta: hoja carta 3×10 (tipo Avery 5160), hoja A4 3×8, o rollo de etiquetadora (1 por página)
const FORMATS = {
  letter30: { page: "letter", cols: 3, w: "66.7mm", h: "25.4mm", gapX: "3mm", margin: "12.7mm 5mm" },
  a4_24: { page: "A4", cols: 3, w: "70mm", h: "37mm", gapX: "0mm", margin: "0mm" },
  roll50x25: { page: "50mm 25mm", cols: 1, w: "50mm", h: "25mm", gapX: "0mm", margin: "0mm", roll: true },
}

// Etiquetas con código de barras: se eligen productos y cuántas de cada uno, y se imprimen desde el
// navegador. A los que no tienen código EAN se les puede generar uno interno.
export function Labels() {
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const [lines, setLines] = useState([]) // [{ product, copies }]
  const [picking, setPicking] = useState(null)
  const [format, setFormat] = useState("letter30")
  const [showPrice, setShowPrice] = useState(true)
  const [showName, setShowName] = useState(true)

  const missing = lines.filter((l) => !encodeEan(l.product.barcode))
  const generate = useMutation({
    mutationFn: () => generateBarcodes(missing.map((l) => l.product.id)),
    onSuccess: ({ products }) => {
      const codes = new Map(products.map((p) => [p.id, p.barcode]))
      setLines((ls) => ls.map((l) => (codes.has(l.product.id) ? { ...l, product: { ...l.product, barcode: codes.get(l.product.id) } } : l)))
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
  })

  function add(product) {
    if (!product) return
    setLines((ls) => (ls.some((l) => l.product.id === product.id) ? ls : [...ls, { product, copies: 1 }]))
    setPicking(null)
  }

  const f = FORMATS[format]
  const labels = lines.flatMap((l) => Array.from({ length: Math.max(0, Math.min(500, Number(l.copies) || 0)) }, () => l.product))
  const formatItems = Object.keys(FORMATS).map((k) => ({ value: k, label: t(`labels.formats.${k}`) }))

  return (
    <div className="space-y-5">
      {/* tamaño de página para la impresión según el formato elegido */}
      {/* solo mientras esta página está abierta: imprime únicamente la hoja de etiquetas */}
      <style>{`@media print {
        @page { size: ${f.page}; margin: ${f.margin}; }
        body * { visibility: hidden; }
        .labels-sheet, .labels-sheet * { visibility: visible; }
        .labels-sheet { position: absolute; left: 0; top: 0; padding: 0; border: 0; border-radius: 0; overflow: visible; }
        .labels-item { outline: none; }
        .labels-sheet--roll .labels-item { break-after: page; }
      }`}</style>

      <div className="print:hidden">
        <h1 className="text-2xl font-semibold">{t("labels.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("labels.subtitle")}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] print:hidden">
        <section className="space-y-3">
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <ProductPicker id="labels-product" value={picking} onChange={add} />
            </div>
          </div>
          {lines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("labels.empty")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {lines.map((l, i) => (
                <li key={l.product.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.product.name}</p>
                    <p className={`text-xs ${encodeEan(l.product.barcode) ? "text-muted-foreground" : "text-[var(--stk-warn)]"}`}>
                      {l.product.barcode
                        ? encodeEan(l.product.barcode) ? l.product.barcode : t("labels.notStandard", { code: l.product.barcode })
                        : t("labels.noCode")}
                    </p>
                  </div>
                  <Label className="flex items-center gap-2 text-sm font-normal">
                    {t("labels.copies")}
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      className="w-20"
                      value={l.copies}
                      onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, copies: e.target.value } : x)))}
                    />
                  </Label>
                  <Button variant="ghost" size="icon" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label={t("labels.remove", { name: l.product.name })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {missing.length > 0 && can("products.manage") && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm">
              <span className="flex-1">{t("labels.missing", { count: missing.length })}</span>
              <Button variant="outline" size="sm" disabled={generate.isPending} onClick={() => generate.mutate()}>
                <BarcodeIcon className="mr-1 h-4 w-4" />
                {t("labels.generate")}
              </Button>
            </div>
          )}
          {generate.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(generate.error, t("labels.error"))}</p>}
        </section>

        <aside className="space-y-4 rounded-xl border border-border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="labels-format">{t("labels.format")}</Label>
            <Select items={formatItems} value={format} onValueChange={setFormat}>
              <SelectTrigger id="labels-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
            {t("labels.showName")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
            {t("labels.showPrice")}
          </label>
          <p className="text-xs text-muted-foreground">{t("labels.printHint")}</p>
          <Button className="w-full" disabled={labels.length === 0} onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            {t("labels.print", { count: labels.length })}
          </Button>
        </aside>
      </div>

      {labels.length > 0 && (
        <section aria-label={t("labels.preview")}>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground print:hidden">{t("labels.preview")}</h2>
          <div
            className={`labels-sheet ${f.roll ? "labels-sheet--roll" : ""}`}
            style={{ gridTemplateColumns: `repeat(${f.cols}, ${f.w})`, columnGap: f.gapX, "--label-h": f.h }}
          >
            {labels.map((p, i) => (
              <div key={i} className="labels-item" style={{ width: f.w, height: f.h }}>
                {showName && <p className="labels-name">{p.name}</p>}
                {encodeEan(p.barcode) ? <Barcode code={p.barcode} className="labels-code" /> : <p className="labels-raw">{p.barcode || "—"}</p>}
                {showPrice && <p className="labels-price">{money.format(p.price)}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
