import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, CircleAlert, Columns3, Download, FileSpreadsheet, Loader2, Upload, Wand2 } from "lucide-react"
import { importProducts } from "@/api/products"
import { readXlsxRows } from "@/lib/xlsx-read"
import { downloadXlsx } from "@/lib/xlsx"
import { COLUMNS, buildRows, detectColumns, templateSheets } from "@/lib/product-import"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const PREVIEW_LIMIT = 200
const STATUS_VARIANT = { create: "default", update: "outline", skip: "secondary", error: "destructive" }
// lo recomendado viene marcado: el cliente solo cambia algo si no le sirve
const RECOMMENDED = {
  defaultCategory: "General", generateSku: true, pendingPrice: true, fixNumbers: true,
  ignoreInvalidDate: true, dropConflictingBarcode: true, skipRepeated: true, updateExisting: false,
}
// grupo de problema (summary.groups) → opción que lo arregla; en el orden en que se muestran
const FIXES = [
  { group: "existing", option: "updateExisting" },
  { group: "missingPrice", option: "pendingPrice" },
  { group: "missingCategory", option: "defaultCategory" },
  { group: "missingSku", option: "generateSku" },
  { group: "repeatedSku", option: "skipRepeated" },
  { group: "badNumbers", option: "fixNumbers" },
  { group: "invalidDate", option: "ignoreInvalidDate" },
  { group: "barcodeConflict", option: "dropConflictingBarcode" },
]
const inputClass = "h-9 rounded-md border border-input bg-background text-foreground px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

