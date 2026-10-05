import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { registerRequest } from "@/api/auth"
import "./Register.css"

const EMPTY = { name: "", email: "", phone: "", company: "", password: "", confirm: "" }

export function Register() {
  const { t } = useTranslation()
  const [form, setForm] = useState(EMPTY)
  const [mismatch, setMismatch] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      registerRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(form.company.trim() && { company: form.company.trim() }),
      }),
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  function handleSubmit(e) {
    e.preventDefault()
    if (!e.currentTarget.reportValidity()) return
    if (form.password !== form.confirm) return setMismatch(true)
    setMismatch(false)
    mutation.mutate()
  }

  const apiError = mutation.error?.response?.data?.error
  const errorText = mismatch
    ? t("auth.register.errors.passwordMismatch")
    : mutation.isError &&
      (apiError?.fieldErrors ? t("auth.register.errors.validation") : t("auth.register.errors.creation_failed"))

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
                  <input id="phone" type="tel" autoComplete="tel" placeholder="+57" maxLength={30} value={form.phone} onChange={set("phone")} />
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
                  <input id="password" type="password" autoComplete="new-password" required minLength={6} value={form.password} onChange={set("password")} />
                </div>
                <div className="stk-field">
                  <label htmlFor="confirm">{t("auth.register.confirmPassword")}</label>
                  <input id="confirm" type="password" autoComplete="new-password" required minLength={6} value={form.confirm} onChange={set("confirm")} aria-invalid={mismatch || undefined} />
                </div>
              </div>

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

function BoxesIllustration({ t }) {
  return (
    <svg className="stk-art" viewBox="0 0 320 300" role="img" aria-label={t("auth.register.artLabel")}>
      <defs>
        <linearGradient id="stk-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset="1" stopColor="#dcf20a" stopOpacity=".9" />
        </linearGradient>
        <linearGradient id="stk-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".38" />
          <stop offset="1" stopColor="#fff" stopOpacity=".12" />
        </linearGradient>
        <linearGradient id="stk-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#8a8a85" stopOpacity=".08" />
        </linearGradient>
        <linearGradient id="stk-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9c9c4" stopOpacity=".14" />
          <stop offset="1" stopColor="#555" stopOpacity=".05" />
        </linearGradient>
        <radialGradient id="stk-glow">
          <stop offset="0" stopColor="#dcf20a" stopOpacity=".55" />
          <stop offset="1" stopColor="#dcf20a" stopOpacity="0" />
        </radialGradient>
        <filter id="stk-blur" x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      <ellipse cx="150" cy="270" rx="120" ry="20" fill="url(#stk-glow)" />

      <g className="stk-float">
        {/* Caja grande */}
        <g stroke="url(#stk-edge)" strokeWidth="1.3" strokeLinejoin="round">
          <path d="M60 160 L150 108 L240 160 L150 212 Z" fill="url(#stk-top)" />
          <path d="M60 160 L150 212 L150 270 L60 218 Z" fill="url(#stk-left)" />
          <path d="M240 160 L150 212 L150 270 L240 218 Z" fill="url(#stk-right)" />
        </g>
        <path d="M105 134 L195 186" stroke="#dcf20a" strokeWidth="9" strokeOpacity=".85" />

        {/* Etiqueta SKU en la cara izquierda */}
        <g transform="matrix(.61 .35 0 .7 78 180)">
          <rect width="100" height="52" rx="4" fill="#f4f4f2" fillOpacity=".92" />
          <g fill="#111">
            {[6, 9, 14, 16, 21, 26, 28, 33, 38, 41, 44, 50, 53, 58, 62, 65, 70, 74, 79, 83, 86, 91].map((x, i) => (
              <rect key={x} x={x} y="7" width={i % 3 === 0 ? 2.4 : 1.2} height="26" />
            ))}
          </g>
          <text x="50" y="46" textAnchor="middle" className="stk-mono" fontSize="9" fill="#111">
            SKU 4821-07
          </text>
          <rect className="stk-scan" x="2" y="20" width="96" height="2.4" fill="#dcf20a" filter="url(#stk-blur)" />
        </g>

        {/* Caja pequeña encima */}
        <g stroke="url(#stk-edge)" strokeWidth="1.3" strokeLinejoin="round">
          <path d="M100 92 L150 63 L200 92 L150 121 Z" fill="url(#stk-top)" />
          <path d="M100 92 L150 121 L150 158 L100 129 Z" fill="url(#stk-left)" />
          <path d="M200 92 L150 121 L150 158 L200 129 Z" fill="url(#stk-right)" />
        </g>
        <path d="M125 77.5 L175 106.5" stroke="#dcf20a" strokeWidth="6" strokeOpacity=".85" />

        {/* Etiqueta flotante */}
        <path d="M240 175 L268 132" stroke="#dcf20a" strokeWidth="1.2" strokeDasharray="3 4" />
        <circle cx="240" cy="175" r="3" fill="#dcf20a" />
        <g transform="translate(222 92)">
          <rect width="92" height="42" rx="10" fill="#141413" stroke="#dcf20a" strokeWidth="1.2" />
          <text x="12" y="17" fontSize="10" fill="#a9a9a3">
            {t("auth.register.inStock")}
          </text>
          <text x="12" y="33" fontSize="13" fontWeight="600" fill="#dcf20a" className="stk-mono">
            {t("auth.register.units", { count: 128 })}
          </text>
        </g>
      </g>
    </svg>
  )
}
