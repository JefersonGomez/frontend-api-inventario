import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getInvitationByToken, acceptInvitation } from "@/api/invitations"
import { useAuth } from "@/context/AuthContext"
import { BoxesIllustration } from "@/components/BoxesIllustration"
import "./Register.css"

// Página pública del link de invitación: cuenta nueva (nombre + contraseña) o existente (contraseña)
export function AcceptInvite() {
  const { t } = useTranslation()
  const { token } = useParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  const { data: inv, isLoading, isError } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => getInvitationByToken(token),
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: () => acceptInvitation(token, inv.userExists ? { password } : { name: name.trim(), password }),
    onSuccess: (session) => {
      login(session.token, session.refreshToken, session.user, session.company.id)
      navigate("/")
    },
  })

  const mismatch = !inv?.userExists && confirm.length > 0 && confirm !== password
  const apiError = mutation.error?.response?.data?.error

  let body
  if (isLoading) {
    body = <div className="stk-form"><p className="stk-form-sub">{t("common.loading")}</p></div>
  } else if (isError || !inv || inv.status !== "valid") {
    const key = isError || !inv ? "notFound" : inv.status
    body = (
      <div className="stk-form">
        <h2 className="stk-form-title">{t(`invite.invalid.${key}.title`)}</h2>
        <p className="stk-form-sub">{t(`invite.invalid.${key}.text`)}</p>
        <Link to="/login" className="stk-btn" style={{ textAlign: "center", textDecoration: "none" }}>
          {t("invite.goLogin")}
        </Link>
      </div>
    )
  } else {
    body = (
      <form
        className="stk-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!mismatch) mutation.mutate()
        }}
      >
        <h2 className="stk-form-title">{t("invite.title", { company: inv.company })}</h2>
        <p className="stk-form-sub">
          {t("invite.subtitle", { inviter: inv.invitedBy, role: t(`companies.roles.${inv.role}`) })}
        </p>

        <div className="stk-field">
          <label htmlFor="inv-email">{t("auth.login.email")}</label>
          <input id="inv-email" type="email" value={inv.email} readOnly />
        </div>

        {inv.userExists ? (
          <p className="stk-form-sub">{t("invite.existingHint")}</p>
        ) : (
          <div className="stk-field">
            <label htmlFor="inv-name">{t("invite.name")}</label>
            <input id="inv-name" autoComplete="name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}

        <div className="stk-field">
          <label htmlFor="inv-password">{t("auth.login.password")}</label>
          <input
            id="inv-password"
            type="password"
            autoComplete={inv.userExists ? "current-password" : "new-password"}
            minLength={6}
            required
            autoFocus={inv.userExists}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {!inv.userExists && (
          <div className="stk-field">
            <label htmlFor="inv-confirm">{t("invite.confirm")}</label>
            <input
              id="inv-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={mismatch}
            />
          </div>
        )}

        {(mismatch || mutation.isError) && (
          <p className="stk-error" role="alert">
            {mismatch ? t("invite.mismatch") : typeof apiError === "string" ? apiError : t("invite.error")}
          </p>
        )}

        <button type="submit" className="stk-btn" disabled={mutation.isPending || mismatch}>
          {mutation.isPending ? t("invite.joining") : t(inv.userExists ? "invite.joinExisting" : "invite.join")}
        </button>
      </form>
    )
  }

  return (
    <div className="stk-page">
      <div className="stk-reg-card">
        <aside className="stk-panel">
          <h1 className="stk-title">{t("invite.panelTitle")}</h1>
          <p className="stk-sub">{t("invite.panelSubtitle")}</p>
          <BoxesIllustration t={t} />
        </aside>
        <div className="stk-form-wrap">{body}</div>
      </div>
    </div>
  )
}
