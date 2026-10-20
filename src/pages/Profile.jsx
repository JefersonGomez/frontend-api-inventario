import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import {
  Building2, CalendarDays, Camera, Check, CircleAlert, Crown, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Pencil, UserRound, X,
} from "lucide-react"
import { getProfile, updateAvatar, changePassword, updateProfile, setMyPin } from "@/api/profile"
import { usePermissions } from "@/hoocks/usePermissions"
import { useSearchParams } from "react-router-dom"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TeamCodesCard } from "@/components/profile/TeamCodesCard"
import { getCompany, getMyCompanies } from "@/api/company"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_URL } from "@/api/client"
import { apiErrorMessage } from "@/lib/api-error"
import "./Profile.css"

const initialsOf = (name = "") =>
  name.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase() || "?"

// 0–4 según largo y variedad. Solo orienta: la regla real (8+ y no común) la valida el backend.
function strengthOf(pw) {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if ((/[a-z]/.test(pw) && /[A-Z]/.test(pw)) || /\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return pw.length < 8 ? 1 : Math.max(score, 1)
}
const STRENGTH = ["", "weak", "fair", "good", "strong"]

// Dato editable en línea: Enter guarda, Escape cancela. El botón "Editar" siempre visible (también en celular).
function EditableRow({ label, value, type = "text", onSave, saving }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")

  const cancel = () => {
    setDraft(value ?? "")
    setEditing(false)
  }
  const save = () => {
    const next = draft.trim()
    if (!next || next === value) return cancel()
    onSave(next, () => setEditing(false))
  }

  return (
    <div className="prof-row">
      <div className="prof-row-main">
        <span className="prof-label">{label}</span>
        {editing ? (
          <Input
            type={type}
            value={draft}
            autoFocus
            aria-label={label}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save()
              if (e.key === "Escape") cancel()
            }}
          />
        ) : (
          <p className={`prof-value ${value ? "" : "prof-value--empty"}`}>{value || t("profile.not_specified")}</p>
        )}
      </div>
      <div className="prof-row-actions">
        {editing ? (
          <>
            <Button size="icon-sm" variant="outline" onClick={cancel} aria-label={t("common.cancel")} title={t("common.cancel")}>
              <X />
            </Button>
            <Button size="icon-sm" onClick={save} disabled={saving} aria-label={t("common.save")} title={t("common.save")}>
              {saving ? <Loader2 className="animate-spin" /> : <Check />}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil />
            {t("common.edit")}
          </Button>
        )}
      </div>
    </div>
  )
}

function PasswordInput({ id, value, onChange, autoComplete, minLength, placeholder }) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  return (
    <div className="prof-pass">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={72}
        placeholder={placeholder}
        required
      />
      <button
        type="button"
        className="prof-eye"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("profile.hide_password") : t("profile.show_password")}
        title={visible ? t("profile.hide_password") : t("profile.show_password")}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

