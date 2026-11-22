import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { CheckCircle2, KeyRound } from "lucide-react"
import { getEInvoiceIssues } from "@/api/platform"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

const TONE = {
  REJECTED: "border-destructive/50 text-destructive",
  ERROR: "border-destructive/50 text-destructive",
  RETRYING: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  NO_ANSWER: "border-sky-500/40 text-sky-700 dark:text-sky-400",
}

// Facturación como servicio, parte 2: comprobantes de los clientes que necesitan atención (rechazados,
// con error, reintentando o sin respuesta de Hacienda) y llaves criptográficas por vencer. Solo estado y
// motivo: ni montos ni clientes de cada empresa.
export function EInvoiceIssuesPanel() {
  const { t, i18n } = useTranslation()
  const { data, isLoading, isError } = useQuery({ queryKey: ["platform-einvoice-issues"], queryFn: getEInvoiceIssues, refetchInterval: 60_000 })
  const when = (d) => new Date(d).toLocaleString(i18n.language, { dateStyle: "short", timeStyle: "short" })

  if (isLoading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  if (isError) return <p role="alert" className="text-sm text-destructive">{t("platform.einvoice.error")}</p>
  const { issues, byCompany, expiringKeys } = data

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t("platform.einvoice.subtitle")}</p>

      {expiringKeys.length > 0 && (
        <section className="stk-card" aria-labelledby="keys-title">
          <h2 id="keys-title" className="mb-2 flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4" aria-hidden />{t("platform.einvoice.keysTitle")}</h2>
          <ul className="space-y-1 text-sm">
            {expiringKeys.map((k) => (
              <li key={k.company.id} className={cn(k.expired && "text-destructive")}>
                <span className="font-medium">{k.company.name}</span>{" — "}
                {t(k.expired ? "platform.einvoice.keyExpired" : "platform.einvoice.keyExpires", { date: new Date(k.keyExpiresAt).toLocaleDateString(i18n.language) })}
                {k.environment === "pruebas" && <span className="text-muted-foreground"> ({t("einvoice.settings.env_pruebas")})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {issues.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-border p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-[var(--stk-ok-mid)]" aria-hidden />
          {t("platform.einvoice.allGood")}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {byCompany.map((c) => (
              <Badge key={c.company.id} variant="outline">{c.company.name}: {c.count}</Badge>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("platform.einvoice.company")}</TableHead>
                  <TableHead>{t("platform.einvoice.document")}</TableHead>
                  <TableHead>{t("platform.einvoice.problem")}</TableHead>
                  <TableHead className="max-md:hidden">{t("platform.einvoice.reason")}</TableHead>
                  <TableHead className="max-sm:hidden">{t("platform.einvoice.updated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.company.name}</TableCell>
                    <TableCell>
                      {t(`sales.types.${i.type}`)} <span className="font-mono text-xs">{i.consecutive.slice(-10)}</span>
                      {i.environment === "pruebas" && <span className="block text-xs text-muted-foreground">{t("einvoice.settings.env_pruebas")}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={TONE[i.kind]}>{t(`platform.einvoice.kinds.${i.kind}`, { count: i.attempts })}</Badge>
                      <span className="mt-1 block max-w-xs text-xs text-muted-foreground md:hidden">{i.reason}</span>
                    </TableCell>
                    <TableCell className="max-w-md whitespace-pre-line text-xs text-muted-foreground max-md:hidden">{i.reason ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground max-sm:hidden">{when(i.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">{t("platform.einvoice.hint")}</p>
        </>
      )}
    </div>
  )
}
