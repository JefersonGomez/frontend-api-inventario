import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, PlugZap } from "lucide-react"
import { getEInvoiceSettings, saveEInvoiceSettings, testEInvoiceSettings } from "@/api/einvoice"
import { apiErrorMessage } from "@/lib/api-error"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const empty = { username: null, password: "", pin: "", provider: null, environment: null }

// Facturación electrónica de la empresa (Bloque 9, fase 2): credenciales de Hacienda y llave .p12.
// Lo secreto viaja una sola vez y queda cifrado en el servidor; aquí nunca se vuelve a mostrar.
export function EInvoiceCard() {
  const { t, i18n } = useTranslation()
  const x = (k, o) => t(`einvoice.settings.${k}`, o)
  const queryClient = useQueryClient()
  const { data: s, isLoading } = useQuery({ queryKey: ["einvoice-settings"], queryFn: getEInvoiceSettings })
  const [draft, setDraft] = useState(empty) // null en un campo = se muestra lo guardado
  const [file, setFile] = useState(null)
  const [confirmProd, setConfirmProd] = useState(false)
  const fileInput = useRef(null)
  const [now] = useState(() => Date.now()) // para avisar si la llave vence pronto
  const form = {
    username: draft.username ?? s?.username ?? "",
    environment: draft.environment ?? s?.environment ?? "pruebas",
    provider: draft.provider ?? s?.provider ?? "",
    password: draft.password,
    pin: draft.pin,
  }
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const done = (saved) => {
    queryClient.setQueryData(["einvoice-settings"], saved)
    setDraft(empty)
    setFile(null)
    if (fileInput.current) fileInput.current.value = ""
  }

  const save = useMutation({
    mutationFn: () => saveEInvoiceSettings({
      environment: form.environment, username: form.username.trim(), provider: form.provider.trim(),
      ...(form.password && { password: form.password }), ...(form.pin && { pin: form.pin }),
    }, file),
    onSuccess: done,
  })
  const toggle = useMutation({ mutationFn: (on) => saveEInvoiceSettings({ enabled: on ? "true" : "false" }), onSuccess: done })
  const test = useMutation({ mutationFn: testEInvoiceSettings })

  function submit(e) {
    e.preventDefault()
    // pasar a producción: cada comprobante cuenta ante Hacienda, se confirma aparte
    if (form.environment === "produccion" && s?.environment !== "produccion") return setConfirmProd(true)
    save.mutate()
  }

  if (isLoading || !s) return <p className="text-muted-foreground">{t("common.loading")}</p>
  const date = (d) => (d ? new Date(d).toLocaleDateString(i18n.language) : "")
  const expiresSoon = s.key?.expiresAt && new Date(s.key.expiresAt).getTime() - now < 30 * 86_400_000
  const error = save.error || toggle.error
  const envItems = [{ value: "pruebas", label: x("env_pruebas") }, { value: "produccion", label: x("env_produccion") }]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {x("title")}
          <Badge variant={s.enabled ? "default" : "secondary"}>{s.enabled ? x("status_on") : s.configured ? x("status_ready") : x("status_off")}</Badge>
          <Badge variant={s.environment === "produccion" ? "destructive" : "outline"}>{x(`env_${s.environment}`)}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{x("description")}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!s.secretReady && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {x("secret_missing")}
          </p>
        )}

        {/* envío automático */}
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
          <div className="space-y-1">
            <Label htmlFor="einv-enabled">{x("auto_label")}</Label>
            <p className="text-xs text-muted-foreground">
              {s.enabled ? x("auto_on_since", { date: date(s.enabledAt) }) : x("auto_hint")}
            </p>
          </div>
          <Switch
            id="einv-enabled"
            checked={s.enabled}
            disabled={!s.configured || toggle.isPending}
            onCheckedChange={(on) => toggle.mutate(on)}
          />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="einv-env">{x("environment")}</Label>
              <Select items={envItems} value={form.environment} onValueChange={(v) => set({ environment: v })}>
                <SelectTrigger id="einv-env" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {envItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="einv-provider">{x("provider")}</Label>
              <Input id="einv-provider" inputMode="numeric" value={form.provider} placeholder={s.key?.holderId ?? ""} onChange={(e) => set({ provider: e.target.value })} aria-describedby="einv-provider-hint" />
              <p id="einv-provider-hint" className="text-xs text-muted-foreground">{x("provider_hint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="einv-user">{x("username")}</Label>
              <Input id="einv-user" autoComplete="off" value={form.username} onChange={(e) => set({ username: e.target.value })} placeholder="cpf-00-0000-0000@stag.comprobanteselectronicos.go.cr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="einv-pass">{x("password")}</Label>
              <Input id="einv-pass" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set({ password: e.target.value })} placeholder={s.hasPassword ? x("saved") : ""} />
            </div>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-medium">{x("key_title")}</legend>
            {s.key ? (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span>{s.key.holderName || s.key.holderId}</span>
                <span className="text-muted-foreground">· {s.key.holderId}</span>
                <span className={expiresSoon ? "text-destructive" : "text-muted-foreground"}>· {x("expires", { date: date(s.key.expiresAt) })}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{x("no_key")}</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="einv-p12">{s.key ? x("key_replace") : x("key_file")}</Label>
                <Input id="einv-p12" ref={fileInput} type="file" accept=".p12,.pfx,application/x-pkcs12" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="einv-pin">{x("pin")}</Label>
                <Input id="einv-pin" type="password" autoComplete="new-password" value={form.pin} onChange={(e) => set({ pin: e.target.value })} placeholder={s.key ? x("saved") : ""} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{x("key_hint")}</p>
          </fieldset>

          {error && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, x("save_error"))}</p>}
          {test.isSuccess && (
            <p role="status" className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {x("test_ok", { env: x(`env_${test.data.environment}`) })}
            </p>
          )}
          {test.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(test.error, x("test_error"))}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={!s.configured || test.isPending} onClick={() => test.mutate()}>
              {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PlugZap className="h-4 w-4" aria-hidden />}
              {x("test")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {t("common.save")}
            </Button>
          </div>
        </form>
      </CardContent>

      <AlertDialog open={confirmProd} onOpenChange={setConfirmProd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{x("prod_title")}</AlertDialogTitle>
            <AlertDialogDescription>{x("prod_description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmProd(false); save.mutate() }}>{x("prod_confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