// Mi código de caja: abre mi caja y, si mi rol lo permite, autorizo en la pantalla de otro. Lo asigna el
// administrador; puedo cambiarlo y queda fijo hasta que vence. Vencido no sirve hasta renovarlo.
function PinCard({ code, isAdmin }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [pin, setPin] = useState("")
  const [password, setPassword] = useState("")
  const save = useMutation({
    mutationFn: () => setMyPin(pin, password),
    onSuccess: () => {
      setPin("")
      setPassword("")
      queryClient.invalidateQueries({ queryKey: ["me"] })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const date = (d) => new Date(d).toLocaleDateString()
  // sin código (lo asigna el admin) o recién cambiado: no hay formulario
  const blocked = !code.hasPin && !isAdmin ? t("profile.pin.askAdmin")
    : code.pinLockedUntil ? t("profile.pin.locked", { date: date(code.pinLockedUntil) })
    : null

  return (
    <section className="stk-card prof-card">
      <div className="prof-card-head">
        <span className="prof-card-icon"><LockKeyhole className="w-[18px] h-[18px]" aria-hidden="true" /></span>
        <div>
          <h2>{t("profile.pin.title")}</h2>
          <p>{t("profile.pin.hint")}</p>
        </div>
      </div>
      {code.hasPin && code.pinExpired && (
        <p role="alert" className="prof-notice prof-notice--crit"><CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />{t("profile.pin.expired")}</p>
      )}
      {code.pinExpiringSoon && (
        <p className="prof-notice prof-notice--warn"><CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />{t("profile.pin.expiringSoon", { date: date(code.pinExpiresAt) })}</p>
      )}
      {code.hasPin && !code.pinExpired && !code.pinExpiringSoon && (
        <p className="prof-hint">{t("profile.pin.validUntil", { date: date(code.pinExpiresAt) })}</p>
      )}
      {save.isSuccess && (
        <p role="status" className="prof-msg prof-msg--ok"><Check className="w-4 h-4 shrink-0" />{t("profile.pin.saved")}</p>
      )}
      {blocked ? (
        <p className="prof-hint">{blocked}</p>
      ) : (
        <form
          className="prof-form"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <p className="prof-hint">{code.hasPin ? t("profile.pin.canChange") : t("profile.pin.none")}</p>
          <div className="prof-field">
            <label htmlFor="auth-pin">{t("profile.pin.pin")}</label>
            <Input
              id="auth-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              pattern="\d{4,6}"
              minLength={4}
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          <div className="prof-field">
            <label htmlFor="pin-password">{t("profile.pin.password")}</label>
            <PasswordInput id="pin-password" value={password} onChange={setPassword} autoComplete="current-password" />
          </div>
          {save.isError && (
            <p role="alert" className="prof-msg prof-msg--err">
              <CircleAlert className="w-4 h-4 shrink-0" />
              {apiErrorMessage(save.error, t("profile.pin.error"))}
            </p>
          )}
          <div>
            <Button type="submit" disabled={save.isPending || pin.length < 4 || !password}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
              {t("profile.pin.save")}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

export function Profile() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { updateUser } = useAuth()
  const { can, code } = usePermissions()
  const [params, setParams] = useSearchParams()
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const { data: profile, isError } = useQuery({ queryKey: ["profile"], queryFn: getProfile })
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: getCompany })
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: getMyCompanies })

  const avatarMutation = useMutation({
    mutationFn: (file) => updateAvatar(file),
    onSuccess: (data) => {
      setAvatarBroken(false)
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      updateUser({ avatarUrl: data.avatarUrl })
    },
  })

  const profileMutation = useMutation({
    mutationFn: ({ name, email }) => updateProfile(name, email),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      updateUser({ name: data.name, email: data.email })
    },
  })

  const passwordMutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("")
      setNewPassword("")
    },
  })

  if (isError) {
    return <p role="alert" className="prof-msg prof-msg--err"><CircleAlert className="w-4 h-4" />{t("profile.errors.load_failed")}</p>
  }
  if (!profile) {
    return (
      <div className="prof" aria-busy="true">
        <div className="prof-skeleton" />
      </div>
    )
  }

  const saveField = (field) => (next, done) =>
    profileMutation.mutate(
      { name: profile.name, email: profile.email, [field]: next },
      { onSuccess: done }
    )

  // pestaña en la URL: los avisos del código de caja llevan a /profile?tab=cash
  const needsCode = can("cash.manage") || can("sales.discount") || can("sales.void") || can("sales.negative")
  const managesCodes = can("users.manage") || can("sales.discount") || can("sales.void") || can("sales.negative")
  const showCash = (needsCode || managesCodes) && !profile.isPlatformOwner
  const showCompanies = companies.length > 0 && !profile.isPlatformOwner
  const tabs = ["account", "security", ...(showCash ? ["cash"] : []), ...(showCompanies ? ["companies"] : [])]
  const tab = tabs.includes(params.get("tab")) ? params.get("tab") : "account"
  const changeTab = (next) => setParams(next === "account" ? {} : { tab: next }, { replace: true })

  const level = strengthOf(newPassword)
  const memberSince = new Date(profile.createdAt).toLocaleDateString(i18n.language, { month: "long", year: "numeric" })
  const showPhoto = profile.avatarUrl && !avatarBroken

  return (
    <div className="prof">
      <div>
        <h1>{t("profile.title")}</h1>
        <p className="prof-sub">{t("profile.subtitle")}</p>
      </div>

      {/* Tarjeta principal: quién eres y dónde estás */}
      <section className="prof-hero" aria-label={t("profile.title")}>
        <div className="prof-avatar">
          {showPhoto ? (
            <img
              className="prof-avatar-img"
              src={`${API_URL}${profile.avatarUrl}`}
              alt={profile.name}
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <div className="prof-avatar-img" aria-hidden="true">{initialsOf(profile.name)}</div>
          )}
          {avatarMutation.isPending && (
            <div className="prof-avatar-busy">
              <Loader2 className="w-7 h-7 animate-spin" aria-label={t("profile.uploading_image")} />
            </div>
          )}
          <label className="prof-avatar-btn" title={t("profile.changePhoto")}>
            <Camera className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">{t("profile.changePhoto")}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={avatarMutation.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) avatarMutation.mutate(file)
                e.target.value = ""
              }}
            />
          </label>
        </div>

        <div className="prof-hero-body">
          <h2 className="prof-name">{profile.name}</h2>
          <p className="prof-email">{profile.email}</p>
          <div className="prof-chips">
            <span className="prof-chip prof-chip--accent">
              {profile.isPlatformOwner ? t("topbar.platformMode") : t(`companies.roles.${profile.role}`)}
            </span>
            {company?.name && !profile.isPlatformOwner && (
              <span className="prof-chip">
                <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                {company.name}
              </span>
            )}
            <span className="prof-chip">
              <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
              {t("profile.member_since", { date: memberSince })}
            </span>
          </div>
          {avatarMutation.isError ? (
            <p role="alert" className="prof-photo-error">{apiErrorMessage(avatarMutation.error, t("profile.errors.photo_failed"))}</p>
          ) : (
            <p className="prof-photo-hint">{t("profile.photo_hint")}</p>
          )}
        </div>
      </section>

      <Tabs value={tab} onValueChange={changeTab} className="prof-tabs">
        <TabsList className="w-full sm:w-fit overflow-x-auto">
          <TabsTrigger value="account"><UserRound />{t("profile.tabs.account")}</TabsTrigger>
          <TabsTrigger value="security"><KeyRound />{t("profile.tabs.security")}</TabsTrigger>
          {showCash && <TabsTrigger value="cash"><LockKeyhole />{t("profile.tabs.cash")}</TabsTrigger>}
          {showCompanies && <TabsTrigger value="companies"><Building2 />{t("profile.tabs.companies")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="account" className="max-w-3xl">
          {/* Datos personales */}
          <section className="stk-card prof-card">
            <div className="prof-card-head">
              <span className="prof-card-icon"><UserRound className="w-[18px] h-[18px]" aria-hidden="true" /></span>
              <div>
                <h2>{t("profile.info_card_title")}</h2>
                <p>{t("profile.info_card_hint")}</p>
              </div>
            </div>
            <div className="prof-rows">
              <EditableRow label={t("profile.labels.full_name")} value={profile.name} saving={profileMutation.isPending} onSave={saveField("name")} />
              <EditableRow label={t("profile.labels.email")} value={profile.email} type="email" saving={profileMutation.isPending} onSave={saveField("email")} />
              {profile.phone && (
                <div className="prof-row">
                  <div className="prof-row-main">
                    <span className="prof-label">{t("profile.labels.phone")}</span>
                    <p className="prof-value">{profile.phone}</p>
                  </div>
                </div>
              )}
            </div>
            {profileMutation.isError && (
              <p role="alert" className="prof-msg prof-msg--err">
                <CircleAlert className="w-4 h-4 shrink-0" />
                {apiErrorMessage(profileMutation.error, t("profile.errors.update_failed"))}
              </p>
            )}
            {profileMutation.isSuccess && (
              <p role="status" className="prof-msg prof-msg--ok"><Check className="w-4 h-4 shrink-0" />{t("profile.success.updated")}</p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="security" className="max-w-3xl">
          {/* Seguridad */}
          <section className="stk-card prof-card">
            <div className="prof-card-head">
              <span className="prof-card-icon"><KeyRound className="w-[18px] h-[18px]" aria-hidden="true" /></span>
              <div>
                <h2>{t("profile.security_card_title")}</h2>
                <p>{t("profile.security_card_hint")}</p>
              </div>
            </div>
            <form
              className="prof-form"
              onSubmit={(e) => {
                e.preventDefault()
                passwordMutation.mutate()
              }}
            >
              <div className="prof-field">
                <label htmlFor="current-password">{t("profile.labels.current_password")}</label>
                <PasswordInput id="current-password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
              </div>
              <div className="prof-field">
                <label htmlFor="new-password">{t("profile.labels.new_password")}</label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder={t("profile.placeholders.min_chars")}
                />
                <div className="prof-meter" data-level={level} aria-hidden="true">
                  <span /><span /><span /><span />
                </div>
                <p className="prof-hint" aria-live="polite">
                  {level ? t(`profile.strength.${STRENGTH[level]}`) : t("profile.password_hint")}
                </p>
              </div>
              {passwordMutation.isError && (
                <p role="alert" className="prof-msg prof-msg--err">
                  <CircleAlert className="w-4 h-4 shrink-0" />
                  {apiErrorMessage(passwordMutation.error, t("profile.errors.password_failed"))}
                </p>
              )}
              {passwordMutation.isSuccess && (
                <p role="status" className="prof-msg prof-msg--ok"><Check className="w-4 h-4 shrink-0" />{t("profile.success.password_updated")}</p>
              )}
              <div>
                <Button type="submit" disabled={passwordMutation.isPending || !currentPassword || newPassword.length < 8}>
                  {passwordMutation.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
                  {passwordMutation.isPending ? t("common.updating") : t("profile.buttons.change_password")}
                </Button>
              </div>
            </form>
          </section>
        </TabsContent>

        {showCash && (
          <TabsContent value="cash">
            <div className="prof-grid">
              {needsCode && <PinCard code={code} isAdmin={can("users.manage")} />}
              {managesCodes && <TeamCodesCard />}
            </div>
          </TabsContent>
        )}

        {showCompanies && (
          <TabsContent value="companies">
            <section className="stk-card prof-card">
              <div className="prof-card-head">
                <span className="prof-card-icon"><Building2 className="w-[18px] h-[18px]" aria-hidden="true" /></span>
                <div>
                  <h2>{t("profile.companies_title")}</h2>
                  <p>{t("profile.companies_hint")}</p>
                </div>
              </div>
              <ul className="prof-companies">
                {companies.map((c) => {
                  const active = c.id === company?.id
                  return (
                    <li key={c.id} className={`prof-company ${active ? "prof-company--active" : ""}`}>
                      <span className="prof-company-mark" aria-hidden="true">{initialsOf(c.name)}</span>
                      <div className="prof-company-body">
                        <p className="prof-company-name" title={c.name}>{c.name}</p>
                        <p className="prof-company-meta">
                          {t(`companies.roles.${c.role}`)}
                          {c.isOwner && <> · <Crown className="inline w-3 h-3 -mt-0.5" aria-hidden="true" /> {t("profile.owner")}</>}
                          {active && <> · {t("profile.active_company")}</>}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default Profile
