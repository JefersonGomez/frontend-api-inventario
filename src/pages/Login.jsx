import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next" // 1. Importar hook
import { loginRequest } from "@/api/auth"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function Login() {
  const { t } = useTranslation() // 2. Llamar al hook
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { login } = useAuth() 
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: () => loginRequest(email, password),
    onSuccess: (data) => {
       login(data.token, data.refreshToken, data.user)
      navigate("/")
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
          <h1 className="text-2xl font-semibold">{t("login.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("login.labels.email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("login.labels.password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {mutation.isError && (
  <p className="text-sm text-destructive">
    {mutation.error?.response?.data?.error ?? t("auth.login.error")}
  </p>
)}

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? t("login.buttons.logging_in") : t("login.buttons.login")}
        </Button>
   <p className="text-sm text-center text-muted-foreground">
  {t("login.no_account")}{" "}
  <Link to="/register" className="text-primary hover:underline">
    {t("login.register_link")}
  </Link>
</p>
      </form>
    </div>
  )
}