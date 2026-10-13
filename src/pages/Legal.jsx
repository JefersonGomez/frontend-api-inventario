import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Box, TriangleAlert } from "lucide-react"
import { ENTITY, LEGAL, LEGAL_REVIEWED, LEGAL_VERSION } from "@/content/legal"
import "./Legal.css"

// Página pública (sin sesión): se abre desde el registro, el login y el pie de las invitaciones.
// doc = "terms" | "privacy"
export function Legal({ doc }) {
  const { t, i18n } = useTranslation()
  const content = LEGAL[doc]
  const other = doc === "terms" ? "privacy" : "terms"
  const updated = new Date(`${LEGAL_VERSION}T12:00:00`).toLocaleDateString("es-CR", {
    day: "numeric", month: "long", year: "numeric",
  })

  return (
    <div className="legal-page">
      <header className="legal-bar">
        <Link to="/" className="legal-brand">
          <span className="legal-mark"><Box className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" /></span>
          {ENTITY.name}
        </Link>
        <Link to="/login" className="legal-back">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t("legal.back")}
        </Link>
      </header>

      <main className="legal-doc">
        {!LEGAL_REVIEWED && (
          <p className="legal-draft" role="note">
            <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
            {t("legal.draft")}
          </p>
        )}
        {i18n.language !== "es" && <p className="legal-lang" role="note">{t("legal.spanishOnly")}</p>}

        <h1>{content.title}</h1>
        <p className="legal-updated">{t("legal.updated", { date: updated })}</p>
        <p className="legal-intro">{content.intro}</p>

        {content.sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
            {s.items && (
              <ul>
                {s.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            )}
          </section>
        ))}

        <nav className="legal-foot" aria-label={t("legal.other")}>
          <Link to={`/${other}`}>{t(`legal.${other}`)}</Link>
        </nav>
      </main>
    </div>
  )
}
