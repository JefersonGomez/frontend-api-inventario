import { useTranslation } from "react-i18next"
import { CubivoMark } from "@/components/CubivoMark"

// Marca en el panel oscuro de las pantallas de acceso (login, registro, invitación): logo + lema
export function AuthBrand() {
  const { t } = useTranslation()
  return (
    <div className="stk-brand">
      <p className="stk-logo" aria-label="Cubivo">
        <span className="stk-logo-mark">
          <CubivoMark />
        </span>
        <span className="stk-logo-text" aria-hidden>ubivo</span>
      </p>
      <p className="stk-brand-tag">{t("auth.brandTagline")}</p>
    </div>
  )
}
