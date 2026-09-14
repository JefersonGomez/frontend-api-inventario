import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useTheme } from "@/context/ThemeContext"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
const languageItems = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
]

export function Settings() {
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
    </div>
  )
}