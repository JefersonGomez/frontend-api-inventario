import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { AlertTriangle, CheckCircle2, FileCode2, Info, Loader2, Upload, XCircle } from "lucide-react"
import { importSupplierXml, previewSupplierXml } from "@/api/payables"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { formatFiscalId } from "@/lib/fiscal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const day = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("es-CR", { timeZone: "UTC" })
const NOTICE = {
  error: { icon: XCircle, className: "border-destructive/40 bg-destructive/5 text-destructive" },
  warning: { icon: AlertTriangle, className: "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-300" },
  info: { icon: Info, className: "border-border bg-muted/50 text-muted-foreground" },
}

// Registrar la factura electrónica de un proveedor desde su XML (y la respuesta de Hacienda, si la mandó)
export function ImportXmlDialog({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">{open && <ImportBody onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function ImportBody({ onClose }) {
  const { t } = useTranslation()
  const money = useMoney()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const input = useRef(null)
  const [files, setFiles] = useState([])
  const [edit, setEdit] = useState({ dueDate: null, creditable: null, note: "", respond: true }) // null = lo que propone el sistema
  const preview = useMutation({ mutationFn: previewSupplierXml })
  const save = useMutation({
    mutationFn: () => importSupplierXml(files, {
      ...(edit.dueDate && { dueDate: edit.dueDate }),
      ...(edit.creditable !== null && { creditable: edit.creditable }),
      ...(edit.note.trim() && { note: edit.note.trim() }),
      ...(preview.data?.receiverReady && { respond: edit.respond }),
    }),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["payables"] })
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      onClose()
      navigate(`/payables/${invoice.supplierId}`)
    },
  })

  function choose(list) {
    const picked = Array.from(list ?? []).slice(0, 2)
    if (!picked.length) return
    setFiles(picked)
    setEdit({ dueDate: null, creditable: null, note: "", respond: true })
    save.reset()
    preview.mutate(picked)
  }

  const p = preview.data
  const dueDate = edit.dueDate ?? p?.dueDate ?? ""
  const creditable = edit.creditable ?? p?.creditable ?? false

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileCode2 className="h-5 w-5" aria-hidden />
          {t("payables.xml.title")}
        </DialogTitle>
      </DialogHeader>

      {/* archivos */}
      <div
        className="rounded-lg border border-dashed border-border p-4 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          choose(e.dataTransfer.files)
        }}
      >
        <input ref={input} type="file" accept=".xml,text/xml,application/xml" multiple className="sr-only" id="xml-files" onChange={(e) => choose(e.target.files)} />
        <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={preview.isPending}>
          {preview.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
          {files.length ? t("payables.xml.change") : t("payables.xml.pick")}
        </Button>
        {files.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{files.map((f) => f.name).join(" · ")}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{t("payables.xml.hint")}</p>
      </div>

      {preview.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(preview.error, t("payables.xml.readError"))}</p>}

      {p && (
        <>
          {/* proveedor y comprobante */}
          <div className="grid gap-3 rounded-lg border border-border p-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">{t("payables.xml.supplier")}</p>
              <p className="font-medium">{p.supplier.name}</p>
              <p className="text-xs text-muted-foreground">{formatFiscalId(t, p.supplier.idType, p.supplier.idNumber) || p.supplier.idNumber}</p>
              <Badge variant={p.supplier.existing ? "secondary" : "outline"} className="mt-1">
                {p.supplier.existing ? t("payables.xml.existing", { name: p.supplier.existing.name }) : t("payables.xml.newSupplier")}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{p.kind === "TICKET" ? t("payables.xml.ticket") : t("payables.xml.invoice")}</p>
              <p className="font-mono">{p.number.slice(-10)}</p>
              <p className="text-xs text-muted-foreground">{t("payables.xml.issued", { date: day(p.issueDate) })}</p>
              {p.haciendaStatus === "Aceptado" && (
                <Badge variant="outline" className="mt-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" aria-hidden />{t("payables.xml.accepted")}</Badge>
              )}
              {p.haciendaStatus === "Rechazado" && <Badge variant="outline" className="mt-1 border-destructive/50 text-destructive">{t("payables.xml.rejected")}</Badge>}
            </div>
          </div>

          {/* avisos */}
          {p.notices.length > 0 && (
            <ul className="space-y-2">
              {p.notices.map((n) => {
                const { icon: Icon, className } = NOTICE[n.level]
                return (
                  <li key={n.code} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", className)}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {n.text}
                  </li>
                )
              })}
            </ul>
          )}

          {/* líneas */}
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">{t("payables.xml.detail")}</th>
                  <th className="px-3 py-1.5 text-right font-medium">{t("payables.xml.qty")}</th>
                  <th className="px-3 py-1.5 text-right font-medium">{t("payables.xml.lineTotal")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {p.lines.map((l) => (
                  <tr key={l.line}>
                    <td className="px-3 py-1.5">
                      {l.description}
                      <span className="block text-xs text-muted-foreground">{t(`taxRates.${l.rate}`)}{l.cabys ? ` · CABYS ${l.cabys}` : ""}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">{l.quantity} {l.unit}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{money.format(l.subtotal + l.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* IVA por tarifa y total */}
          <div className="space-y-1 text-sm">
            {p.taxes.map((x) => (
              <p key={x.rate} className="flex justify-between text-muted-foreground">
                <span>{t(`taxRates.${x.rate}`)} · {t("payables.xml.base", { amount: money.format(x.base) })}</span>
                <span className="font-mono">{t("payables.xml.vat", { amount: money.format(x.tax) })}</span>
              </p>
            ))}
            <p className="flex justify-between border-t border-border pt-1 text-base font-semibold">
              <span>{t("payables.xml.total")}</span>
              <span className="font-mono">{money.format(p.total)}</span>
            </p>
          </div>

          {/* lo que se puede ajustar */}
          {p.canImport && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="xml-due">{t("payables.xml.dueDate")}</Label>
                <Input id="xml-due" type="date" value={dueDate} min={p.issueDate} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} aria-describedby="xml-due-hint" />
                <p id="xml-due-hint" className="text-xs text-muted-foreground">
                  {p.creditDays ? t("payables.xml.dueHint", { count: p.creditDays }) : t("payables.xml.dueCash")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="xml-note">{t("payables.xml.note")}</Label>
                <Input id="xml-note" maxLength={200} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
              </div>
              <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 sm:col-span-2">
                <div>
                  <Label htmlFor="xml-creditable">{t("payables.xml.creditable")}</Label>
                  <p className="text-xs text-muted-foreground">{t("payables.xml.creditableHint")}</p>
                </div>
                <Switch id="xml-creditable" checked={creditable} onCheckedChange={(v) => setEdit({ ...edit, creditable: v })} />
              </div>
              {p.receiverReady && (
                <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 sm:col-span-2">
                  <div>
                    <Label htmlFor="xml-respond">{t("payables.xml.respond")}</Label>
                    <p className="text-xs text-muted-foreground">{t("payables.xml.respondHint")}</p>
                  </div>
                  <Switch id="xml-respond" checked={edit.respond} onCheckedChange={(v) => setEdit({ ...edit, respond: v })} />
                </div>
              )}
            </div>
          )}

          {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("payables.xml.saveError"))}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="button" disabled={!p.canImport || save.isPending || !dueDate} onClick={() => save.mutate()}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {t("payables.xml.save")}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