// Importar productos desde Excel: elegir archivo → (columnas, solo si no reconocemos el nombre) →
// vista previa con arreglos en bloque (el backend valida todo sin guardar) → confirmar.
export function ImportProductsDialog({ open, onOpenChange }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const inputRef = useRef(null)
  const [fileName, setFileName] = useState("")
  const [sheetRows, setSheetRows] = useState(null) // filas tal como vienen del Excel (con encabezado)
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState({}) // dato → índice de columna del archivo
  const [showMapping, setShowMapping] = useState(false)
  const [rows, setRows] = useState(null) // filas enviadas a la vista previa
  const [options, setOptions] = useState(RECOMMENDED)
  const [readError, setReadError] = useState("")
  const [onlyProblems, setOnlyProblems] = useState(false)
  const nameMissing = sheetRows && mapping.name === undefined

  const preview = useMutation({ mutationFn: ({ rows, options }) => importProducts(rows, true, options) })
  const commit = useMutation({
    mutationFn: () => importProducts(rows, false, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    },
  })

  // cada cambio de filas u opciones vuelve a pedir la vista previa (con pausa para la categoría escrita)
  const { mutate: runPreview } = preview
  useEffect(() => {
    if (!rows) return
    const id = setTimeout(() => runPreview({ rows, options }), 300)
    return () => clearTimeout(id)
  }, [rows, options, runPreview])

  const reset = () => {
    setFileName("")
    setSheetRows(null)
    setHeaders([])
    setMapping({})
    setShowMapping(false)
    setRows(null)
    setOptions(RECOMMENDED)
    setReadError("")
    setOnlyProblems(false)
    preview.reset()
    commit.reset()
    if (inputRef.current) inputRef.current.value = ""
  }

  // arma las filas con las columnas elegidas; el efecto de arriba pide la vista previa
  function review(sheet = sheetRows, map = mapping) {
    const built = buildRows(sheet, map)
    if (built.length === 0) return setReadError(t("products.import.empty"))
    if (built.length > 2000) return setReadError(t("products.import.tooMany"))
    setReadError("")
    setShowMapping(false)
    setRows(built)
  }

  async function handleFile(file) {
    reset()
    if (!file) return
    setFileName(file.name)
    if (!/\.xlsx$/i.test(file.name)) return setReadError(t("products.import.onlyXlsx"))
    try {
      const sheet = await readXlsxRows(file)
      if (sheet.length < 2) return setReadError(t("products.import.empty"))
      const detected = detectColumns(sheet)
      setSheetRows(sheet)
      setHeaders(detected.headers)
      setMapping(detected.mapping)
      // con el nombre reconocido vamos directo a la vista previa; lo demás se arregla ahí
      if (detected.mapping.name !== undefined) review(sheet, detected.mapping)
      else setShowMapping(true)
    } catch {
      setReadError(t("products.import.unreadable"))
    }
  }

  const changeMapping = (field, value) => {
    preview.reset()
    setRows(null)
    setMapping((m) => {
      const next = { ...m }
      if (value === "") delete next[field]
      else next[field] = Number(value)
      return next
    })
  }

  const setOption = (key, value) => setOptions((o) => ({ ...o, [key]: value }))

  const result = commit.data ?? preview.data
  const summary = result?.summary
  const resultRows = result?.rows ?? []
  const problems = resultRows.filter((r) => r.status === "error" || r.status === "skip" || r.fixes.length > 0)
  const visible = (onlyProblems ? problems : resultRows).slice(0, PREVIEW_LIMIT)
  const activeFixes = summary ? FIXES.filter((f) => summary.groups[f.group] > 0) : []
  const toImport = summary ? summary.toCreate + summary.toUpdate : 0

  const downloadProblems = () =>
    downloadXlsx(`${t("products.import.problemsFile")}.xlsx`, [{
      name: t("products.import.problemsSheet"),
      rows: [
        [t("products.import.col.row"), "SKU", t("products.import.col.name"), t("products.import.col.status"), t("products.import.col.detail")],
        ...problems.map((r) => [r.rowNumber, r.sku, r.name, t(`products.import.status.${r.status}`), [...r.errors, ...r.fixes].join(" · ")]),
      ],
    }])

  const close = (o) => {
    if (!o) reset()
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("products.import.title")}</DialogTitle>
        </DialogHeader>

        {/* Terminado */}
        {commit.isSuccess ? (
          <div className="space-y-4 text-center py-4" role="status">
            <CheckCircle2 className="w-12 h-12 mx-auto text-[var(--stk-ok)]" aria-hidden="true" />
            <p className="text-lg font-semibold">
              {t("products.import.done", { count: commit.data.created })}
              {commit.data.updated > 0 && ` ${t("products.import.doneUpdated", { count: commit.data.updated })}`}
            </p>
            {summary.pending > 0 && <p className="text-sm text-muted-foreground">{t("products.pending.banner", { count: summary.pending })}</p>}
            {summary.skipped + summary.errors > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t("products.import.doneProblems", { count: summary.skipped + summary.errors })}</p>
                <Button variant="outline" size="sm" onClick={downloadProblems}>
                  <Download />
                  {t("products.import.downloadProblems")}
                </Button>
              </div>
            )}
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={reset}>{t("products.import.another")}</Button>
              <Button onClick={() => close(false)}>{t("products.import.finish")}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Paso 1: archivo */}
            <div className="rounded-xl border border-dashed border-border p-5 space-y-3">
              <p className="text-sm text-muted-foreground">{t("products.import.intro")}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadXlsx(`${t("products.import.templateFile")}.xlsx`, templateSheets(t))}>
                  <Download />
                  {t("products.import.downloadTemplate")}
                </Button>
                <Button size="sm" onClick={() => inputRef.current?.click()} disabled={preview.isPending || commit.isPending}>
                  <Upload />
                  {t("products.import.chooseFile")}
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  aria-label={t("products.import.chooseFile")}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
              {fileName && (
                <p className="text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{fileName}</span>
                  {sheetRows && <span className="text-muted-foreground">· {t("products.import.rowsRead", { count: sheetRows.length - 1 })}</span>}
                  {sheetRows && !showMapping && (
                    <button type="button" className="ml-auto text-sm underline underline-offset-2" onClick={() => setShowMapping(true)}>
                      {t("products.import.changeColumns")}
                    </button>
                  )}
                </p>
              )}
            </div>

            {/* Paso de columnas: qué columna del archivo es cada dato */}
            {sheetRows && showMapping && (
              <section className="rounded-xl border border-border p-4 space-y-4" aria-labelledby="map-title">
                <div>
                  <h3 id="map-title" className="font-semibold flex items-center gap-2">
                    <Columns3 className="w-4 h-4" aria-hidden="true" />
                    {t("products.import.mapTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{t("products.import.mapHint")}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {COLUMNS.map((c) => {
                    const id = `map-${c.field}`
                    const isMissing = c.field === "name" && nameMissing
                    return (
                      <div key={c.field} className="space-y-1">
                        <label htmlFor={id} className="text-sm font-medium">
                          {t(`products.import.fields.${c.field}`)}
                          {c.field === "name" && <span className="text-[var(--stk-crit)]"> *</span>}
                        </label>
                        <select
                          id={id}
                          value={mapping[c.field] ?? ""}
                          onChange={(e) => changeMapping(c.field, e.target.value)}
                          aria-invalid={isMissing || undefined}
                          className={`w-full ${inputClass} ${isMissing ? "border-[var(--stk-crit)]" : ""}`}
                        >
                          <option value="" className="bg-background text-foreground">{t(c.field === "name" ? "products.import.choose" : "products.import.notUsed")}</option>
                          {headers.map((h) => (
                            <option key={h.index} value={h.index} className="bg-background text-foreground">
                              {h.label}{h.sample !== undefined ? ` (${t("products.import.example")}: ${String(h.sample).slice(0, 24)})` : ""}
                            </option>
                          ))}
                        </select>
                        {c.required && c.field !== "name" && mapping[c.field] === undefined && (
                          <p className="text-xs text-muted-foreground">{t("products.import.laterHint")}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => review()} disabled={nameMissing || preview.isPending}>
                    {t("products.import.review")}
                  </Button>
                </div>
              </section>
            )}

            {(readError || preview.isError || commit.isError) && (
              <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                {readError || apiErrorMessage(commit.error ?? preview.error, t("products.import.failed"))}
              </p>
            )}

            {preview.isPending && !summary && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                {t("products.import.checking")}
              </p>
            )}

            {/* Paso 2: vista previa */}
            {summary && rows && !showMapping && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center" aria-live="polite">
                  {[
                    { key: "toCreate", value: summary.toCreate, tone: "text-[var(--stk-ok)]" },
                    { key: "toUpdate", value: summary.toUpdate, tone: "text-foreground" },
                    { key: "skipped", value: summary.skipped, tone: "text-muted-foreground" },
                    { key: "errors", value: summary.errors, tone: "text-[var(--stk-crit)]" },
                  ].map((k) => (
                    <div key={k.key} className="rounded-xl border border-border p-3">
                      <p className={`text-2xl font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
                      <p className="text-xs text-muted-foreground">{t(`products.import.summary.${k.key}`)}</p>
                    </div>
                  ))}
                </div>

                {activeFixes.length > 0 && (
                  <section className="rounded-xl border border-border p-4 space-y-3" aria-labelledby="fix-title">
                    <div>
                      <h3 id="fix-title" className="font-semibold flex items-center gap-2">
                        <Wand2 className="w-4 h-4" aria-hidden="true" />
                        {t("products.import.fixes.title")}
                        {preview.isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-label={t("products.import.checking")} />}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{t("products.import.fixes.hint")}</p>
                    </div>
                    <ul className="divide-y divide-border">
                      {activeFixes.map(({ group, option }) => (
                        <li key={group} className="py-3 first:pt-0 last:pb-0 space-y-2">
                          <p className="text-sm font-medium">{t(`products.import.fixes.${group}`, { count: summary.groups[group] })}</p>
                          {group === "existing" ? (
                            <div className="space-y-1">
                              {[false, true].map((v) => (
                                <label key={String(v)} className="flex items-center gap-2 text-sm">
                                  <input type="radio" name="existing" checked={options.updateExisting === v} onChange={() => setOption(option, v)} />
                                  {t(v ? "products.import.fixes.existingUpdate" : "products.import.fixes.existingSkip")}
                                </label>
                              ))}
                            </div>
                          ) : group === "missingCategory" ? (
                            <div className="space-y-1">
                              <label className="flex flex-wrap items-center gap-2 text-sm">
                                {t("products.import.fixes.missingCategoryAction")}
                                <input
                                  value={options.defaultCategory}
                                  onChange={(e) => setOption(option, e.target.value)}
                                  maxLength={100}
                                  className={`w-48 ${inputClass}`}
                                />
                              </label>
                              {!options.defaultCategory.trim() && (
                                <p className="text-xs text-[var(--stk-crit)]">{t("products.import.fixes.missingCategoryEmpty")}</p>
                              )}
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={options[option]} onChange={(e) => setOption(option, e.target.checked)} />
                              {t(`products.import.fixes.${group}Action`)}
                            </label>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {summary.pending > 0 && (
                  <p className="text-sm rounded-lg bg-muted px-3 py-2">{t("products.import.pendingNote", { count: summary.pending })}</p>
                )}

                {(summary.newCategories.length > 0 || summary.newSuppliers.length > 0) && (
                  <div className="text-sm space-y-1">
                    {summary.newCategories.length > 0 && (
                      <p><span className="font-medium">{t("products.import.newCategories")}:</span> {summary.newCategories.join(", ")}</p>
                    )}
                    {summary.newSuppliers.length > 0 && (
                      <p><span className="font-medium">{t("products.import.newSuppliers")}:</span> {summary.newSuppliers.join(", ")}</p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
                    {t("products.import.onlyProblems")}
                  </label>
                  {problems.length > 0 && (
                    <Button variant="outline" size="sm" onClick={downloadProblems}>
                      <Download />
                      {t("products.import.downloadProblems")}
                    </Button>
                  )}
                </div>

                <div className="border border-border rounded-xl overflow-hidden overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-left border-b border-border">
                        <th className="py-2 px-3">{t("products.import.col.row")}</th>
                        <th className="px-3">SKU</th>
                        <th className="px-3 hidden sm:table-cell">{t("products.import.col.name")}</th>
                        <th className="px-3">{t("products.import.col.status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r) => (
                        <tr key={r.rowNumber} className="border-b border-border/60 align-top">
                          <td className="py-2 px-3 tabular-nums text-muted-foreground">{r.rowNumber}</td>
                          <td className="py-2 px-3 font-medium">
                            {r.sku || "—"}
                            <span className="block text-xs font-normal text-muted-foreground sm:hidden">{r.name}</span>
                          </td>
                          <td className="py-2 px-3 hidden sm:table-cell">{r.name || "—"}</td>
                          <td className="py-2 px-3">
                            <Badge variant={STATUS_VARIANT[r.status]}>{t(`products.import.status.${r.status}`)}</Badge>
                            {r.pending && <Badge variant="outline" className="ml-1">{t("products.pending.badge")}</Badge>}
                            {r.errors.length > 0 && <p className="mt-1 text-xs text-[var(--stk-crit)]">{r.errors.join(" · ")}</p>}
                            {r.fixes.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{r.fixes.join(" · ")}</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(onlyProblems ? problems.length : resultRows.length) > PREVIEW_LIMIT && (
                  <p className="text-xs text-muted-foreground">{t("products.import.previewLimit", { count: PREVIEW_LIMIT })}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => close(false)}>{t("common.cancel")}</Button>
                  <Button onClick={() => commit.mutate()} disabled={toImport === 0 || preview.isPending || commit.isPending}>
                    {commit.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                    {t("products.import.confirm", { count: toImport })}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
