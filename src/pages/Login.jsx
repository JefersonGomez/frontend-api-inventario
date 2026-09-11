import { useState } from "react"
import { useNavigate,Link} from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { loginRequest } from "@/api/auth"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { login } = useAuth()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: () => loginRequest(email, password),
    onSuccess: (data) => {
      login(data.token, data.user)
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
          <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground">Accede a tu cuenta de InventarioPro</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
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
            Credenciales inválidas. Intenta de nuevo.
          </p>
        )}

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Ingresando..." : "Ingresar"}
        </Button>
   <p className="text-sm text-center text-muted-foreground">
  ¿No tienes cuenta?{" "}
  <Link to="/register" className="text-primary hover:underline">
    Regístrate
  </Link>
</p>
      </form>
    </div>
  )
}