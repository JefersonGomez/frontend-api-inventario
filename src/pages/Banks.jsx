import { useState } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { FileUp, Landmark, Pencil, Plus } from "lucide-react"
import { classifyBankTransaction, createBankAccount, getBankTransactions, getCashDeposits, importBankStatement, updateBankAccount } from "@/api/banks"
import { getLocations } from "@/api/locations"
import { useListParams } from "@/hoocks/useListParams"
import { apiErrorMessage } from "@/lib/api-error"
import { buildBankRows, detectBankColumns, FIELDS, missingBankFields, readStatement } from "@/lib/bank-import"
import { DepositDialog } from "@/components/banks/DepositDialog"
import { useBankAccounts } from "@/hoocks/useBankAccounts"
import { Pagination } from "@/components/Pagination"
import { SearchInput } from "@/components/SearchInput"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

const CATEGORIES = ["BANK_FEE", "INTEREST", "OWNER_WITHDRAWAL", "OWNER_CONTRIBUTION", "EXPENSE", "OTHER_INCOME", "OTHER"]
const STATUSES = ["pending", "reviewed", "all"]
const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
const day = (d) => new Date(d).toLocaleDateString("es-CR", { timeZone: "UTC" })
const fmt = (currency) => (v) =>
  Number(v).toLocaleString("es-CR", { style: "currency", currency, minimumFractionDigits: 2 })

// Bancos (banks.manage): cuentas, estado bancario importado y clasificado, depósitos de efectivo.
// La conciliación con lo del sistema llega en la fase 53B.
export function Banks() {
  const { t } = useTranslation()
  const list = useListParams()
  const { data: accounts = [], isLoading } = useBankAccounts()
  const [editing, setEditing] = useState(null) // null | {} (nueva) | cuenta
  const [importing, setImporting] = useState(false)
  const [depositing, setDepositing] = useState(false)
  const active = accounts.filter((a) => a.isActive)
  const account = accounts.find((a) => a.id === list.get("account")) ?? active[0] ?? accounts[0]
  const tab = list.get("tab") === "deposits" ? "deposits" : "movements"

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("banks.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("banks.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing({})}>
            <Plus />
            {t("banks.accounts.new")}
          </Button>
          {active.length > 0 && (
            <>
              <Button variant="outline" onClick={() => setDepositing(true)}>
                <Landmark />
                {t("banks.deposit.button")}
              </Button>
              <Button disabled={!account?.isActive} onClick={() => setImporting(true)}>
                <FileUp />
                {t("banks.import.button")}
              </Button>
            </>
          )}
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Landmark className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">{t("banks.empty.title")}</p>
          <p className="mb-4 text-sm text-muted-foreground">{t("banks.empty.hint")}</p>
          <Button onClick={() => setEditing({})}>{t("banks.accounts.new")}</Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={t("banks.account")}>
            {accounts.map((a) => (
              <div key={a.id} className={cn("flex items-center rounded-lg border", a.id === account?.id ? "border-[var(--stk-accent)] bg-[var(--stk-accent-soft)]" : "border-border", !a.isActive && "opacity-60")}>
                <button type="button" role="tab" aria-selected={a.id === account?.id} className="px-3 py-2 text-left text-sm" onClick={() => list.set({ account: a.id })}>
                  <span className="block font-medium">{a.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {a.bankName} · {a.currency}
                    {!a.isActive && ` · ${t("banks.accounts.inactive")}`}
                  </span>
                </button>
                {a.pending > 0 && <Badge className="mr-1 bg-[var(--stk-warn-bg)] text-[var(--stk-warn)]">{a.pending}</Badge>}
                <Button variant="ghost" size="icon-sm" className="mr-1" aria-label={t("banks.accounts.edit", { name: a.name })} title={t("banks.accounts.edit", { name: a.name })} onClick={() => setEditing(a)}>
                  <Pencil />
                </Button>
              </div>
            ))}
          </div>
          {account && <AccountRouting account={account} />}

          <div className="mb-4 inline-flex rounded-lg border border-border p-0.5" role="tablist">
            {["movements", "deposits"].map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={tab === v}
                className={cn("rounded-md px-3 py-1.5 text-sm", tab === v ? "bg-[var(--stk-accent)] text-[var(--stk-accent-fg)]" : "text-muted-foreground hover:text-foreground")}
                onClick={() => list.set({ tab: v === "deposits" ? v : "" })}
              >
                {t(`banks.tabs.${v}`)}
              </button>
            ))}
          </div>
          {account && (tab === "movements" ? <Movements account={account} list={list} /> : <Deposits account={account} list={list} />)}
        </>
      )}

      <AccountDialog account={editing} onClose={() => setEditing(null)} />
      <ImportDialog open={importing} account={account} onClose={() => setImporting(false)} />
      <DepositDialog open={depositing} defaultAccountId={account?.isActive ? account.id : ""} onClose={() => setDepositing(false)} />
    </div>
  )
}

