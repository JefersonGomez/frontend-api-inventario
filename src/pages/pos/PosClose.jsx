import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate } from "react-router-dom"
import { ArrowLeft, CheckCircle2, Printer } from "lucide-react"
import { closeSession, getSession } from "@/api/pos"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { CashReport } from "@/components/pos/CashReport"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// /pos/cierre — paso 1, cierre ciego: el cajero cierra sin contar ni ver el efectivo esperado, imprime
// el reporte del turno y lleva el efectivo a la jefa de caja, que hace el arqueo con él (Arqueos).
export function PosClose() {
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const { data: session, isLoading } = useQuery({ queryKey: ["cash-session"], queryFn: getSession })
  const [note, setNote] = useState("")
  const [confirm, setConfirm] = useState(false)
  const [report, setReport] = useState(null)

  const close = useMutation({
    mutationFn: () => closeSession(session.id, note.trim() ? { note: note.trim() } : {}),
    onSuccess: (r) => {
      setReport(r)
      setConfirm(false)
      queryClient.setQueryData(["cash-session"], null)
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] })
      queryClient.invalidateQueries({ queryKey: ["cash-sessions"] })
    },
    onError: () => setConfirm(false),
  })

  if (report) {
    return (
      <div className="min-h-dvh bg-background px-4 py-8">
        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <CheckCircle2 className="h-10 w-10 text-[var(--stk-ok)]" aria-hidden />
            <h1 className="text-2xl font-semibold">{t("pos.close.done")}</h1>
            <p className="text-muted-foreground">{t("pos.close.doneHint")}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.print()}>
                <Printer />
                {t("pos.close.printReport")}
              </Button>
              <Button variant="outline" render={<Link to="/pos/abrir" />}>{t("pos.close.openAgain")}</Button>
              <Button variant="ghost" render={<Link to="/" />}>{t("pos.backToApp")}</Button>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-white p-2">
            <CashReport report={report} />
          </div>
        </div>
      </div>
    )
  }
  if (isLoading) return null
  if (!session) return <Navigate to="/pos/abrir" replace />
  const s = session.summary

  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-xl">
        <Button variant="ghost" size="sm" render={<Link to="/pos" />} className="mb-4">
          <ArrowLeft />
          {t("pos.close.back")}
        </Button>
        <h1 className="text-2xl font-semibold">{t("pos.close.title")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {session.register.name} · {session.register.location.name} · {t("pos.close.since", { date: new Date(session.openedAt).toLocaleString("es-CR") })}
        </p>

        <div className="stk-card space-y-4">
          <dl className="grid grid-cols-2 gap-3">
            <Stat label={t("pos.counters.sales")} value={s.salesCount} />
            <Stat label={t("pos.counters.total")} value={money.format(s.salesTotal)} />
            <Stat label={t("pos.methods.CARD")} value={money.format(s.payments.CARD ?? 0)} />
            <Stat label={t("pos.methods.SINPE")} value={money.format(s.payments.SINPE ?? 0)} />
            <Stat label={t("pos.cashIn")} value={money.format(s.cashIn)} />
            <Stat label={t("pos.cashOut")} value={money.format(s.cashOut)} />
          </dl>
          <p className="rounded-lg bg-[var(--stk-accent-soft)] px-3 py-2 text-sm text-[var(--stk-accent-strong)]">{t("pos.close.blindHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="close-note">{t("pos.close.note")}</Label>
            <Input id="close-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("pos.close.notePlaceholder")} />
          </div>
          {close.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(close.error, t("pos.error"))}</p>}
          <Button size="lg" className="w-full" onClick={() => setConfirm(true)} disabled={close.isPending}>
            {t("pos.close.submit")}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pos.close.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("pos.close.confirmBlind")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => close.mutate()} disabled={close.isPending}>{t("pos.close.submit")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-lg font-semibold">{value}</dd>
    </div>
  )
}
