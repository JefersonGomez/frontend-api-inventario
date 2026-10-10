import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Building2, Check, ChevronDown, Plus } from "lucide-react"
import { getCompany, getMyCompanies, createCompany } from "@/api/company"
import { useAuth } from "@/context/AuthContext"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Empresa activa + cambiar a otra de las del usuario + crear una nueva (según su plan)
export function CompanySwitcher() {
  const { t } = useTranslation()
  const { switchCompany } = useAuth()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [switchError, setSwitchError] = useState(false)

  const { data: company } = useQuery({ queryKey: ["company"], queryFn: getCompany })
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: getMyCompanies })

  const switchMutation = useMutation({
    mutationFn: switchCompany,
    onError: () => setSwitchError(true),
  })

  // al crearla se entra directo a la empresa nueva
  const createMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: (created) => switchMutation.mutate(created.id),
  })

  const closeCreate = () => {
    setCreating(false)
    setName("")
    createMutation.reset()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="stk-company-btn"
              aria-label={`${t("companies.label")}: ${company?.name ?? ""}`}
              title={company?.name}
            />
          }
        >
          <Building2 className="w-[18px] h-[18px] shrink-0" strokeWidth={1.7} aria-hidden />
          <span className="stk-company-name">{company?.name ?? "…"}</span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-60" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("companies.yours")}</DropdownMenuLabel>
            {companies.map((c) => {
              const active = c.id === company?.id
              return (
                <DropdownMenuItem
                  key={c.id}
                  disabled={switchMutation.isPending}
                  onClick={() => !active && switchMutation.mutate(c.id)}
                  className="flex items-start gap-2"
                >
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${active ? "" : "invisible"}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">{t(`companies.roles.${c.role}`)}</span>
                  </span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreating(true)} className="gap-2">
            <Plus className="w-4 h-4" aria-hidden />
            {t("companies.create")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {switchError && (
        <p role="alert" className="sr-only">{t("companies.switchError")}</p>
      )}

      <Dialog open={creating} onOpenChange={(o) => !o && closeCreate()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("companies.createTitle")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate(name.trim())
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">{t("companies.createHint")}</p>
            <div className="space-y-2">
              <Label htmlFor="new-company-name">{t("companies.name")}</Label>
              <Input
                id="new-company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                autoFocus
                required
              />
            </div>
            {createMutation.isError && (
              <p role="alert" className="text-sm text-destructive">
                {createMutation.error.response?.data?.error ?? t("companies.createError")}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeCreate}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={!name.trim() || createMutation.isPending || switchMutation.isPending}>
                {t("companies.createSubmit")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