// De dónde recibe el SINPE y la tarjeta esta cuenta
function AccountRouting({ account }) {
  const { t } = useTranslation()
  const from = [account.general && t("banks.accounts.general"), ...account.locations.map((l) => l.name)].filter(Boolean)
  return (
    <p className="mb-4 text-sm text-muted-foreground">
      {account.number && <span className="mr-2 font-mono">{account.number}</span>}
      {from.length ? t("banks.accounts.receives", { from: from.join(", ") }) : t("banks.accounts.receivesNothing")}
    </p>
  )
}

function Movements({ account, list }) {
  const { t } = useTranslation()
  const money = fmt(account.currency)
  const queryClient = useQueryClient()
  const status = STATUSES.includes(list.get("status")) ? list.get("status") : "pending"
  const q = list.get("q")
  const { data, isLoading } = useQuery({
    queryKey: ["banks", "transactions", account.id, list.page, status, q],
    queryFn: () => getBankTransactions(account.id, { page: list.page, status, ...(q && { q }) }),
    placeholderData: keepPreviousData,
  })
  const classify = useMutation({
    mutationFn: ({ id, category }) => classifyBankTransaction(id, { category: category || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banks"] }),
  })

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select aria-label={t("banks.status.label")} className={cn(selectClass, "w-44")} value={status} onChange={(e) => list.set({ status: e.target.value === "pending" ? "" : e.target.value })}>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`banks.status.${s}`)}</option>)}
        </select>
        <SearchInput id="bank-search" value={q} onSearch={(v) => list.set({ q: v })} placeholder={t("banks.search")} className="w-full sm:w-72" />
        {data && (
          <p className="text-sm text-muted-foreground">
            <span className="text-[var(--stk-ok)]">+{money(data.totals.credits)}</span>
            {" · "}
            <span>−{money(data.totals.debits)}</span>
          </p>
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("banks.date")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("banks.reference")}</TableHead>
              <TableHead>{t("banks.description")}</TableHead>
              <TableHead className="text-right">{t("banks.amount")}</TableHead>
              <TableHead className="w-48">{t("banks.category.label")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>}
            {!isLoading && !data?.items.length && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{t(status === "pending" ? "banks.emptyPending" : "banks.emptyList")}</TableCell></TableRow>
            )}
            {data?.items.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap">{day(m.date)}</TableCell>
                <TableCell className="hidden font-mono text-xs md:table-cell">{m.reference || "—"}</TableCell>
                <TableCell className="max-w-md">
                  <span className="line-clamp-2 text-sm">{m.description}</span>
                  {m.reviewedBy && <span className="block text-xs text-muted-foreground">{t("banks.reviewedBy", { name: m.reviewedBy.name })}</span>}
                </TableCell>
                <TableCell className={cn("whitespace-nowrap text-right font-mono", Number(m.amount) > 0 && "text-[var(--stk-ok)]")}>
                  {Number(m.amount) > 0 ? "+" : "−"}
                  {money(Math.abs(Number(m.amount)))}
                </TableCell>
                <TableCell>
                  <select
                    aria-label={t("banks.category.of", { description: m.description })}
                    className={selectClass}
                    value={m.category ?? ""}
                    disabled={classify.isPending}
                    onChange={(e) => classify.mutate({ id: m.id, category: e.target.value })}
                  >
                    <option value="">{t("banks.category.none")}</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{t(`banks.category.${c}`)}</option>)}
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {classify.isError && <p role="alert" className="mt-2 text-sm text-destructive">{apiErrorMessage(classify.error, t("banks.category.error"))}</p>}
      <Pagination data={data} onPage={list.setPage} />
    </>
  )
}

