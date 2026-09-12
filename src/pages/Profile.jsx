import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getProfile, updateAvatar, changePassword, updateProfile } from "@/api/profile"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Lock, Camera, Check, X, AlertCircle } from "lucide-react"

const API_URL = "http://localhost:3000"

// --- Fila editable individual mejorada ---
function EditableRow({ label, value, onSave, isSaving, type = "text", icon: Icon }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function handleSave() {
    if (draft !== value) {
      onSave(draft, () => setEditing(false))
    } else {
      setEditing(false)
    }
  }

  function handleCancel() {
    setDraft(value)
    setEditing(false)
  }

  return (
    <div className="group relative">
      <div className="flex items-center gap-4 py-4">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
          {editing ? (
            <Input
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="max-w-md transition-all focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          ) : (
            <p className="font-semibold text-base">{value || "No especificado"}</p>
          )}
        </div>

        {editing ? (
          <div className="flex gap-2 shrink-0 animate-in fade-in slide-in-from-right-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCancel}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving || draft === value}
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Check className="w-4 h-4" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg shrink-0"
          >
            Editar
          </button>
        )}
      </div>
      <Separator className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

// --- Componente de tarjeta de perfil mejorada ---
function ProfileCard({ profile, avatarMutation, onAvatarChange }) {
  const initials = profile.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
  
  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-muted/20">
      {/* Header con gradiente */}
      <div className="relative h-32 bg-gradient-to-r from-primary via-primary/80 to-accent">
        <div className="absolute inset-0 bg-grid-white/[0.02]" />
      </div>
      
      <CardContent className="relative pt-0 pb-6 px-6">
        {/* Avatar superpuesto */}
        <div className="flex justify-center -mt-16 mb-4">
          <div className="relative group">
            <Avatar className="w-24 h-24 ring-4 ring-background shadow-xl">
              {profile.avatarUrl && (
                <AvatarImage src={`${API_URL}${profile.avatarUrl}`} alt={profile.name} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl font-bold">
                {initials || "US"}
              </AvatarFallback>
            </Avatar>
            
            {/* Overlay para cambiar foto */}
            <label 
              htmlFor="avatar-upload" 
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-200"
            >
              <Camera className="w-8 h-8 text-white" />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onAvatarChange}
            />
          </div>
        </div>

        {/* Info del usuario */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
          <Badge 
            variant={profile.role === "ADMIN" ? "default" : "secondary"}
            className={`
              ${profile.role === "ADMIN" 
                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" 
                : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              }
              text-white border-0 px-3 py-1
            `}
          >
            {profile.role === "ADMIN" ? "Administrador" : "Empleado"}
          </Badge>
          
          {avatarMutation.isPending && (
            <p className="text-xs text-muted-foreground animate-pulse">Subiendo imagen...</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function Profile() {
  const queryClient = useQueryClient()
  const { updateUser } = useAuth()

  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: getProfile })
  const profile = profileQuery.data

  const avatarMutation = useMutation({
    mutationFn: (file) => updateAvatar(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      updateUser({ avatarUrl: data.avatarUrl })
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: ({ name, email }) => updateProfile(name, email),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      updateUser({ name: data.name, email: data.email })
    },
  })

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const passwordMutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("")
      setNewPassword("")
    },
  })

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (file) avatarMutation.mutate(file)
  }

  function handlePasswordSubmit(e) {
    e.preventDefault()
    passwordMutation.mutate()
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header de página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Mi Perfil
          </h1>
          <p className="text-muted-foreground mt-1">Gestiona tu información personal y seguridad</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        {/* Sidebar con tarjeta de perfil */}
        <div className="lg:sticky lg:top-6">
          <ProfileCard 
            profile={profile} 
            avatarMutation={avatarMutation}
            onAvatarChange={handleAvatarChange}
          />
        </div>

        {/* Contenido principal con tabs */}
        <div>
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger 
                value="info" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <User className="w-4 h-4 mr-2" />
                Información Personal
              </TabsTrigger>
              <TabsTrigger 
                value="security"
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
              >
                <Lock className="w-4 h-4 mr-2" />
                Seguridad
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Datos Personales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <EditableRow
                    label="Nombre Completo"
                    value={profile.name}
                    icon={User}
                    isSaving={updateProfileMutation.isPending}
                    onSave={(newName, done) =>
                      updateProfileMutation.mutate(
                        { name: newName, email: profile.email },
                        { onSuccess: done }
                      )
                    }
                  />
                  <EditableRow
                    label="Correo Electrónico"
                    value={profile.email}
                    type="email"
                    icon={Mail}
                    isSaving={updateProfileMutation.isPending}
                    onSave={(newEmail, done) =>
                      updateProfileMutation.mutate(
                        { name: profile.name, email: newEmail },
                        { onSuccess: done }
                      )
                    }
                  />
                </CardContent>
              </Card>

              {updateProfileMutation.isError && (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive animate-in fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm">
                    {updateProfileMutation.error?.response?.data?.error ?? "No se pudo actualizar el perfil."}
                  </p>
                </div>
              )}
              
              {updateProfileMutation.isSuccess && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 animate-in fade-in">
                  <Check className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">Perfil actualizado correctamente</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="security" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    Cambiar Contraseña
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Contraseña Actual</Label>
                      <div className="relative">
                        <Input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="pl-10 pr-4"
                          placeholder="••••••••"
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Nueva Contraseña</Label>
                      <div className="relative">
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          minLength={6}
                          required
                          className="pl-10 pr-4"
                          placeholder="Mínimo 6 caracteres"
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {passwordMutation.isError && (
                        <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive animate-in fade-in">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <p className="text-sm">
                            {passwordMutation.error?.response?.data?.error ?? "No se pudo cambiar la contraseña."}
                          </p>
                        </div>
                      )}
                      
                      {passwordMutation.isSuccess && (
                        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 animate-in fade-in">
                          <Check className="w-4 h-4 shrink-0" />
                          <p className="text-sm font-medium">Contraseña actualizada exitosamente</p>
                        </div>
                      )}

                      <Button 
                        type="submit" 
                        disabled={passwordMutation.isPending}
                        className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      >
                        {passwordMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Actualizando...
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Cambiar Contraseña
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default Profile