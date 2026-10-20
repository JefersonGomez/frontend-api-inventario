import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Monitor, Pencil, Plus } from "lucide-react"
import { createRegister, getRegisters, updateRegister } from "@/api/pos"
import { getLocations } from "@/api/locations"
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

// Cajas por sucursal (/configuracion → Cajas). El terminal de 5 dígitos lo asigna el sistema (va en el
// consecutivo de los tiquetes); el plan limita cuántas por sucursal. No se borran: se desactivan.
export function RegistersCard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: registers = [] } = useQuery({ queryKey: ["cash-registers"], queryFn: getRegisters })
  const { data: locations = [] } = useQuery({ queryKey: ["locations", "all"], queryFn: () => getLocations(true) })
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: getCompany })
  const [editing, setEditing] = useState(null) // null = cerrado; {} = nueva; objeto = editar
  const [form, setForm] = useState({ name: "", locationId: "", ticketWidth: 80 })

  const branches = locations.filter((l) => l.type === "BRANCH" && l.isActive)
  const branchItems = branches.map((l) => ({ value: l.id, label: l.name }))
  const widthItems = [80, 58].map((w) => ({ value: w, label: t("registers.width", { mm: w }) }))
  const max = company?.limits?.maxRegistersPerBranch ?? null

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cash-registers"] })
  const save = useMutation({
    mutationFn: () =>
      editing?.id
        ? updateRegister(editing.id, { name: form.name.trim(), ticketWidth: form.ticketWidth })
        : createRegister({ name: form.name.trim(), locationId: form.locationId, ticketWidth: form.ticketWidth }),
    onSuccess: () => {
      refresh()
      setEditing(null)
    },
  })
  const toggle = useMutation({ mutationFn: (r) => updateRegister(r.id, { isActive: !r.isActive }), onSuccess: refresh })

  function open(register) {
    setEditing(register ?? {})
    setForm(
      register
        ? { name: register.name, locationId: register.locationId, ticketWidth: register.ticketWidth }
        : { name: t("registers.defaultName", { n: registers.length + 1 }), locationId: branches[0]?.id ?? "", ticketWidth: 80 }
    )
    save.reset()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{t("registers.title")}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{t("registers.hint")}</p>
          {max !== null && <p className="mt-1 text-xs text-muted-foreground">{t("registers.limit", { count: max })}</p>}
        </div>
        <Button onClick={() => open(null)} disabled={!branches.length}>
          <Plus />
          {t("registers.new")}
        </Button>
      </CardHeader>
      <CardContent>
        {registers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Monitor className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">{t("registers.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("registers.emptyHint")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("registers.name")}</TableHead>
                  <TableHead>{t("registers.branch")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("registers.terminal")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("registers.status")}</TableHead>
                  <TableHead className="text-right">{t("registers.active")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registers.map((r) => {
                  const session = r.sessions[0]
                  return (
                    <TableRow key={r.id} className={r.isActive ? undefined : "opacity-60"}>
                      <TableCell className="font-medium">
                        {r.name}
                        <span className="ml-2 text-xs text-muted-foreground">{t("registers.width", { mm: r.ticketWidth })}</span>
                      </TableCell>
                      <TableCell>{r.location.name}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs">
                        {r.location.code ?? "001"}-{r.terminalCode}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {session ? (
                          <Badge className="bg-[var(--stk-ok-bg)] text-[var(--stk-ok)]">{t("registers.openBy", { name: session.openedBy.name })}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("registers.closed")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => open(r)} aria-label={t("registers.edit", { name: r.name })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch
                          className="ml-2 align-middle"
                          checked={r.isActive}
                          disabled={toggle.isPending}
                          onCheckedChange={() => toggle.mutate(r)}
                          aria-label={t("registers.activeAria", { name: r.name })}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {toggle.isError && <p role="alert" className="mt-2 text-sm text-destructive">{apiErrorMessage(toggle.error, t("registers.error"))}</p>}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("registers.editTitle") : t("registers.newTitle")}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              save.mutate()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="register-name">{t("registers.name")}</Label>
              <Input id="register-name" value={form.name} maxLength={60} required autoFocus onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {!editing?.id && (
              <div className="space-y-2">
                <Label htmlFor="register-branch">{t("registers.branch")}</Label>
                <Select items={branchItems} value={form.locationId} onValueChange={(locationId) => setForm({ ...form, locationId })}>
                  <SelectTrigger id="register-branch" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branchItems.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="register-width">{t("registers.ticketWidth")}</Label>
              <Select items={widthItems} value={form.ticketWidth} onValueChange={(ticketWidth) => setForm({ ...form, ticketWidth })}>
                <SelectTrigger id="register-width" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {widthItems.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("registers.ticketWidthHint")}</p>
            </div>
            {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("registers.error"))}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={save.isPending || !form.name.trim() || !form.locationId}>{t("common.save")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
