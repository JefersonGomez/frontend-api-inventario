import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Pie de un listado paginado: "26–50 de 340" + anterior/siguiente. data = respuesta de la API.
export function Pagination({ data, onPage }) {
  const { t } = useTranslation()
  if (!data || data.total === 0) return null
  const { page, pageSize, pageCount, total } = data
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav aria-label={t("pagination.nav")} className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>{t("pagination.range", { from, to, total })}</span>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {t("pagination.prev")}
          </Button>
          <span aria-live="polite">{t("pagination.page", { page, count: pageCount })}</span>
          <Button variant="outline" size="sm" onClick={() => onPage(page + 1)} disabled={page >= pageCount}>
            {t("pagination.next")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </nav>
  )
}
