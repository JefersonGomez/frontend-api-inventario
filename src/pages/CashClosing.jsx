import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Printer } from "lucide-react"
import { getSessionReport, reconcileSession } from "@/api/pos"
import { useMoney } from "@/hoocks/useMoney"
import { sumDenominations } from "@/lib/pos"
import { apiErrorMessage } from "@/lib/api-error"
import { CashReport } from "@/components/pos/CashReport"
import { DenominationCount } from "@/components/pos/DenominationCount"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

const tone = (diff) => (diff === 0 ? "ok" : diff > 0 ? "warn" : "crit")
// literales: Tailwind no genera clases armadas con variables
const BOX = { ok: "bg-[var(--stk-ok-bg)] text-[var(--stk-ok)]", warn: "bg-[var(--stk-warn-bg)] text-[var(--stk-warn)]", crit: "bg-[var(--stk-crit-bg)] text-[var(--stk-crit)]" }
const round2 = (v) => Math.round(v * 100) / 100

// /cash-closings/:id — paso 2, el arqueo: la jefa de caja cuenta con el cajero billete por billete;
// opcional, el total del papel del datáfono para compararlo con lo cobrado con tarjeta. Queda el acta.
export function CashClosing() {
  const { id } = useParams()
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const { data: report, isLoading, isError } = useQuery({ queryKey: ["cash-sessions", "report", id], queryFn: () => getSessionReport(id) })
  const [counts, setCounts] = useState({})
  const [card, setCard] = useState("")
  const [sinpe, setSinpe] = useState("") // total de SINPE que entró según la app del banco
  const [note, setNote] = useState("")
  const [confirm, setConfirm] = useState(false)

  const save = useMutation({
    mutationFn: () =>
      reconcileSession(id, {
        denominations: Object.fromEntries(Object.entries(counts).filter(([, n]) => n > 0)),
        ...(card !== "" && { cardDeclared: Number(card) }),
        ...(sinpe !== "" && { sinpeDeclared: Number(sinpe) }),
        ...(note.trim() && { note: note.trim() }),
      }),
    onSuccess: (r) => {
      setConfirm(false)
      queryClient.setQueryData(["cash-sessions", "report", id], r)
      queryClient.invalidateQueries({ queryKey: ["cash-sessions"] })
    },
    onError: () => setConfirm(false),
  })

  if (isLoading) return null
  if (isError) return <p className="text-muted-foreground">{t("cashClosings.notFound")}</p>

  const back = (
    <Button variant="ghost" size="sm" render={<Link to="/cash-closings" />} className="mb-4">
      <ArrowLeft />
      {t("cashClosings.back")}
    </Button>
  )
  const title = (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold">{t("cashClosings.reconcileTitle", { name: report.openedBy.name })}</h1>
      <p className="text-sm text-muted-foreground">
        {report.register.name} · {report.register.location.name} · {new Date(report.closedAt ?? report.openedAt).toLocaleString("es-CR")}
      </p>
    </div>
  )

  // ya tiene arqueo (o la caja sigue abierta): solo el reporte
  if (report.reconciledAt || report.status === "OPEN") {
    return (
      <div>
        {back}
        {title}
        {report.status === "OPEN" && <p className="mb-4 text-sm text-[var(--stk-warn)]">{t("cashClosings.stillOpen")}</p>}
        <div className="flex flex-wrap items-start gap-6">
          <div className="rounded-xl border border-border bg-white p-2">
            <CashReport report={report} />
          </div>
          {report.reconciledAt && (
            <Button onClick={() => window.print()}>
              <Printer />
              {t("cashClosings.printActa")}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const s = report.summary
  const counted = sumDenominations(counts)
  const diff = round2(counted - report.expectedCash)
  // el datáfono cobra ventas y abonos con tarjeta
  const cardCharged = round2((s.payments.CARD ?? 0) + (s.collections?.CARD ?? 0) - (s.refunds?.CARD ?? 0))
  const cardDiff = card === "" ? null : round2(Number(card) - cardCharged)
  // SINPE: ventas y abonos que entraron, menos las devoluciones que se enviaron por SINPE
  const sinpeCharged = round2((s.payments.SINPE ?? 0) + (s.collections?.SINPE ?? 0) - (s.refunds?.SINPE ?? 0))
  const sinpeDiff = sinpe === "" ? null : round2(Number(sinpe) - sinpeCharged)

  return (
    <div>
      {back}
      {title}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <DenominationCount counts={counts} onChange={setCounts} />

        <div className="space-y-4 self-start">
          <div className="stk-card text-sm">
            <dl className="space-y-1">
              <Row label={t("pos.close.opening")} value={money.format(s.openingAmount)} />
              <Row label={t("pos.close.cashSales")} value={money.format(s.payments.CASH ?? 0)} />
              {s.collections?.CASH > 0 && <Row label={t("pos.close.cashCollections")} value={money.format(s.collections.CASH)} />}
              {s.refunds?.CASH > 0 && <Row label={t("pos.close.cashRefunds")} value={`− ${money.format(s.refunds.CASH)}`} />}
              <Row label={t("pos.cashIn")} value={money.format(s.cashIn)} />
              <Row label={t("pos.cashOut")} value={`− ${money.format(s.cashOut)}`} />
              <Row label={t("pos.close.expected")} value={money.format(report.expectedCash)} className="border-t border-border pt-2 font-semibold" />
              <Row label={t("pos.close.counted")} value={money.format(counted)} className="font-semibold" />
            </dl>
            <div className={cn("mt-2 flex items-baseline justify-between rounded-lg px-3 py-2", BOX[tone(diff)])}>
              <span>{diff === 0 ? t("pos.close.balanced") : diff > 0 ? t("pos.close.over") : t("pos.close.short")}</span>
              <span className="font-mono text-lg font-semibold">{money.format(Math.abs(diff))}</span>
            </div>
          </div>

          <div className="stk-card space-y-2 text-sm">
            <dl className="space-y-1">
              <Row label={t("pos.close.cardCharged")} value={money.format(cardCharged)} />
            </dl>
            <Label htmlFor="card-declared">{t("pos.close.cardDeclared")}</Label>
            <Input id="card-declared" type="number" min={0} step="any" className="font-mono" value={card} onChange={(e) => setCard(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("pos.close.cardDeclaredHint")}</p>
            {cardDiff !== null && cardDiff !== 0 && (
              <p className="text-sm font-medium text-[var(--stk-warn)]">{t("pos.close.cardMismatch", { amount: money.format(cardDiff) })}</p>
            )}
          </div>

          <div className="stk-card space-y-2 text-sm">
            <dl className="space-y-1">
              <Row label={t("pos.close.sinpeCharged")} value={money.format(sinpeCharged)} />
            </dl>
            <Label htmlFor="sinpe-declared">{t("pos.close.sinpeDeclared")}</Label>
            <Input id="sinpe-declared" type="number" min={0} step="any" className="font-mono" value={sinpe} onChange={(e) => setSinpe(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("pos.close.sinpeDeclaredHint")}</p>
            {sinpeDiff !== null && sinpeDiff !== 0 && (
              <p className="text-sm font-medium text-[var(--stk-warn)]">{t("pos.close.sinpeMismatch", { amount: money.format(sinpeDiff) })}</p>
            )}
          </div>

          {report.closingNote && <p className="text-sm text-muted-foreground">{t("pos.report.note", { note: report.closingNote })}</p>}
          <div className="space-y-2">
            <Label htmlFor="reconcile-note">{t("pos.close.note")}</Label>
            <Input id="reconcile-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("pos.close.notePlaceholder")} />
          </div>
          {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("pos.error"))}</p>}
          <Button size="lg" className="w-full" onClick={() => setConfirm(true)} disabled={save.isPending}>
            {t("cashClosings.save")}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cashClosings.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {diff === 0 ? t("pos.close.confirmBalanced") : t("pos.close.confirmDiff", { amount: money.format(diff) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => save.mutate()} disabled={save.isPending}>{t("cashClosings.save")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Row({ label, value, className }) {
  return (
    <div className={cn("flex justify-between gap-3", className)}>
      <dt>{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  )
}
