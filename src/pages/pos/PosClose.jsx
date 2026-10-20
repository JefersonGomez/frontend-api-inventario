import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate } from "react-router-dom"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { closeSession, getSession } from "@/api/pos"
import { useMoney } from "@/hoocks/useMoney"
import { DENOMINATIONS, sumDenominations } from "@/lib/pos"
import { apiErrorMessage } from "@/lib/api-error"
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
const TEXT = { ok: "text-[var(--stk-ok)]", warn: "text-[var(--stk-warn)]", crit: "text-[var(--stk-crit)]" }
const BOX = { ok: "bg-[var(--stk-ok-bg)] text-[var(--stk-ok)]", warn: "bg-[var(--stk-warn-bg)] text-[var(--stk-warn)]", crit: "bg-[var(--stk-crit-bg)] text-[var(--stk-crit)]" }

// /pos/cierre: arqueo por denominación. El esperado lo calcula el servidor (inicial + ventas en
// efectivo + entradas − retiros); la diferencia queda guardada (negativo = faltante).
export function PosClose() {
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const { data: session, isLoading } = useQuery({ queryKey: ["cash-session"], queryFn: getSession })
  const [counts, setCounts] = useState({})
  const [note, setNote] = useState("")
  const [confirm, setConfirm] = useState(false)
  const [result, setResult] = useState(null)

  const close = useMutation({
    mutationFn: () => closeSession(session.id, { denominations: Object.fromEntries(Object.entries(counts).filter(([, n]) => n > 0)), ...(note.trim() && { note: note.trim() }) }),
    onSuccess: (r) => {
      setResult(r)
      setConfirm(false)
      queryClient.setQueryData(["cash-session"], null)
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] })
    },
    onError: () => setConfirm(false),
  })

  if (result) {
    const k = tone(result.difference)
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-4">
        <div className="stk-card w-full max-w-md space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--stk-ok)]" aria-hidden />
          <h1 className="text-xl font-semibold">{t("pos.close.done")}</h1>
          <dl className="space-y-1 text-left text-sm">
            <Row label={t("pos.close.expected")} value={money.format(result.expectedCash)} />
            <Row label={t("pos.close.counted")} value={money.format(result.countedCash)} />
            <Row label={t("pos.close.difference")} value={money.format(result.difference)} className={cn("font-semibold", TEXT[k])} />
          </dl>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" render={<Link to="/pos/abrir" />}>{t("pos.close.openAgain")}</Button>
            <Button className="flex-1" render={<Link to="/" />}>{t("pos.backToApp")}</Button>
          </div>
        </div>
      </div>
    )
  }
  if (isLoading) return null
  if (!session) return <Navigate to="/pos/abrir" replace />

  const s = session.summary
  const { bills, coins } = DENOMINATIONS[money.currency] ?? DENOMINATIONS.CRC
  const counted = sumDenominations(counts)
  const diff = Math.round((counted - s.expectedCash) * 100) / 100
  const k = tone(diff)

  const group = (title, values) => (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">{title}</legend>
      {values.map((v) => (
        <div key={v} className="grid grid-cols-[1fr_88px_1fr] items-center gap-3">
          <Label htmlFor={`d-${v}`} className="font-mono">{money.format(v)}</Label>
          <Input
            id={`d-${v}`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="text-center font-mono"
            placeholder="0"
            value={counts[v] ?? ""}
            onChange={(e) => setCounts({ ...counts, [v]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
          />
          <span className="text-right font-mono text-sm text-muted-foreground">{money.format(v * (counts[v] ?? 0))}</span>
        </div>
      ))}
    </fieldset>
  )

  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" size="sm" render={<Link to="/pos" />} className="mb-4">
          <ArrowLeft />
          {t("pos.close.back")}
        </Button>
        <h1 className="text-2xl font-semibold">{t("pos.close.title")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {session.register.name} · {session.register.location.name} · {t("pos.close.since", { date: new Date(session.openedAt).toLocaleString("es-CR") })}
        </p>

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="stk-card grid gap-6 sm:grid-cols-2">
            {group(t("pos.close.bills"), bills)}
            {group(t("pos.close.coins"), coins)}
          </div>

          <div className="space-y-4 self-start">
            <div className="stk-card text-sm">
              <dl className="space-y-1">
              <Row label={t("pos.close.opening")} value={money.format(s.openingAmount)} />
              <Row label={t("pos.close.cashSales")} value={money.format(s.payments.CASH ?? 0)} />
              <Row label={t("pos.cashIn")} value={money.format(s.cashIn)} />
              <Row label={t("pos.cashOut")} value={`− ${money.format(s.cashOut)}`} />
              <Row label={t("pos.close.expected")} value={money.format(s.expectedCash)} className="border-t border-border pt-2 font-semibold" />
              <Row label={t("pos.close.counted")} value={money.format(counted)} className="font-semibold" />
              </dl>
              <div className={cn("mt-2 flex items-baseline justify-between rounded-lg px-3 py-2", BOX[k])}>
                <span>{diff === 0 ? t("pos.close.balanced") : diff > 0 ? t("pos.close.over") : t("pos.close.short")}</span>
                <span className="font-mono text-lg font-semibold">{money.format(Math.abs(diff))}</span>
              </div>
            </div>
            <div className="stk-card text-sm">
              <p className="mb-1 font-medium">{t("pos.close.otherMethods")}</p>
              <dl className="space-y-1">
              <Row label={t("pos.methods.CARD")} value={money.format(s.payments.CARD ?? 0)} />
              <Row label={t("pos.methods.SINPE")} value={money.format(s.payments.SINPE ?? 0)} />
              <Row label={t("pos.close.sales", { count: s.salesCount })} value={money.format(s.salesTotal)} className="border-t border-border pt-2" />
              </dl>
            </div>
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
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pos.close.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {diff === 0 ? t("pos.close.confirmBalanced") : t("pos.close.confirmDiff", { amount: money.format(diff) })}
            </AlertDialogDescription>
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

function Row({ label, value, className }) {
  return (
    <div className={cn("flex justify-between gap-3", className)}>
      <dt>{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  )
}
