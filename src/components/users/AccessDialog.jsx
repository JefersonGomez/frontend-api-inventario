import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getPermissionCatalog, updateUserAccess } from "@/api/users"
import { getLocations } from "@/api/locations"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ROLES } from "@/lib/roles"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


// Rol fijo + permisos sueltos solo para esta persona. Se marcan los permisos efectivos;
// al guardar se manda solo la diferencia con el rol (lo dado de más y lo quitado).
export function AccessDialog({ user, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: catalog } = useQuery({ queryKey: ["permission-catalog"], queryFn: getPermissionCatalog, staleTime: Infinity })
  const [role, setRole] = useState(user.role)
  const [granted, setGranted] = useState(user.grantedPermissions ?? [])
  const [revoked, setRevoked] = useState(user.revokedPermissions ?? [])
  const [locationIds, setLocationIds] = useState(user.locationIds ?? [])
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: () => getLocations() })
  const toggleLocation = (id) =>
    setLocationIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const fromRole = catalog?.rolePermissions[role] ?? []
  const isAdmin = role === "ADMIN"
  const has = (p) => isAdmin || (fromRole.includes(p) ? !revoked.includes(p) : granted.includes(p))

  function toggle(p) {
    const without = (list) => list.filter((x) => x !== p)
    if (fromRole.includes(p)) setRevoked(revoked.includes(p) ? without(revoked) : [...revoked, p])
    else setGranted(granted.includes(p) ? without(granted) : [...granted, p])
  }

  // al cambiar de rol los ajustes se reinician: cada rol trae su propio juego
  function changeRole(next) {
    setRole(next)
    setGranted([])
    setRevoked([])
  }

  const mutation = useMutation({
    mutationFn: () => updateUserAccess(user.id, {
      role,
      grantedPermissions: isAdmin ? [] : granted,
      revokedPermissions: isAdmin ? [] : revoked,
      locationIds: isAdmin ? [] : locationIds,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      onClose()
    },
  })

  const roleItems = ROLES.map((r) => ({ value: r, label: t(`companies.roles.${r}`) }))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("users.access.title", { name: user.name })}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <p className="text-sm text-muted-foreground">{t("users.access.hint")}</p>
          <div className="space-y-2">
            <Label>{t("users.role")}</Label>
            <Select items={roleItems} value={role} onValueChange={changeRole}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleItems.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset className="space-y-1" disabled={isAdmin || !catalog}>
            <legend className="mb-2 text-sm font-medium">{t("users.access.permissions")}</legend>
            {isAdmin && <p className="text-xs text-muted-foreground">{t("users.access.adminAll")}</p>}
            {catalog?.permissions.map((p) => {
              const changed = !isAdmin && (granted.includes(p) || revoked.includes(p))
              return (
                <label key={p} className="flex items-center gap-2.5 rounded-md px-1.5 py-1 text-sm hover:bg-muted/50">
                  <input type="checkbox" className="size-4 accent-primary" checked={has(p)} onChange={() => toggle(p)} />
                  <span className="flex-1">{t(`permissions.${p}`)}</span>
                  {changed && <span className="text-xs text-[var(--stk-warn)]">{t("users.access.changed")}</span>}
                </label>
              )
            })}
          </fieldset>

          {locations.length > 1 && !isAdmin && (
            <fieldset className="space-y-1">
              <legend className="mb-1 text-sm font-medium">{t("users.access.locations")}</legend>
              <p className="mb-2 text-xs text-muted-foreground">{t("users.access.locationsHint")}</p>
              {locations.map((l) => (
                <label key={l.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1 text-sm hover:bg-muted/50">
                  <input type="checkbox" className="size-4 accent-primary" checked={locationIds.includes(l.id)} onChange={() => toggleLocation(l.id)} />
                  <span className="flex-1">{l.name}</span>
                  <span className="text-xs text-muted-foreground">{t(`locations.types.${l.type}`)}</span>
                </label>
              ))}
            </fieldset>
          )}

          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">{apiErrorMessage(mutation.error, t("users.access.error"))}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={mutation.isPending || !catalog}>{t("users.access.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