function Deposits({ account, list }) {
  const { t } = useTranslation()
  const money = fmt(account.currency)
  const { data, isLoading } = useQuery({
    queryKey: ["banks", "deposits", account.id, list.page],
    queryFn: () => getCashDeposits({ bankAccountId: account.id, page: list.page }),
    placeholderData: keepPreviousData,
  })
  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("banks.date")}</TableHead>
              <TableHead>{t("banks.deposit.reference")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("banks.deposit.location")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("banks.by")}</TableHead>
              <TableHead className="text-right">{t("banks.amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>}
            {!isLoading && !data?.items.length && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{t("banks.deposit.empty")}</TableCell></TableRow>
            )}
            {data?.items.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="whitespace-nowrap">{day(d.depositedAt)}</TableCell>
                <TableCell className="font-mono text-xs">
                  {d.reference}
                  {d.note && <span className="block font-sans text-muted-foreground">{d.note}</span>}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{d.location?.name ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{d.user.name}</TableCell>
                <TableCell className="text-right font-mono">{money(d.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination data={data} onPage={list.setPage} />
    </>
  )
}

// Crear o editar una cuenta y elegir de dónde recibe el SINPE y la tarjeta
function AccountDialog({ account, onClose }) {
  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">{account && <AccountForm account={account} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function AccountForm({ account, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: () => getLocations() })
  const branches = locations.filter((l) => l.type === "BRANCH")
  const [form, setForm] = useState({
    name: account.name ?? "",
    bankName: account.bankName ?? "",
    number: account.number ?? "",
    currency: account.currency ?? "CRC",
    isActive: account.isActive ?? true,
    general: account.general ?? false,
    locationIds: account.locations?.map((l) => l.id) ?? [],
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const toggleLocation = (id) =>
    setForm({ ...form, locationIds: form.locationIds.includes(id) ? form.locationIds.filter((x) => x !== id) : [...form.locationIds, id] })
  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, name: form.name.trim(), bankName: form.bankName.trim(), number: form.number.trim() || undefined }
      return account.id ? updateBankAccount(account.id, body) : createBankAccount(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banks"] })
      queryClient.invalidateQueries({ queryKey: ["locations"] })
      onClose()
    },
  })
  const valid = form.name.trim() && form.bankName.trim()
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid && !save.isPending) save.mutate()
      }}
    >
      <DialogHeader>
        <DialogTitle>{account.id ? t("banks.accounts.edit", { name: account.name }) : t("banks.accounts.new")}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="acc-name">{t("banks.accounts.name")}</Label>
          <Input id="acc-name" required maxLength={60} placeholder={t("banks.accounts.namePlaceholder")} value={form.name} onChange={set("name")} autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-bank">{t("banks.accounts.bank")}</Label>
          <Input id="acc-bank" required maxLength={60} value={form.bankName} onChange={set("bankName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-currency">{t("banks.accounts.currency")}</Label>
          <select id="acc-currency" className={selectClass} value={form.currency} onChange={set("currency")}>
            <option value="CRC">CRC (₡)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="acc-number">{t("banks.accounts.number")}</Label>
          <Input id="acc-number" maxLength={34} className="font-mono" placeholder="CR00 0000 0000 0000 0000 00" value={form.number} onChange={set("number")} />
        </div>
      </div>
      <fieldset className="rounded-lg border border-border p-3" disabled={!form.isActive}>
        <legend className="px-1 text-sm font-medium">{t("banks.accounts.receivesTitle")}</legend>
        <p className="mb-2 text-xs text-muted-foreground">{t("banks.accounts.receivesHint")}</p>
        <label className="flex items-center gap-2 py-1 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--stk-accent)]" checked={form.general} onChange={(e) => setForm({ ...form, general: e.target.checked })} />
          {t("banks.accounts.general")}
        </label>
        {branches.map((l) => (
          <label key={l.id} className="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--stk-accent)]" checked={form.locationIds.includes(l.id)} onChange={() => toggleLocation(l.id)} />
            {l.name}
          </label>
        ))}
      </fieldset>
      {account.id && (
        <div className="flex items-center gap-2">
          <Switch id="acc-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          <Label htmlFor="acc-active">{t("banks.accounts.active")}</Label>
        </div>
      )}
      {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("banks.accounts.error"))}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={!valid || save.isPending}>{t("common.save")}</Button>
      </div>
    </form>
  )
}

