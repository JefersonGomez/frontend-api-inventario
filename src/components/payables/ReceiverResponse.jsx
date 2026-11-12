import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { CheckCircle2, Loader2, RefreshCw, Reply } from "lucide-react"
import { respondSupplierInvoice, retrySupplierResponse } from "@/api/payables"
import { apiErrorMessage } from "@/lib/api-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const TONE = {
  none: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  PENDING: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  SENT: "border-sky-500/40 text-sky-700 dark:text-sky-400",
  ACCEPTED: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  REJECTED: "border-destructive/50 text-destructive",
  ERROR: "border-destructive/50 text-destructive",
}

// Respuesta a Hacienda (mensaje receptor) de una factura importada desde su XML: estado + acción
export function ReceiverResponse({ invoice }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const retry = useMutation({ mutationFn: () => retrySupplierResponse(invoice.id), onSettled: () => queryClient.invalidateQueries({ queryKey: ["payables"] }) })
  if (!invoice.clave || invoice.voidedAt) return null
  const m = invoice.receiverMessage
  const state = m?.status ?? "none"
  const label = !m
    ? t("payables.receiver.none")
    : state === "ACCEPTED"
      ? t(`payables.receiver.done.${m.decision}`)
      : t(`payables.receiver.status.${state}`)
  const canRespond = !m || ["REJECTED", "ERROR"].includes(state)

  return (
    <span className="mt-1 flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className={cn("text-[10px]", TONE[state])} title={m?.message || m?.lastError || undefined}>
        {state === "ACCEPTED" && <CheckCircle2 className="h-3 w-3" aria-hidden />}
        {label}
      </Badge>
      {canRespond && (
        <Button size="xs" variant="outline" onClick={() => setOpen(true)}>
          <Reply aria-hidden />
          {m ? t("payables.receiver.again") : t("payables.receiver.respond")}
        </Button>
      )}
      {(state === "PENDING" || state === "SENT") && (
        <Button size="xs" variant="ghost" disabled={retry.isPending} onClick={() => retry.mutate()} title={t("payables.receiver.check")}>
          {retry.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
          <span className="sr-only">{t("payables.receiver.check")}</span>
        </Button>
      )}
      {state === "REJECTED" && m.message && <span className="block w-full text-[11px] text-destructive">{m.message}</span>}
      {retry.isError && <span role="alert" className="block w-full text-[11px] text-destructive">{apiErrorMessage(retry.error, t("payables.receiver.error"))}</span>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">{open && <RespondForm invoice={invoice} onClose={() => setOpen(false)} />}</DialogContent>
      </Dialog>
    </span>
  )
}

const OPTIONS = ["ACCEPT", "PARTIAL", "REJECT"]

function RespondForm({ invoice, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [decision, setDecision] = useState("ACCEPT")
  const [detail, setDetail] = useState("")
  const needsDetail = decision !== "ACCEPT"
  const save = useMutation({
    mutationFn: () => respondSupplierInvoice(invoice.id, { decision, ...(detail.trim() && { detail: detail.trim() }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] })
      onClose()
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <DialogHeader>
        <DialogTitle>{t("payables.receiver.title", { number: invoice.number.slice(-10) })}</DialogTitle>
      </DialogHeader>
      <fieldset className="space-y-2">
        <legend className="sr-only">{t("payables.receiver.title", { number: invoice.number })}</legend>
        {OPTIONS.map((o) => (
          <label key={o} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm", decision === o ? "border-primary bg-primary/5" : "border-border")}>
            <input type="radio" name="decision" value={o} checked={decision === o} onChange={() => setDecision(o)} className="mt-1" />
            <span>
              <span className="block font-medium">{t(`payables.receiver.options.${o}`)}</span>
              <span className="block text-xs text-muted-foreground">{t(`payables.receiver.hints.${o}`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {decision !== "REJECT" && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {invoice.creditable ? t("payables.receiver.credit") : t("payables.receiver.noCredit")}
        </p>
      )}
      {needsDetail && (
        <div className="space-y-1.5">
          <Label htmlFor="receiver-detail">{t("payables.receiver.detail")}</Label>
          <textarea
            id="receiver-detail"
            required
            minLength={3}
            maxLength={160}
            rows={2}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      )}
      {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("payables.receiver.error"))}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={save.isPending || (needsDetail && detail.trim().length < 3)}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t("payables.receiver.send")}
        </Button>
      </div>
    </form>
  )
}
