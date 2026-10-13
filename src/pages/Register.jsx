import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { registerRequest } from "@/api/auth"
import { BoxesIllustration } from "@/components/BoxesIllustration"
import { TermsCheck } from "@/components/auth/TermsCheck"
import "./Register.css"
import { apiErrorMessage } from "@/lib/api-error"

const EMPTY = { name: "", email: "", phone: "", company: "", password: "", confirm: "" }

export function Register() {
  const { t } = useTranslation()
  const [form, setForm] = useState(EMPTY)
  const [mismatch, setMismatch] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [needsTerms, setNeedsTerms] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      registerRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(form.company.trim() && { company: form.company.trim() }),
        acceptTerms: true,
      }),
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    if (!e.currentTarget.reportValidity()) return
    if (form.password !== form.confirm) return setMismatch(true)
    setMismatch(false)
    if (!accepted) return setNeedsTerms(true)
    setNeedsTerms(false)
    mutation.mutate()
  }

  const errorText = mismatch
    ? t("auth.register.errors.passwordMismatch")
    : needsTerms && !accepted
    ? t("legal.mustAccept")
    : mutation.isError && apiErrorMessage(mutation.error, t("auth.register.errors.creation_failed"))

  return (
    <div className="stk-page">
      <div className="stk-reg-card">
        <aside className="stk-panel">
          <h1 className="stk-title">{t("auth.register.panelTitle")}</h1>
          <p className="stk-sub">{t("auth.register.panelSubtitle")}</p>
          <BoxesIllustration t={t} />
        </aside>

        <div className="stk-form-wrap">
          {mutation.isSuccess ? (
            <div className="stk-success" role="status">
              <span className="stk-success-dot" aria-hidden="true" />
              <h2>{t("auth.register.success.title", { name: form.name.trim().split(/\s+/)[0] })}</h2>
              <p>{t("auth.register.success.text")}</p>
              <Link to="/login" className="stk-btn">
                {t("auth.register.login")}
              </Link>
            </div>
          ) : (
            <form className="stk-form" onSubmit={handleSubmit} noValidate>
              <h2 className="stk-form-title">{t("auth.register.title")}</h2>

              <div className="stk-field">
                <label htmlFor="name">{t("auth.register.name")}</label>
                <input id="name" autoComplete="name" required value={form.name} onChange={set("name")} />
              </div>

              <div className="stk-row">
                <div className="stk-field">
                  <label htmlFor="email">{t("auth.register.email")}</label>
                  <input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
                </div>
                <div className="stk-field">
                  <label htmlFor="phone">
                    {t("auth.register.phone")} <span className="stk-opt">{t("auth.register.optional")}</span>
                  </label>
                  <input id="phone" type="tel" autoComplete="tel" placeholder="+506" maxLength={30} value={form.phone} onChange={set("phone")} />
                </div>
              </div>

              <div className="stk-field">
                <label htmlFor="company">
                  {t("auth.register.company")} <span className="stk-opt">{t("auth.register.optional")}</span>
                </label>
                <input id="company" autoComplete="organization" maxLength={120} value={form.company} onChange={set("company")} />
              </div>

              <div className="stk-row">
                <div className="stk-field">
                  <label htmlFor="password">{t("auth.register.password")}</label>
                  <input id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={form.password} onChange={set("password")} />
                </div>
                <div className="stk-field">
                  <label htmlFor="confirm">{t("auth.register.confirmPassword")}</label>
                  <input id="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={form.confirm} onChange={set("confirm")} aria-invalid={mismatch || undefined} />
                </div>
              </div>

              <TermsCheck
                checked={accepted}
                onChange={(v) => {
                  setAccepted(v)
                  if (v) setNeedsTerms(false)
                }}
                invalid={needsTerms && !accepted}
              />

              {errorText && (
                <p className="stk-error" role="alert">
                  {errorText}
                </p>
              )}

              <button type="submit" className="stk-btn" disabled={mutation.isPending}>
                {mutation.isPending ? t("auth.register.submitting") : t("auth.register.submit")}
              </button>

              <p className="stk-foot">
                {t("auth.register.hasAccount")} <Link to="/login">{t("auth.register.login")}</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
