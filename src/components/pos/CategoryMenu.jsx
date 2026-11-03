import { useTranslation } from "react-i18next"
import { ChevronDown, Flame, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TOP_SELLING } from "@/lib/pos"

// Filtro del catálogo del POS (fase 3 de mejoras): "Más vendidos" (por defecto) o una categoría,
// en un menú desplegable que se cierra al elegir (closeOnClick: en Base UI los radio no cierran solos).
// Los ítems entran escalonados (.stk-menu-in en index.css).
export function CategoryMenu({ value, onChange, categories }) {
  const { t } = useTranslation()
  const current = value === TOP_SELLING ? null : categories.find((c) => c.id === value)
  const Icon = current ? LayoutGrid : Flame
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="group h-10 w-full justify-between sm:w-72" aria-label={t("pos.filter.label")} />}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon className={current ? "text-muted-foreground" : "text-[var(--stk-warn)]"} aria-hidden />
          <span className="truncate">{current ? current.name : t("pos.filter.top")}</span>
        </span>
        <ChevronDown className="opacity-60 transition-transform duration-200 group-data-popup-open:rotate-180" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 duration-200 sm:w-72">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          <DropdownMenuRadioItem value={TOP_SELLING} closeOnClick className="stk-menu-in" style={{ "--i": 0 }}>
            <Flame className="text-[var(--stk-warn)]" aria-hidden />
            <span>
              {t("pos.filter.top")}
              <span className="block text-xs text-muted-foreground">{t("pos.filter.topHint")}</span>
            </span>
          </DropdownMenuRadioItem>
          {categories.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">{t("pos.categories")}</DropdownMenuLabel>
            </>
          )}
          {categories.map((c, i) => (
            <DropdownMenuRadioItem key={c.id} value={c.id} closeOnClick className="stk-menu-in" style={{ "--i": Math.min(i + 1, 12) }}>
              <LayoutGrid className="text-muted-foreground" aria-hidden />
              {c.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
