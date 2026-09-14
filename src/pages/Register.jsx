import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next" // 1. Importar hook
import { registerRequest } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function Register() {
  const { t } = useTranslation() // 2. Llamar al hook
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: () => registerRequest(name, email, password),
    onSuccess: () => {
      navigate("/login")
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6">
        <div>
          {/* 3. Reemplazar texto por t() */}
          <h1 className="text-2xl font-semibold">{t("register.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("register.subtitle")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">{t("register.labels.name")}</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("register.labels.email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("register.labels.password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {mutation.error?.response?.data?.error?.fieldErrors
              ? t("register.errors.validation")
              : t("register.errors.creation_failed")}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? t("register.buttons.creating") : t("register.buttons.register")}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
          {t("register.has_account")}{" "}
          <Link to="/login" className="text-primary hover:underline">
            {t("register.login_link")}
          </Link>
        </p>
      </form>
    </div>
  )
}