import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Copy, Check, UserPlus, RotateCw, X, KeyRound, LockKeyhole } from "lucide-react"
import { getUsers, toggleUserActive } from "@/api/users"
import { getInvitations, createInvitation, revokeInvitation } from "@/api/invitations"
import { getCompany } from "@/api/company"
import { useAuth } from "@/context/AuthContext"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { API_URL } from "@/api/client"
import { AccessDialog } from "@/components/users/AccessDialog"
import { PinCodeDialog } from "@/components/users/PinCodeDialog"
import { ROLES } from "@/lib/roles"

export function Users() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [inviting, setInviting] = useState(false)
  const [form, setForm] = useState({ email: "", role: "EMPLOYE" })
  const [copied, setCopied] = useState(false)
  const [editingAccess, setEditingAccess] = useState(null)
  const [pinFor, setPinFor] = useState(null)

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: () => getUsers() })
  const { data: invitations = [] } = useQuery({ queryKey: ["invitations"], queryFn: getInvitations })
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: getCompany })

  const toggleMutation = useMutation({
    mutationFn: (id) => toggleUserActive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  })

  // el link solo se ve al crearlo (el backend guarda un hash): renovar genera uno nuevo
  const inviteMutation = useMutation({
    mutationFn: createInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  })

  const revokeMutation = useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  })

  const activeUsers = usersQuery.data?.filter((u) => u.isActive).length ?? 0
  const maxUsers = company?.limits?.maxUsersPerCompany ?? null
  const used = activeUsers + invitations.length
  const full = maxUsers !== null && used >= maxUsers

  const roleItems = ROLES.map((r) => ({ value: r, label: t(`companies.roles.${r}`) }))

  const openInvite = (preset) => {
    setForm(preset ?? { email: "", role: "EMPLOYE" })
    setCopied(false)
    inviteMutation.reset()
    setInviting(true)
    if (preset) inviteMutation.mutate(preset) // renovar: genera el link directo
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteMutation.data.link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("users.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("users.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {maxUsers !== null && (
            <span className="text-sm text-muted-foreground" title={t("users.usageHint")}>
              {t("users.usage", { used, max: maxUsers })}
            </span>
          )}
          <Button onClick={() => openInvite()} disabled={full} title={full ? t("users.full") : undefined}>
            <UserPlus />
            {t("users.invite")}
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("users.name")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("users.email")}</TableHead>
              <TableHead>{t("users.role")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("users.registeredOn")}</TableHead>
              <TableHead className="text-right">{t("users.active")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}

            {usersQuery.data?.map((u) => {
              const initials = u.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
              const isSelf = u.id === currentUser?.id
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        {u.avatarUrl && <AvatarImage src={`${API_URL}${u.avatarUrl}`} alt={u.name} />}
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span>{u.name}</span>
                        {isSelf && <span className="text-xs text-muted-foreground"> ({t("users.you")})</span>}
                        <span className="block text-xs font-normal text-muted-foreground sm:hidden">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {/* nadie cambia su propio acceso (el backend también lo impide) */}
                    {isSelf ? (
                      <Badge variant="default">{t(`companies.roles.${u.role}`)}</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingAccess(u)}
                        aria-label={t("users.access.edit", { name: u.name })}
                        title={t("users.access.edit", { name: u.name })}
                      >
                        <KeyRound />
                        {t(`companies.roles.${u.role}`)}
                        {(u.grantedPermissions?.length > 0 || u.revokedPermissions?.length > 0) && (
                          <span className="text-xs text-[var(--stk-warn)]">· {t("users.access.changed")}</span>
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {u.needsPin && !isSelf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-2"
                        onClick={() => setPinFor(u)}
                        aria-label={t("users.pin.button_aria", { name: u.name })}
                        title={t("users.pin.button_aria", { name: u.name })}
                      >
                        <LockKeyhole />
                        <span className="hidden lg:inline">{u.hasPin ? t("users.pin.renew") : t("users.pin.generate")}</span>
                      </Button>
                    )}
                    <Switch
                      checked={u.isActive}
                      aria-label={t("users.active")}
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
        <p role="alert" className="text-sm text-destructive">
          {toggleMutation.error?.response?.data?.error ?? t("users.toggleError")}
        </p>
      )}

      {invitations.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">{t("users.pendingTitle")}</h2>
          <div className="border border-border rounded-xl overflow-hidden overflow-x-auto">
            <Table>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <span className="font-medium">{inv.email}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t(`companies.roles.${inv.role}`)} · {t("users.expires", { date: new Date(inv.expiresAt).toLocaleDateString() })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={t("users.renew")}
                          title={t("users.renew")}
                          onClick={() => openInvite({ email: inv.email, role: inv.role })}
                        >
                          <RotateCw />
                          <span className="hidden sm:inline">{t("users.renew")}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={t("users.revoke")}
                          title={t("users.revoke")}
                          disabled={revokeMutation.isPending}
                          onClick={() => revokeMutation.mutate(inv.id)}
                        >
                          <X />
                          <span className="hidden sm:inline">{t("users.revoke")}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {editingAccess && <AccessDialog user={editingAccess} onClose={() => setEditingAccess(null)} />}
      {pinFor && <PinCodeDialog user={pinFor} onClose={() => setPinFor(null)} />}

      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.inviteTitle")}</DialogTitle>
          </DialogHeader>

          {inviteMutation.isSuccess ? (
            <div className="space-y-4">
              <p className="text-sm">{t("users.linkReady", { email: inviteMutation.data.invitation.email })}</p>
              <div className="flex gap-2">
                <Input readOnly value={inviteMutation.data.link} onFocus={(e) => e.target.select()} aria-label={t("users.link")} />
                <Button type="button" onClick={copyLink} aria-label={t("users.copy")}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? t("users.copied") : t("users.copy")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("users.linkHint", { date: new Date(inviteMutation.data.invitation.expiresAt).toLocaleDateString() })}
              </p>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setInviting(false)}>{t("users.done")}</Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                inviteMutation.mutate({ email: form.email.trim(), role: form.role })
              }}
            >
              <p className="text-sm text-muted-foreground">{t("users.inviteHint")}</p>
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t("users.email")}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  autoFocus
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("users.role")}</Label>
                <Select items={roleItems} value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleItems.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {inviteMutation.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {inviteMutation.error.response?.data?.error ?? t("users.inviteError")}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setInviting(false)}>{t("common.cancel")}</Button>
                <Button type="submit" disabled={inviteMutation.isPending || !form.email.trim()}>
                  {t("users.createLink")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
