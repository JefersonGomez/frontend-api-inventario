import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getLocations } from "@/api/locations"
import { usePermissions } from "@/hoocks/usePermissions"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Dónde ocurre algo (movimiento, stock inicial, recepción de una orden). Sin elegir ("") el backend
// usa la ubicación activa, así que se muestra esa como valor. Con una sola ubicación no se muestra.
export function LocationSelect({ id, label, value, onChange, hint }) {
  const { t } = useTranslation()
  const { activeLocationId } = usePermissions()
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: () => getLocations() })
  if (locations.length <= 1) return null

  const items = locations.map((l) => ({ value: l.id, label: `${l.name} · ${t(`locations.types.${l.type}`)}` }))
  const current = value || activeLocationId || locations[0].id

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label ?? t("locations.label")}</Label>
      <Select items={items} value={current} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

