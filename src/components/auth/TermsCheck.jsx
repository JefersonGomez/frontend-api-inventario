import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

// Casilla obligatoria de aceptación. Los enlaces abren en otra pestaña para no perder lo escrito.
export function TermsCheck({ checked, onChange, invalid }) {
  const { t } = useTranslation()
  return (
    <label className="stk-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={invalid || undefined}
      />
      <span>
        {t("legal.acceptPrefix")}{" "}
        <Link to="/terms" target="_blank" rel="noopener">{t("legal.terms")}</Link>{" "}
        {t("legal.acceptAnd")}{" "}
        <Link to="/privacy" target="_blank" rel="noopener">{t("legal.privacy")}</Link>
      </span>
    </label>
  )
}