// Importar el estado del banco: leer el archivo, revisar columnas y lo que se va a importar, importar
function ImportDialog({ open, account, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">{open && account && <ImportBody account={account} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function ImportBody({ account, onClose }) {
  const { t } = useTranslation()
  const money = fmt(account.currency)
  const queryClient = useQueryClient()
  const [file, setFile] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [mapping, setMapping] = useState({})
  const [readError, setReadError] = useState("")
  const run = useMutation({
    mutationFn: (rows) => importBankStatement(account.id, { fileName: file.name, rows }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banks"] }),
  })

  async function handleFile(f) {
    setFile(f)
    setSheet(null)
    setReadError("")
    run.reset()
    if (!f) return
    try {
      const rows = await readStatement(f)
      if (rows.length < 2) return setReadError(t("banks.import.empty"))
      setSheet(rows)
      setMapping(detectBankColumns(rows))
    } catch {
      setReadError(t("banks.import.unreadable"))
    }
  }

  const missing = sheet ? missingBankFields(mapping) : []
  const built = sheet && !missing.length ? buildBankRows(sheet, mapping) : null
  const credits = built?.rows.filter((r) => r.amount > 0) ?? []
  const debits = built?.rows.filter((r) => r.amount < 0) ?? []
  const headers = sheet?.[0].cells ?? []

  if (run.data) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>{t("banks.import.done")}</DialogTitle>
        </DialogHeader>
        <p>{t("banks.import.result", { inserted: run.data.inserted, duplicates: run.data.duplicates })}</p>
        <div className="flex justify-end">
          <Button autoFocus onClick={onClose}>{t("banks.import.close")}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t("banks.import.title", { name: account.name })}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">{t("banks.import.hint")}</p>
      <Input type="file" accept=".csv,.txt,.xlsx" aria-label={t("banks.import.file")} onChange={(e) => handleFile(e.target.files?.[0])} />
      {readError && <p role="alert" className="text-sm text-destructive">{readError}</p>}

      {sheet && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:grid-cols-3">
          {FIELDS.map(({ field }) => (
            <div key={field} className="space-y-1">
              <Label htmlFor={`map-${field}`} className="text-xs">{t(`banks.import.fields.${field}`)}</Label>
              <select
                id={`map-${field}`}
                className={selectClass}
                value={mapping[field] ?? ""}
                onChange={(e) => setMapping({ ...mapping, [field]: e.target.value === "" ? undefined : Number(e.target.value) })}
              >
                <option value="">—</option>
                {headers.map((h, i) => <option key={i} value={i}>{String(h || `#${i + 1}`)}</option>)}
              </select>
            </div>
          ))}
          {missing.length > 0 && (
            <p role="alert" className="col-span-full text-sm text-destructive">
              {t("banks.import.missing", { fields: missing.map((f) => t(`banks.import.fields.${f}`)).join(", ") })}
            </p>
          )}
        </div>
      )}

      {built && (
        <>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <p className="rounded-lg bg-muted px-3 py-2">
              <span className="block text-xs text-muted-foreground">{t("banks.import.rows")}</span>
              <span className="font-mono text-lg font-semibold">{built.rows.length}</span>
            </p>
            <p className="rounded-lg bg-[var(--stk-ok-bg)] px-3 py-2 text-[var(--stk-ok)]">
              <span className="block text-xs opacity-80">{t("banks.import.credits", { count: credits.length })}</span>
              <span className="font-mono font-semibold">{money(credits.reduce((s, r) => s + r.amount, 0))}</span>
            </p>
            <p className="rounded-lg bg-muted px-3 py-2">
              <span className="block text-xs text-muted-foreground">{t("banks.import.debits", { count: debits.length })}</span>
              <span className="font-mono font-semibold">{money(Math.abs(debits.reduce((s, r) => s + r.amount, 0)))}</span>
            </p>
          </div>
          {built.skipped > 0 && <p className="text-xs text-muted-foreground">{t("banks.import.skipped", { count: built.skipped })}</p>}
          <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
            {built.rows.slice(0, 8).map((r, i) => (
              <li key={i} className="flex gap-3 px-3 py-1.5">
                <span className="whitespace-nowrap text-muted-foreground">{r.date}</span>
                <span className="flex-1 truncate">{r.description}</span>
                <span className={cn("font-mono", r.amount > 0 && "text-[var(--stk-ok)]")}>{r.amount > 0 ? "+" : "−"}{money(Math.abs(r.amount))}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {run.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(run.error, t("banks.import.error"))}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button disabled={!built?.rows.length || run.isPending} onClick={() => run.mutate(built.rows)}>
          {t("banks.import.submit", { count: built?.rows.length ?? 0 })}
        </Button>
      </div>
    </div>
  )
}
