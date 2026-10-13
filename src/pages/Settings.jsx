import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useTheme } from "@/context/ThemeContext"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { getCompany, updateCompany } from "@/api/company"
const languageItems = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
]

// Nombre de la empresa de esta instalación (solo ADMIN). Se usa en los correos a proveedores.
function CompanyCard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ["company"], queryFn: getCompany })
  const [draft, setDraft] = useState(null)
  const [currencyDraft, setCurrencyDraft] = useState(null)
  const name = draft ?? data?.name ?? ""
  const currency = currencyDraft ?? data?.currency ?? "CRC"
  const currencyItems = [
    { value: "CRC", label: t("settings.currencies.CRC") },
    { value: "USD", label: t("settings.currencies.USD") },
  ]
  const dirty = (name.trim() !== "" && name.trim() !== data?.name) || currency !== data?.currency

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] })
      queryClient.invalidateQueries({ queryKey: ["companies"] })
      setDraft(null)
      setCurrencyDraft(null)
    },
  })

  const submit = (e) => {
    e.preventDefault()
    mutation.mutate({ name: name.trim(), currency })
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t("settings.company")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-2">
          <Label htmlFor="company-name">{t("settings.companyName")}</Label>
          <p className="text-xs text-muted-foreground">{t("settings.companyNameDescription")}</p>
          <div className="flex gap-2">
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div className="pt-3 space-y-2">
            <Label>{t("settings.currency")}</Label>
            <p className="text-xs text-muted-foreground">{t("settings.currencyDescription")}</p>
            <Select items={currencyItems} value={currency} onValueChange={setCurrencyDraft}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyItems.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-3">
            <Button type="submit" disabled={mutation.isPending || !name.trim() || !dirty}>
              {t("common.save")}
            </Button>
          </div>
          {mutation.isSuccess && draft === null && currencyDraft === null && (
            <p role="status" className="text-xs text-muted-foreground">{t("settings.companySaved")}</p>
          )}
          {mutation.isError && (
            <p role="alert" className="text-xs text-destructive">{t("settings.companyError")}</p>
          )}
        </form>
        {data?.plan && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm">
              {t("companies.plan.title")}: <span className="font-semibold">{t(`companies.plan.${data.plan}`)}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("companies.plan.limits", {
                items: [
                  t("companies.plan.companies", { count: data.limits.maxCompanies }),
                  data.limits.maxUsersPerCompany === null
                    ? t("companies.plan.unlimitedUsers")
                    : t("companies.plan.users", { count: data.limits.maxUsersPerCompany }),
                  data.limits.maxProducts === null
                    ? t("companies.plan.unlimitedProducts")
                    : t("companies.plan.products", { count: data.limits.maxProducts }),
                ].join(" · "),
              })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function Settings() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()

  function handleLanguageChange(value) {
    i18n.changeLanguage(value)
    localStorage.setItem("language", value)
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("settings.title", "Configuración")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.subtitle", "Personaliza tu experiencia en InventarioPro")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.appearance", "Apariencia")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("settings.language", "Idioma")}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t("settings.languageDescription", "Elige el idioma de la interfaz")}
              </p>
            </div>
            <Select
              items={languageItems}
              value={i18n.language}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
  <div>
    <Label>{t("settings.theme", "Tema")}</Label>
    <p className="text-xs text-muted-foreground mt-1">
      {t("settings.themeDescription", "Cambia entre modo claro y oscuro")}
    </p>
  </div>
  <Button variant="outline" size="icon" onClick={toggleTheme}>
    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
  </Button>
</div>
        </CardContent>
      </Card>

      {user?.role === "ADMIN" && <CompanyCard />}
    </div>
  )
}
