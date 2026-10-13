import { useTranslation } from "react-i18next"
import { PauseCircle } from "lucide-react"

// Lo que ve cualquier miembro de una empresa suspendida: sin acceso a datos, con salida clara
// (el selector de empresa de la barra superior sigue disponible para cambiar a otra).
export function SuspendedScreen({ reason }) {
  const { t } = useTranslation()
  return (
    <section className="stk-card" style={{ maxWidth: 560, margin: "48px auto", textAlign: "center" }} role="alert">
      <span
        className="mx-auto mb-4 grid place-items-center rounded-full"
        style={{ width: 56, height: 56, background: "var(--stk-lime-soft)" }}
      >
        <PauseCircle className="w-7 h-7" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold">{t("suspended.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("suspended.text")}</p>
      {reason && (
        <p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--muted)" }}>
          <span className="font-medium">{t("suspended.reason")}:</span> {reason}
        </p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">{t("suspended.hint")}</p>
    </section>
  )
}
