import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Check, CircleAlert, Dices, Loader2, UsersRound } from "lucide-react"
import { getCashCodeTeam, assignUserPin } from "@/api/users"
import { apiErrorMessage } from "@/lib/api-error"
import { isObviousPin, randomPin } from "@/lib/pin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Estado del código de una persona: sin código / vencido / vence pronto / vigente
function codeState(u, t) {
  const date = u.pinExpiresAt && new Date(u.pinExpiresAt).toLocaleDateString()
  if (!u.hasPin) return { tone: "crit", text: t("profile.team.state.none") }
  if (u.pinExpired) return { tone: "crit", text: t("profile.team.state.expired", { date }) }
  if (u.pinExpiringSoon) return { tone: "warn", text: t("profile.team.state.soon", { date }) }
  return { tone: "ok", text: t("profile.team.state.valid", { date }) }
}

// "Códigos del equipo": el admin asigna el código de caja de cualquiera; el encargado, el de sus cajeros.
// Se elige la persona y el código (escrito o al azar). Se muestra una sola vez para entregarlo; a la
// persona le llega un aviso.
export function TeamCodesCard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: team = [], isLoading } = useQuery({ queryKey: ["cash-codes"], queryFn: getCashCodeTeam })
  const [userId, setUserId] = useState("")
  const [pin, setPin] = useState("")
  const assign = useMutation({
    mutationFn: () => assignUserPin(userId, pin),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cash-codes"] }),
  })

  const selected = team.find((u) => u.id === userId)
  const items = team.map((u) => ({ value: u.id, label: `${u.name} · ${t(`companies.roles.${u.role}`)}` }))
  const invalid = pin !== "" && (!/^\d{4,6}$/.test(pin) || isObviousPin(pin))

  function pick(id) {
    setUserId(id)
    setPin("")
    assign.reset()
  }

  return (
    <section className="stk-card prof-card">
      <div className="prof-card-head">
        <span className="prof-card-icon"><UsersRound className="w-[18px] h-[18px]" aria-hidden="true" /></span>
        <div>
          <h2>{t("profile.team.title")}</h2>
          <p>{t("profile.team.hint")}</p>
        </div>
      </div>

      {!isLoading && team.length === 0 ? (
        <p className="prof-hint">{t("profile.team.empty")}</p>
      ) : (
        <form
          className="prof-form"
          onSubmit={(e) => {
            e.preventDefault()
            assign.mutate()
          }}
        >
          <div className="prof-field">
            <label htmlFor="team-member">{t("profile.team.member")}</label>
            <Select items={items} value={userId} onValueChange={pick}>
              <SelectTrigger id="team-member" className="w-full">
                <SelectValue placeholder={t("profile.team.choose")} />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && <p className={`prof-hint prof-tone--${codeState(selected, t).tone}`}>{codeState(selected, t).text}</p>}
          </div>

          <div className="prof-field">
            <label htmlFor="team-pin">{t("profile.team.code")}</label>
            <div className="flex gap-2">
              <Input
                id="team-pin"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                className={pin ? "font-mono tracking-widest" : undefined}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                aria-invalid={invalid}
                aria-describedby="team-pin-hint"
                placeholder={t("profile.team.codePlaceholder")}
              />
              <Button type="button" variant="outline" onClick={() => setPin(randomPin())} title={t("profile.team.random")}>
                <Dices />
                <span className="hidden sm:inline">{t("profile.team.random")}</span>
              </Button>
            </div>
            <p id="team-pin-hint" className="prof-hint">{invalid ? t("profile.team.invalid") : t("profile.team.codeHint")}</p>
          </div>

          {assign.isError && (
            <p role="alert" className="prof-msg prof-msg--err">
              <CircleAlert className="w-4 h-4 shrink-0" />
              {apiErrorMessage(assign.error, t("profile.team.error"))}
            </p>
          )}
          {assign.isSuccess && (
            <div role="status" className="prof-msg prof-msg--ok flex-col items-start">
              <span className="flex items-center gap-2"><Check className="w-4 h-4 shrink-0" />{t("profile.team.done", { name: selected?.name })}</span>
              <span className="font-mono text-2xl font-semibold tracking-[0.35em]">{assign.data.pin}</span>
              <span className="text-xs">{t("profile.team.once")}</span>
            </div>
          )}
          <div>
            <Button type="submit" disabled={!userId || invalid || assign.isPending}>
              {assign.isPending && <Loader2 className="animate-spin" />}
              {pin ? t("profile.team.assign") : t("profile.team.assignRandom")}
            </Button>
          </div>
        </form>
      )}

      {team.length > 0 && (
        <ul className="prof-team" aria-label={t("profile.team.listLabel")}>
          {team.map((u) => {
            const s = codeState(u, t)
            return (
              <li key={u.id}>
                <span className="prof-team-name">{u.name}<span className="prof-team-role"> · {t(`companies.roles.${u.role}`)}</span></span>
                <span className={`prof-team-state prof-tone--${s.tone}`}>{s.text}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
