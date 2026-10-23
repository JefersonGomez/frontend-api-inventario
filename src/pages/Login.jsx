import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { demoLogin, getDemoInfo, loginRequest } from "@/api/auth"
import { useAuth } from "@/context/AuthContext"
import { BoxesIllustration } from "@/components/BoxesIllustration"
import "./Register.css"
import { apiErrorMessage } from "@/lib/api-error"

export function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { login } = useAuth()

  const enter = (data) => {
    login(data.token, data.refreshToken, data.user, data.company?.id)
    // recarga completa: no queda en memoria nada del usuario que estaba antes en esta pestaña
    window.location.assign(data.user.role === "CASHIER" ? "/pos/abrir" : "/")
  }
  const mutation = useMutation({ mutationFn: () => loginRequest(email.trim(), password), onSuccess: enter })
  // demo pública: solo aparece si el servidor la tiene activa
  const { data: demo } = useQuery({ queryKey: ["demo-info"], queryFn: getDemoInfo, retry: false })
  const demoEnter = useMutation({ mutationFn: demoLogin, onSuccess: enter })

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

            {demo?.enabled && (
              <div className="stk-demo">
                <p className="stk-demo-title">{t("auth.demo.title")}</p>
                <p className="stk-demo-hint">{t("auth.demo.hint")}</p>
                <div className="stk-demo-actions">
                  <button type="button" className="stk-btn-outline" disabled={demoEnter.isPending} onClick={() => demoEnter.mutate("ADMIN")}>
                    {t("auth.demo.admin")}
                  </button>
                  <button type="button" className="stk-btn-outline" disabled={demoEnter.isPending} onClick={() => demoEnter.mutate("CASHIER")}>
                    {t("auth.demo.cashier")}
                  </button>
                </div>
                {demoEnter.isError && <p className="stk-error" role="alert">{apiErrorMessage(demoEnter.error, t("auth.demo.error"))}</p>}
              </div>
            )}

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
