import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { loginRequest } from "@/api/auth"
import { useAuth } from "@/context/AuthContext"
import { BoxesIllustration } from "@/components/BoxesIllustration"
import "./Register.css"
import { apiErrorMessage } from "@/lib/api-error"

export function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { login } = useAuth()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: () => loginRequest(email.trim(), password),
    onSuccess: (data) => {
      login(data.token, data.refreshToken, data.user, data.company?.id)
      navigate("/")
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    mutation.mutate()
  }

  const errorText = mutation.isError && apiErrorMessage(mutation.error, t("auth.login.error"))

  return (
    <div className="stk-page">
      <div className="stk-reg-card">
        <aside className="stk-panel">
          <h1 className="stk-title">{t("auth.login.panelTitle")}</h1>
          <p className="stk-sub">{t("auth.login.panelSubtitle")}</p>
          <BoxesIllustration t={t} />
        </aside>

        <div className="stk-form-wrap">
          <form className="stk-form" onSubmit={handleSubmit}>
            <h2 className="stk-form-title">{t("auth.login.title")}</h2>
            <p className="stk-form-sub">{t("auth.login.subtitle")}</p>

            <div className="stk-field">
              <label htmlFor="email">{t("auth.login.email")}</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="stk-field">
              <label htmlFor="password">{t("auth.login.password")}</label>
              <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {mutation.isError && (
              <p className="stk-error" role="alert">
                {errorText}
              </p>
            )}

            <button type="submit" className="stk-btn" disabled={mutation.isPending}>
              {mutation.isPending ? t("auth.login.submitting") : t("auth.login.submit")}
            </button>

            <p className="stk-foot">
              {t("auth.login.noAccount")} <Link to="/register">{t("auth.login.register")}</Link>
            </p>
            <p className="stk-legal">
              <Link to="/terms">{t("legal.termsShort")}</Link> · <Link to="/privacy">{t("legal.privacyShort")}</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
