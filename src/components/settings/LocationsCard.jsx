import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Store, Warehouse } from "lucide-react"
import { getLocations, createLocation, updateLocation } from "@/api/locations"
import { getCompany } from "@/api/company"
import { apiErrorMessage } from "@/lib/api-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const empty = { name: "", type: "BRANCH", address: "" }

// Sucursales (venden: cajas y código en los comprobantes) y bodegas (solo almacenan). No se borran:
// se desactivan, y solo sin stock. El plan limita las sucursales; las bodegas no.
export function LocationsCard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: locations = [] } = useQuery({ queryKey: ["locations", "all"], queryFn: () => getLocations(true) })
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: getCompany })
  const [editing, setEditing] = useState(null) // null = cerrado; {} = nueva; objeto = editar
  const [form, setForm] = useState(empty)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["locations"] })
  const save = useMutation({
    mutationFn: () => {
      const data = { name: form.name.trim(), type: form.type, address: form.address.trim() || null }
      return editing?.id ? updateLocation(editing.id, data) : createLocation(data)
    },
    onSuccess: () => {
      refresh()
      setEditing(null)
    },
  })
  const toggle = useMutation({
    mutationFn: (l) => updateLocation(l.id, { isActive: !l.isActive }),
    onSuccess: refresh,
  })

  const typeItems = ["BRANCH", "WAREHOUSE"].map((v) => ({ value: v, label: t(`locations.types.${v}`) }))
  const branches = locations.filter((l) => l.type === "BRANCH" && l.isActive).length
  const maxBranches = company?.limits?.maxBranches ?? null

  function open(location) {
    setEditing(location ?? {})
    setForm(location ? { name: location.name, type: location.type, address: location.address ?? "" } : empty)
    save.reset()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{t("locations.title")}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{t("locations.hint")}</p>
          {maxBranches !== null && (
            <p className="mt-1 text-xs text-muted-foreground">{t("locations.usage", { used: branches, max: maxBranches })}</p>
          )}
        </div>
        <Button onClick={() => open(null)}>
          <Plus />
          {t("locations.new")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("locations.name")}</TableHead>
                <TableHead>{t("locations.type")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("locations.address")}</TableHead>
                <TableHead className="text-right">{t("locations.active")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((l) => {
                const Icon = l.type === "WAREHOUSE" ? Warehouse : Store
                return (
                  <TableRow key={l.id} className={l.isActive ? undefined : "opacity-60"}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                        {l.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t(`locations.types.${l.type}`)}{l.code && ` · ${l.code}`}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{l.address || "—"}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => open(l)} aria-label={t("locations.edit", { name: l.name })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Switch
                        className="ml-2 align-middle"
                        checked={l.isActive}
                        disabled={toggle.isPending}
                        onCheckedChange={() => toggle.mutate(l)}
                        aria-label={t("locations.activeAria", { name: l.name })}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {toggle.isError && (
          <p role="alert" className="mt-2 text-sm text-destructive">{apiErrorMessage(toggle.error, t("locations.error"))}</p>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("locations.editTitle") : t("locations.newTitle")}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              save.mutate()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="location-name">{t("locations.name")}</Label>
              <Input id="location-name" value={form.name} maxLength={80} required autoFocus onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-type">{t("locations.type")}</Label>
              <Select items={typeItems} value={form.type} onValueChange={(type) => setForm({ ...form, type })}>
                <SelectTrigger id="location-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeItems.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t(`locations.typeHint.${form.type}`)}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-address">{t("locations.address")}</Label>
              <Input id="location-address" value={form.address} maxLength={250} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("locations.error"))}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={save.isPending || !form.name.trim()}>{t("common.save")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
