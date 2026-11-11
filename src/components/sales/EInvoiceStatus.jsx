import { useTranslation } from "react-i18next"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Download, Loader2, RefreshCw, Send } from "lucide-react"
import { downloadEInvoiceXml, refreshEInvoice, sendEInvoice } from "@/api/einvoice"
import { apiErrorMessage } from "@/lib/api-error"
import { usePermissions } from "@/hoocks/usePermissions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Estado de un comprobante ante Hacienda (Bloque 9). PENDING/SENT = en camino, ACCEPTED, REJECTED, ERROR.
const TONE = {
  PENDING: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  SENT: "border-sky-500/40 text-sky-700 dark:text-sky-400",
  ACCEPTED: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  REJECTED: "border-destructive/50 text-destructive",
  ERROR: "border-destructive/50 text-destructive",
}

export function EInvoiceBadge({ status, className }) {
  const { t } = useTranslation()
  if (!status) return null
  return <Badge variant="outline" className={cn(TONE[status], className)}>{t(`einvoice.status.${status}`)}</Badge>
}

// Panel del detalle de la venta: estado, motivo y acciones (enviar o reintentar, consultar, XML)
export function EInvoicePanel({ documentId, type, einvoice }) {
  const { t, i18n } = useTranslation()
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sales", documentId] })
    queryClient.invalidateQueries({ queryKey: ["sales"] })
  }
  const send = useMutation({ mutationFn: () => sendEInvoice(documentId), onSettled: refresh })
  const check = useMutation({ mutationFn: () => refreshEInvoice(documentId), onSettled: refresh })
  const xml = useMutation({ mutationFn: () => downloadEInvoiceXml(documentId) })
  const manage = can("company.manage")
  if (type !== "TICKET" && !einvoice) return null // facturas y notas llegan en la siguiente fase

  const status = einvoice?.status
  const canSend = manage && (!einvoice || status === "PENDING" || status === "ERROR")
  const detail = einvoice?.message || einvoice?.lastError
  const when = (d) => new Date(d).toLocaleString(i18n.language, { dateStyle: "short", timeStyle: "short" })
  const error = send.error || check.error || xml.error

  return (
    <section aria-labelledby="einv-title" className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="einv-title" className="flex items-center gap-2 text-base font-semibold">
          {t("einvoice.panel.title")}
          {einvoice ? <EInvoiceBadge status={status} /> : <Badge variant="secondary">{t("einvoice.status.none")}</Badge>}
          {einvoice?.environment === "pruebas" && <Badge variant="outline">{t("einvoice.settings.env_pruebas")}</Badge>}
        </h2>
        <div className="flex flex-wrap gap-2">
          {canSend && (
            <Button size="sm" variant="outline" disabled={send.isPending} onClick={() => send.mutate()}>
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              {einvoice ? t("einvoice.panel.retry") : t("einvoice.panel.send")}
            </Button>
          )}
          {manage && status === "SENT" && (
            <Button size="sm" variant="outline" disabled={check.isPending} onClick={() => check.mutate()}>
              {check.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              {t("einvoice.panel.check")}
            </Button>
          )}
          {manage && einvoice?.clave && (
            <Button size="sm" variant="ghost" disabled={xml.isPending} onClick={() => xml.mutate()}>
              <Download className="h-4 w-4" aria-hidden />
              XML
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t(`einvoice.panel.explain.${status ?? "none"}`)}</p>
      {einvoice?.clave && <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{t("einvoice.panel.clave")}: {einvoice.clave}</p>}
      {einvoice && (
        <p className="mt-1 text-xs text-muted-foreground">
          {einvoice.sentAt && t("einvoice.panel.sentAt", { date: when(einvoice.sentAt) })}
          {einvoice.answeredAt && ` · ${t("einvoice.panel.answeredAt", { date: when(einvoice.answeredAt) })}`}
          {status === "PENDING" && einvoice.nextAttemptAt && t("einvoice.panel.nextAttempt", { date: when(einvoice.nextAttemptAt), count: einvoice.attempts })}
        </p>
      )}
      {detail && status !== "ACCEPTED" && (
        <p className={cn("mt-2 whitespace-pre-line rounded-lg px-3 py-2 text-sm", status === "PENDING" ? "bg-muted" : "bg-destructive/5 text-destructive")}>{detail}</p>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{apiErrorMessage(error, t("einvoice.panel.error"))}</p>}
    </section>
  )
}
