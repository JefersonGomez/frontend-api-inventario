import { useTranslation } from "react-i18next"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ChevronDown, MapPin, Store, Warehouse } from "lucide-react"
import { getLocations } from "@/api/locations"
import { usePermissions } from "@/hoocks/usePermissions"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Ubicación en la que está la persona (el cajero elige su sucursal al entrar). Se guarda en el
// navegador y viaja en cada petición (X-Location-Id); el backend la valida. Con una sola ubicación
// no hay nada que elegir y no se muestra.
export function LocationSwitcher() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { ready, locationIds, activeLocationId } = usePermissions()
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: () => getLocations() })
  if (!ready || locations.length <= 1) return null

  const active = locations.find((l) => l.id === activeLocationId)
  const canSeeAll = !locationIds || locationIds.length > 1

  function choose(id) {
    try {
      if (id) localStorage.setItem("locationId", id)
      else localStorage.removeItem("locationId")
    } catch {
      // sin almacenamiento: queda en "todas"
    }
    queryClient.invalidateQueries() // todo lo que se ve depende de la ubicación
  }

  const label = active?.name ?? t("locations.all")
  const Icon = (type) => (type === "WAREHOUSE" ? Warehouse : Store)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" className="stk-company-btn" aria-label={`${t("locations.label")}: ${label}`} title={label} />}
      >
        <MapPin className="w-[18px] h-[18px] shrink-0" strokeWidth={1.7} aria-hidden />
        <span className="stk-company-name">{label}</span>
        <ChevronDown className="w-4 h-4 shrink-0 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("locations.where")}</DropdownMenuLabel>
          {canSeeAll && (
            <DropdownMenuItem onClick={() => choose(null)} className="flex items-center gap-2">
              <Check className={`w-4 h-4 shrink-0 ${active ? "invisible" : ""}`} aria-hidden />
              {t("locations.all")}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {locations.map((l) => {
            const LocIcon = Icon(l.type)
            return (
              <DropdownMenuItem key={l.id} onClick={() => choose(l.id)} className="flex items-start gap-2">
                <Check className={`w-4 h-4 mt-0.5 shrink-0 ${l.id === active?.id ? "" : "invisible"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{l.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <LocIcon className="w-3 h-3" aria-hidden />
                    {t(`locations.types.${l.type}`)}
                    {l.code && ` · ${l.code}`}
                  </span>
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
