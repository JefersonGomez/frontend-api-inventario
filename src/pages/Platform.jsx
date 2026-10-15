import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Building2, PauseCircle, PlayCircle, Search, Users as UsersIcon } from "lucide-react"
import { getPlatformCompanies, setCompanyPlan, setCompanySuspended } from "@/api/platform"
import { apiErrorMessage } from "@/lib/api-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const PLANS = ["BASIC", "PRO", "BUSINESS"]
const fold = (v) => (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

function Usage({ used, max }) {
  const full = max !== null && used >= max
  return (
    <span className={full ? "font-medium text-[var(--stk-crit)]" : undefined}>
      {used}
      <span className="text-muted-foreground"> / {max === null ? "∞" : max}</span>
    </span>
  )
}

// Panel del dueño de la plataforma. Ve empresa, dueño, plan y uso: nunca los datos de inventario.
export function Platform() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [q, setQ] = useState("")
  const [suspending, setSuspending] = useState(null) // empresa a suspender
  const [reason, setReason] = useState("")

  const { data: companies = [], isLoading, isError } = useQuery({
    queryKey: ["platform-companies"],
    queryFn: getPlatformCompanies,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["platform-companies"] })
  const planMutation = useMutation({ mutationFn: ({ id, plan }) => setCompanyPlan(id, plan), onSuccess: refresh })
  const suspendMutation = useMutation({
    mutationFn: setCompanySuspended,
    onSuccess: () => {
      refresh()
      closeSuspend()
    },
  })

  const closeSuspend = () => {
    setSuspending(null)
    setReason("")
    suspendMutation.reset()
  }

  const planItems = PLANS.map((p) => ({ value: p, label: t(`companies.plan.${p}`) }))
  const needle = fold(q).trim()
  const visible = companies.filter(
    (c) => !needle || [c.name, c.owner.name, c.owner.email].some((v) => fold(v).includes(needle))
  )
  const suspendedCount = companies.filter((c) => c.suspendedAt).length
  const totalUsers = companies.reduce((s, c) => s + c.users, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t("platform.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("platform.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Building2, label: t("platform.kpi.companies"), value: companies.length },
          { icon: PauseCircle, label: t("platform.kpi.suspended"), value: suspendedCount },
          { icon: UsersIcon, label: t("platform.kpi.users"), value: totalUsers },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="stk-card flex items-center gap-4">
            <span className="grid place-items-center rounded-xl shrink-0" style={{ width: 44, height: 44, background: "var(--stk-accent-soft)" }}>
              <Icon className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("platform.search")}
          aria-label={t("platform.search")}
        />
      </div>

      {(planMutation.isError || suspendMutation.isError) && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(planMutation.error ?? suspendMutation.error, t("platform.error"))}
        </p>
      )}

      <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("platform.table.company")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("platform.table.owner")}</TableHead>
              <TableHead>{t("platform.table.plan")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("platform.table.users")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("platform.table.products")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("platform.table.created")}</TableHead>
              <TableHead className="text-right">{t("platform.table.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
            )}
            {isError && (
              <TableRow><TableCell colSpan={7} className="text-center text-destructive">{t("platform.error")}</TableCell></TableRow>
            )}
            {!isLoading && !isError && visible.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t("platform.empty")}</TableCell></TableRow>
            )}
            {visible.map((c) => (
              <TableRow key={c.id} className={c.suspendedAt ? "opacity-70" : undefined}>
                <TableCell className="font-medium">
                  {c.name}
                  <span className="block text-xs font-normal text-muted-foreground md:hidden">{c.owner.email}</span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {c.owner.name}
                  <span className="block text-xs text-muted-foreground">{c.owner.email}</span>
                </TableCell>
                <TableCell>
                  <Select
                    items={planItems}
                    value={c.plan}
                    disabled={planMutation.isPending}
                    onValueChange={(plan) => plan !== c.plan && planMutation.mutate({ id: c.id, plan })}
                  >
                    <SelectTrigger className="w-32" aria-label={`${t("platform.table.plan")}: ${c.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {planItems.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="hidden sm:table-cell tabular-nums">
                  <Usage used={c.users} max={c.limits.maxUsersPerCompany} />
                </TableCell>
                <TableCell className="hidden sm:table-cell tabular-nums">
                  <Usage used={c.products} max={c.limits.maxProducts} />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {c.suspendedAt && <Badge variant="destructive">{t("platform.suspended")}</Badge>}
                    {c.suspendedAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={suspendMutation.isPending}
                        onClick={() => suspendMutation.mutate({ id: c.id, suspended: false })}
                        aria-label={`${t("platform.reactivate")}: ${c.name}`}
                        title={t("platform.reactivate")}
                      >
                        <PlayCircle />
                        <span className="hidden sm:inline">{t("platform.reactivate")}</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSuspending(c)}
                        aria-label={`${t("platform.suspend")}: ${c.name}`}
                        title={t("platform.suspend")}
                      >
                        <PauseCircle />
                        <span className="hidden sm:inline">{t("platform.suspend")}</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{t("platform.planNote")}</p>

      <Dialog open={!!suspending} onOpenChange={(o) => !o && closeSuspend()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("platform.suspendTitle", { name: suspending?.name })}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              suspendMutation.mutate({ id: suspending.id, suspended: true, reason: reason.trim() })
            }}
          >
            <p className="text-sm text-muted-foreground">{t("platform.suspendHint")}</p>
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">{t("platform.reasonLabel")}</Label>
              <Input
                id="suspend-reason"
                value={reason}
                maxLength={300}
                autoFocus
                placeholder={t("platform.reasonPlaceholder")}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            {suspendMutation.isError && (
              <p role="alert" className="text-sm text-destructive">{apiErrorMessage(suspendMutation.error, t("platform.error"))}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeSuspend}>{t("common.cancel")}</Button>
              <Button type="submit" variant="destructive" disabled={suspendMutation.isPending}>
                <PauseCircle />
                {t("platform.suspend")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
