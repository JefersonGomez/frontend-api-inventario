import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getUsers, toggleUserActive } from "@/api/users"
import { useAuth } from "@/context/AuthContext"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const API_URL = "http://localhost:3000"

export function Users() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: getUsers })

  const toggleMutation = useMutation({
    mutationFn: (id) => toggleUserActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("users.title", "Empleados")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("users.subtitle", "Administra el acceso de tu equipo al sistema")}
        </p>
      </div>

      <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("users.name", "Nombre")}</TableHead>
              <TableHead>{t("users.email", "Email")}</TableHead>
              <TableHead>{t("users.role", "Rol")}</TableHead>
              <TableHead>{t("users.registeredOn", "Registrado")}</TableHead>
              <TableHead className="text-right">{t("users.active", "Activo")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("common.loading", "Cargando...")}
                </TableCell>
              </TableRow>
            )}

            {usersQuery.data?.map((u) => {
              const initials = u.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              const isSelf = u.id === currentUser?.id

              return (
                <TableRow key={u.id}>
                  <TableCell className="flex items-center gap-2 font-medium">
                    <Avatar className="w-7 h-7">
                      {u.avatarUrl && <AvatarImage src={`${API_URL}${u.avatarUrl}`} alt={u.name} />}
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {u.name}
                    {isSelf && (
                      <span className="text-xs text-muted-foreground">
                        ({t("users.you", "tú")})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                      {u.role === "ADMIN" ? "Admin" : "Empleado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(u.createAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={u.isActive}
                      disabled={isSelf || toggleMutation.isPending}
                      onCheckedChange={() => toggleMutation.mutate(u.id)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {toggleMutation.isError && (
        <p className="text-sm text-destructive mt-3">
          {toggleMutation.error?.response?.data?.error ?? "No se pudo actualizar el usuario."}
        </p>
      )}
    </div>
  )
}