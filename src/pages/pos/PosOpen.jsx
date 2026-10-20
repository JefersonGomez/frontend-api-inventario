import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { ArrowLeft, KeyRound, Lock, Monitor } from "lucide-react"
import { getRegisters, getSession, openSession, renewCode } from "@/api/pos"
import { usePermissions } from "@/hoocks/usePermissions"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useRegisterLocation } from "@/hoocks/useRegisterLocation"

// /pos/abrir: elegir caja, monto inicial y código de caja propio. Código vencido = caja bloqueada,
// se renueva desde el perfil o en el momento con el código del encargado.
export function PosOpen() {
  const { t } = useTranslation()
  const money = useMoney()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pinLocation = useRegisterLocation()
  const { code } = usePermissions()
  const session = useQuery({ queryKey: ["cash-session"], queryFn: getSession })
  const { data: registers = [], isLoading } = useQuery({ queryKey: ["cash-registers"], queryFn: getRegisters })
  const [registerId, setRegisterId] = useState(null)
  const [amount, setAmount] = useState("")
  const [pin, setPin] = useState("")
  const [blocked, setBlocked] = useState(false)
  const [managerPin, setManagerPin] = useState("")
  const [newPin, setNewPin] = useState(null)

  const available = registers.filter((r) => r.isActive)
  const selected = available.find((r) => r.id === registerId) ?? available.find((r) => !r.sessions.length)

  const open = useMutation({
    mutationFn: () => openSession({ registerId: selected.id, pin, openingAmount: Number(amount) || 0 }),
    onSuccess: (s) => {
      queryClient.setQueryData(["cash-session"], s)
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] })
      pinLocation(s.register.location.id)
      navigate("/pos", { replace: true })
    },
    onError: (e) => {
      if (e.response?.data?.code === "PIN_EXPIRED") setBlocked(true)
      setPin("")
    },
  })
  const renew = useMutation({
    mutationFn: () => renewCode(managerPin),
    onSuccess: (r) => {
      setNewPin(r.pin)
      setManagerPin("")
      queryClient.invalidateQueries({ queryKey: ["me"] })
    },
  })

  if (session.data) return <Navigate to="/pos" replace />
  const isBlocked = blocked || code.pinExpired

  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" render={<Link to="/" />} className="mb-4">
          <ArrowLeft />
          {t("pos.backToApp")}
        </Button>
        <h1 className="text-2xl font-semibold">{t("pos.open.title")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t("pos.open.subtitle")}</p>

        {isLoading ? null : available.length === 0 ? (
          <div className="stk-card text-center">
            <Monitor className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">{t("pos.open.noRegisters")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("pos.open.noRegistersHint")}</p>
          </div>
        ) : isBlocked ? (
          <div className="stk-card max-w-md space-y-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[var(--stk-crit-bg)] text-[var(--stk-crit)]">
                <Lock className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold">{t("pos.open.lockedTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("pos.open.lockedHint")}</p>
              </div>
            </div>

            {newPin ? (
              <div className="rounded-xl bg-[var(--stk-ok-bg)] p-4 text-center">
                <p className="text-sm text-[var(--stk-ok)]">{t("pos.open.newPin")}</p>
                <p className="my-2 font-mono text-3xl font-semibold tracking-[0.3em]">{newPin}</p>
                <p className="text-xs text-muted-foreground">{t("pos.open.newPinHint")}</p>
                <Button
                  className="mt-3"
                  onClick={() => {
                    setNewPin(null)
                    setBlocked(false)
                    open.reset()
                  }}
                >
                  {t("pos.open.continue")}
                </Button>
              </div>
            ) : (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  renew.mutate()
                }}
              >
                <Label htmlFor="manager-pin">{t("pos.open.managerPin")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="manager-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    className="font-mono tracking-widest"
                    value={managerPin}
                    onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ""))}
                  />
                  <Button type="submit" disabled={managerPin.length < 4 || renew.isPending}>
                    <KeyRound />
                    {t("pos.open.renew")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("pos.open.managerPinHint")}</p>
                {renew.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(renew.error, t("pos.error"))}</p>}
                <p className="pt-2 text-sm">
                  <Link to="/profile?tab=cash" className="text-[var(--stk-accent)] underline-offset-4 hover:underline">
                    {t("pos.open.renewInProfile")}
                  </Link>
                </p>
              </form>
            )}
          </div>
        ) : (
          <form
            className="grid gap-6 md:grid-cols-[1fr_320px]"
            onSubmit={(e) => {
              e.preventDefault()
              open.mutate()
            }}
          >
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t("pos.open.chooseRegister")}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {available.map((r) => {
                  const busy = r.sessions[0]
                  const active = selected?.id === r.id
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={!!busy}
                      onClick={() => setRegisterId(r.id)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-xl border bg-card p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                        active ? "border-[var(--stk-accent)] ring-2 ring-[var(--stk-accent)]/30" : "border-border hover:border-[var(--stk-accent)]/50"
                      )}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Monitor className="h-4 w-4 text-muted-foreground" aria-hidden />
                        {r.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {r.location.name} · <span className="font-mono">{r.location.code ?? "001"}-{r.terminalCode}</span>
                      </span>
                      <span className={cn("mt-2 block text-xs", busy ? "text-[var(--stk-warn)]" : "text-[var(--stk-ok)]")}>
                        {busy ? t("registers.openBy", { name: busy.openedBy.name }) : t("pos.open.free")}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="stk-card space-y-4 self-start">
              <div className="space-y-2">
                <Label htmlFor="opening-amount">{t("pos.open.amount")}</Label>
                <Input
                  id="opening-amount"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  className="font-mono text-lg"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("pos.open.amountHint", { amount: money.format(Number(amount) || 0) })}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cash-pin">{t("pos.open.pin")}</Label>
                <Input
                  id="cash-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  className="font-mono text-lg tracking-widest"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                />
                {!code.hasPin && <p className="text-xs text-[var(--stk-warn)]">{t("pos.open.noPin")}</p>}
              </div>
              {open.isError && !blocked && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(open.error, t("pos.error"))}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={!selected || pin.length < 4 || open.isPending}>
                {t("pos.open.submit")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
