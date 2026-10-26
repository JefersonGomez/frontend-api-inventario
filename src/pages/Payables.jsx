import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { AlertTriangle, ArrowLeft, Ban, FilePlus2, Wallet } from "lucide-react"
import { createSupplierInvoice, getPayables, getSupplierAccount, getSupplierInvoices, paySupplier, voidSupplierInvoice } from "@/api/payables"
import { getSuppliers } from "@/api/suppliers"
import { BankAccountSelect } from "@/components/banks/DepositDialog"
import { useListParams } from "@/hoocks/useListParams"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { formatFiscalId } from "@/lib/fiscal"
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

const day = (d) => (d ? new Date(d).toLocaleDateString("es-CR", { timeZone: "UTC" }) : "—")
const today = () => new Date().toLocaleDateString("en-CA")
const round2 = (v) => Math.round(v * 100) / 100
const pendingOf = (i) => round2(Number(i.total) - Number(i.paid))
const AGING = ["current", "d30", "d60", "d90", "over90"]
const STATUSES = ["open", "overdue", "paid", "void"]
const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm"

function InvoiceStatus({ invoice }) {
  const { t } = useTranslation()
  if (invoice.voidedAt) return <Badge variant="outline" className="text-muted-foreground">{t("payables.status.void")}</Badge>
  if (pendingOf(invoice) <= 0) return <Badge variant="secondary">{t("payables.status.paid")}</Badge>
  if (invoice.dueDate.slice(0, 10) < today()) return <Badge className="bg-[var(--stk-crit-bg)] text-[var(--stk-crit)]">{t("payables.status.overdue")}</Badge>
  return <Badge variant="outline">{t("payables.status.open")}</Badge>
}

// Cuentas por pagar (payables.manage): proveedores con saldo (lo vencido primero) o la lista de facturas
export function Payables() {
  const { t } = useTranslation()
  const money = useMoney()
  const navigate = useNavigate()
  const list = useListParams()
  const q = list.get("q")
  const view = list.get("view") === "invoices" ? "invoices" : "suppliers"
  const status = STATUSES.includes(list.get("status")) ? list.get("status") : "open"
  const overdue = list.get("overdue") === "1"
  const [creating, setCreating] = useState(false)

  const suppliers = useQuery({
    queryKey: ["payables", "list", list.page, q, overdue],
    queryFn: () => getPayables({ page: list.page, ...(q && { q }), ...(overdue && { overdue: "1" }) }),
    placeholderData: keepPreviousData,
  })
  const invoices = useQuery({
    queryKey: ["payables", "invoices", list.page, q, status],
    queryFn: () => getSupplierInvoices({ page: list.page, status, ...(q && { q }) }),
    placeholderData: keepPreviousData,
    enabled: view === "invoices",
  })
  const totals = suppliers.data?.totals

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("payables.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("payables.subtitle")}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <FilePlus2 />
          {t("payables.invoice.new")}
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <Kpi label={t("payables.totalBalance")} value={money.format(totals?.balance ?? 0)} />
        <Kpi label={t("payables.totalOverdue")} value={money.format(totals?.overdue ?? 0)} danger={totals?.overdue > 0} />
      </div>
      {totals?.balance > 0 && (
        <div className="mb-6">
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">{t("payables.aging.title")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {AGING.map((b) => (
              <div key={b} className={cn("rounded-lg border border-border px-3 py-2", b !== "current" && totals.aging[b] > 0 && "text-[var(--stk-crit)]")}>
                <p className="text-xs opacity-70">{t(`payables.aging.${b}`)}</p>
                <p className="font-mono text-sm font-semibold">{money.format(totals.aging[b])}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="inline-flex rounded-lg border border-border p-0.5" role="tablist">
          {["suppliers", "invoices"].map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              className={cn("rounded-md px-3 py-1.5 text-sm", view === v ? "bg-[var(--stk-accent)] text-[var(--stk-accent-fg)]" : "text-muted-foreground hover:text-foreground")}
              onClick={() => list.set({ view: v === "invoices" ? v : "" })}
            >
              {t(`payables.view.${v}`)}
            </button>
          ))}
        </div>
        <SearchInput id="payables-search" value={q} onSearch={(v) => list.set({ q: v })} placeholder={t(view === "invoices" ? "payables.searchInvoices" : "payables.search")} className="w-full sm:w-72" />
        {view === "suppliers" ? (
          <div className="flex items-center gap-2">
            <Switch id="only-overdue" checked={overdue} onCheckedChange={(v) => list.set({ overdue: v ? "1" : "" })} />
            <Label htmlFor="only-overdue">{t("payables.onlyOverdue")}</Label>
          </div>
        ) : (
          <select aria-label={t("payables.status.label")} className={cn(selectClass, "w-40")} value={status} onChange={(e) => list.set({ status: e.target.value === "open" ? "" : e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`payables.status.${s}`)}</option>)}
          </select>
        )}
      </div>

      {view === "suppliers" ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("payables.supplier")}</TableHead>
                  <TableHead className="hidden text-right md:table-cell">{t("payables.invoices")}</TableHead>
                  <TableHead className="text-right">{t("payables.balance")}</TableHead>
                  <TableHead className="text-right">{t("payables.overdue")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("payables.nextDue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>}
                {!suppliers.isLoading && !suppliers.data?.items.length && (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{t("payables.empty")}</TableCell></TableRow>
                )}
                {suppliers.data?.items.map((r) => (
                  <TableRow key={r.supplier.id} className="cursor-pointer" onClick={() => navigate(`/payables/${r.supplier.id}`)}>
                    <TableCell>
                      <Link to={`/payables/${r.supplier.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{r.supplier.name}</Link>
                      <span className="block text-xs text-muted-foreground">{t("payables.daysShort", { count: r.supplier.creditDays })}</span>
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">{r.invoices}</TableCell>
                    <TableCell className="text-right font-mono">{money.format(r.balance)}</TableCell>
                    <TableCell className="text-right">
                      {r.overdue > 0 ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[var(--stk-crit)]">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                          {money.format(r.overdue)}
                        </span>
                      ) : (
                        <span className="font-mono text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap sm:table-cell">{day(r.nextDue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination data={suppliers.data} onPage={list.setPage} />
        </>
      ) : (
        <>
          <InvoiceTable invoices={invoices.data?.items} loading={invoices.isLoading} showSupplier />
          <Pagination data={invoices.data} onPage={list.setPage} />
        </>
      )}

      <InvoiceDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

// Estado de cuenta con un proveedor: facturas, pagos, registrar factura y pagar
export function PayableAccount() {
  const { t } = useTranslation()
  const money = useMoney()
  const { id } = useParams()
  const [creating, setCreating] = useState(false)
  const [paying, setPaying] = useState(false)
  const { data: account, isLoading } = useQuery({ queryKey: ["payables", id], queryFn: () => getSupplierAccount(id) })
  if (isLoading || !account) return <p className="text-muted-foreground">{t("common.loading")}</p>
  const s = account.supplier

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3" render={<Link to="/payables" />}>
        <ArrowLeft />
        {t("payables.title")}
      </Button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{s.name}</h1>
          <p className="text-sm text-muted-foreground">{[formatFiscalId(t, s.idType, s.idNumber), s.phone, s.email].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setCreating(true)}>
            <FilePlus2 />
            {t("payables.invoice.new")}
          </Button>
          <Button disabled={!(account.balance > 0)} onClick={() => setPaying(true)}>
            <Wallet />
            {t("payables.pay.button")}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label={t("payables.balance")} value={money.format(account.balance)} />
        <Kpi label={t("payables.overdue")} value={money.format(account.overdue)} danger={account.overdue > 0} />
        <Kpi label={t("payables.creditDays")} value={t("payables.daysShort", { count: s.creditDays })} />
      </div>

      <h2 className="mb-2 text-lg font-semibold">{t("payables.invoices")}</h2>
      <div className="mb-6">
        <InvoiceTable invoices={account.invoices} canVoid />
      </div>

      <h2 className="mb-2 text-lg font-semibold">{t("payables.payments")}</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("payables.date")}</TableHead>
              <TableHead>{t("pos.charge.method")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("payables.pay.reference")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("payables.pay.appliedTo")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("payables.by")}</TableHead>
              <TableHead className="text-right">{t("payables.amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {account.payments.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">{t("payables.noPayments")}</TableCell></TableRow>
            )}
            {account.payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap">{day(p.paidAt)}</TableCell>
                <TableCell>{t(`pos.methods.${p.method}`)}</TableCell>
                <TableCell className="hidden font-mono text-xs md:table-cell">{p.reference || "—"}</TableCell>
                <TableCell className="hidden text-xs lg:table-cell">{p.allocations.map((a) => a.invoice.number).join(", ")}</TableCell>
                <TableCell className="hidden sm:table-cell">{p.user.name}</TableCell>
                <TableCell className="text-right font-mono">{money.format(p.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <InvoiceDialog open={creating} supplier={s} onClose={() => setCreating(false)} />
      <PayDialog open={paying} account={account} onClose={() => setPaying(false)} />
    </div>
  )
}

function InvoiceTable({ invoices, loading, showSupplier, canVoid }) {
  const { t } = useTranslation()
  const money = useMoney()
  const [voiding, setVoiding] = useState(null)
  const cols = 6 + (showSupplier ? 1 : 0) + (canVoid ? 1 : 0)
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("payables.invoice.number")}</TableHead>
            {showSupplier && <TableHead>{t("payables.supplier")}</TableHead>}
            <TableHead className="hidden md:table-cell">{t("payables.invoice.issueDate")}</TableHead>
            <TableHead>{t("payables.invoice.dueDate")}</TableHead>
            <TableHead className="hidden text-right sm:table-cell">{t("payables.invoice.total")}</TableHead>
            <TableHead className="text-right">{t("payables.pending")}</TableHead>
            <TableHead className="text-right">{t("payables.status.label")}</TableHead>
            {canVoid && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && <TableRow><TableCell colSpan={cols} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>}
          {!loading && !invoices?.length && (
            <TableRow><TableCell colSpan={cols} className="py-6 text-center text-muted-foreground">{t("payables.noInvoices")}</TableCell></TableRow>
          )}
          {invoices?.map((i) => (
            <TableRow key={i.id} className={cn(i.voidedAt && "text-muted-foreground")}>
              <TableCell>
                <span className={cn("font-mono text-sm", i.voidedAt && "line-through")}>{i.number}</span>
                {(i.voidReason || i.note) && <span className="block text-xs text-muted-foreground">{i.voidReason || i.note}</span>}
              </TableCell>
              {showSupplier && (
                <TableCell><Link to={`/payables/${i.supplier.id}`} className="hover:underline">{i.supplier.name}</Link></TableCell>
              )}
              <TableCell className="hidden whitespace-nowrap md:table-cell">{day(i.issueDate)}</TableCell>
              <TableCell className="whitespace-nowrap">{day(i.dueDate)}</TableCell>
              <TableCell className="hidden text-right font-mono sm:table-cell">{money.format(i.total)}</TableCell>
              <TableCell className="text-right font-mono">{i.voidedAt ? "—" : money.format(pendingOf(i))}</TableCell>
              <TableCell className="text-right"><InvoiceStatus invoice={i} /></TableCell>
              {canVoid && (
                <TableCell className="text-right">
                  {!i.voidedAt && Number(i.paid) === 0 && (
                    <Button variant="ghost" size="icon-sm" aria-label={t("payables.void.button", { number: i.number })} title={t("payables.void.button", { number: i.number })} onClick={() => setVoiding(i)}>
                      <Ban />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <VoidDialog invoice={voiding} onClose={() => setVoiding(null)} />
    </div>
  )
}

// Factura suelta (o de una orden ya recibida). Sin vencimiento: fecha + días de crédito del proveedor.
function InvoiceDialog({ open, supplier, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">{open && <InvoiceForm supplier={supplier} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function InvoiceForm({ supplier, onClose }) {
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers", "all"], queryFn: () => getSuppliers(), enabled: !supplier })
  const [form, setForm] = useState({ supplierId: supplier?.id ?? "", number: "", issueDate: today(), dueDate: "", subtotal: "", tax: "", note: "" })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const chosen = supplier ?? suppliers.find((s) => s.id === form.supplierId)
  const total = (Number(form.subtotal) || 0) + (Number(form.tax) || 0)
  const save = useMutation({
    mutationFn: () =>
      createSupplierInvoice({
        supplierId: form.supplierId,
        number: form.number.trim(),
        issueDate: form.issueDate,
        subtotal: Number(form.subtotal) || 0,
        tax: Number(form.tax) || 0,
        ...(form.dueDate && { dueDate: form.dueDate }),
        ...(form.note.trim() && { note: form.note.trim() }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] })
      onClose()
    },
  })
  const valid = form.supplierId && form.number.trim() && form.issueDate && total > 0
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid && !save.isPending) save.mutate()
      }}
    >
      <DialogHeader>
        <DialogTitle>{supplier ? t("payables.invoice.titleFor", { name: supplier.name }) : t("payables.invoice.new")}</DialogTitle>
      </DialogHeader>
      {!supplier && (
        <div className="space-y-2">
          <Label htmlFor="inv-supplier">{t("payables.supplier")}</Label>
          <select id="inv-supplier" required className={selectClass} value={form.supplierId} onChange={set("supplierId")}>
            <option value="">{t("payables.invoice.pickSupplier")}</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="inv-number">{t("payables.invoice.number")}</Label>
          <Input id="inv-number" required maxLength={50} className="font-mono" value={form.number} onChange={set("number")} autoFocus={!!supplier} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inv-issue">{t("payables.invoice.issueDate")}</Label>
          <Input id="inv-issue" type="date" required value={form.issueDate} onChange={set("issueDate")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inv-due">{t("payables.invoice.dueDate")}</Label>
          <Input id="inv-due" type="date" min={form.issueDate} value={form.dueDate} onChange={set("dueDate")} />
        </div>
        <p className="col-span-2 -mt-1 text-xs text-muted-foreground">{t("payables.invoice.dueHint", { count: chosen?.creditDays ?? 0 })}</p>
        <div className="space-y-2">
          <Label htmlFor="inv-subtotal">{t("payables.invoice.subtotal")}</Label>
          <Input id="inv-subtotal" type="number" min={0} step="0.01" required className="font-mono" value={form.subtotal} onChange={set("subtotal")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inv-tax">{t("payables.invoice.tax")}</Label>
          <Input id="inv-tax" type="number" min={0} step="0.01" className="font-mono" value={form.tax} onChange={set("tax")} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="inv-note">{t("payables.pay.note")}</Label>
          <Input id="inv-note" maxLength={200} value={form.note} onChange={set("note")} />
        </div>
      </div>
      <p className="flex justify-between rounded-lg bg-muted px-3 py-2">
        <span>{t("payables.invoice.total")}</span>
        <span className="font-mono font-semibold">{money.format(total)}</span>
      </p>
      {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("payables.invoice.error"))}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={!valid || save.isPending}>{t("payables.invoice.save")}</Button>
      </div>
    </form>
  )
}

// Pago al proveedor: sin facturas marcadas se aplica de la que vence primero
function PayDialog({ open, account, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">{open && <PayForm account={account} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function PayForm({ account, onClose }) {
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const open = account.invoices.filter((i) => !i.voidedAt && pendingOf(i) > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const [picked, setPicked] = useState([])
  const [form, setForm] = useState({ amount: "", method: "TRANSFER", reference: "", paidAt: today(), note: "", bankAccountId: "" })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const selection = picked.length ? open.filter((i) => picked.includes(i.id)) : open
  const max = round2(selection.reduce((s, i) => s + pendingOf(i), 0))
  const amount = Number(form.amount) || 0
  const pay = useMutation({
    mutationFn: () =>
      paySupplier({
        supplierId: account.supplier.id,
        amount,
        method: form.method,
        paidAt: form.paidAt,
        ...(form.reference.trim() && { reference: form.reference.trim() }),
        ...(form.note.trim() && { note: form.note.trim() }),
        ...(picked.length && { invoiceIds: picked }),
        ...(form.method !== "CASH" && form.bankAccountId && { bankAccountId: form.bankAccountId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] })
      onClose()
    },
  })
  const toggle = (id) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]
    setPicked(next)
    // al marcar facturas, el monto pasa a ser lo que deben
    const total = round2((next.length ? open.filter((i) => next.includes(i.id)) : []).reduce((s, i) => s + pendingOf(i), 0))
    setForm({ ...form, amount: next.length ? String(total) : "" })
  }
  const valid = amount > 0 && amount <= max && (form.method === "CASH" || form.reference.trim())
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid && !pay.isPending) pay.mutate()
      }}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" aria-hidden />
          {t("payables.pay.title", { name: account.supplier.name })}
        </DialogTitle>
      </DialogHeader>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t("payables.pay.which")}</legend>
        <ul className="max-h-44 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
          {open.map((i) => (
            <li key={i.id}>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5">
                <input type="checkbox" className="size-4 accent-[var(--stk-accent)]" checked={picked.includes(i.id)} onChange={() => toggle(i.id)} />
                <span className="font-mono">{i.number}</span>
                <span className={cn("text-xs text-muted-foreground", i.dueDate.slice(0, 10) < today() && "text-[var(--stk-crit)]")}>{day(i.dueDate)}</span>
                <span className="ml-auto font-mono">{money.format(pendingOf(i))}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-muted-foreground">{t("payables.pay.whichHint")}</p>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="pay-amount">{t("payables.amount")}</Label>
        <Input id="pay-amount" type="number" min="0.01" max={max} step="0.01" required className="h-12 font-mono text-2xl" value={form.amount} onChange={set("amount")} />
        <div className="flex flex-wrap gap-2">
          {account.overdue > 0 && !picked.length && (
            <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, amount: String(account.overdue) })}>{t("payables.pay.allOverdue")}</Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, amount: String(max) })}>
            {picked.length ? t("payables.pay.allPicked") : t("payables.pay.all")}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="pay-method">{t("pos.charge.method")}</Label>
          <select id="pay-method" className={selectClass} value={form.method} onChange={set("method")}>
            {["TRANSFER", "SINPE", "CASH", "CARD", "OTHER"].map((m) => <option key={m} value={m}>{t(`pos.methods.${m}`)}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pay-date">{t("payables.date")}</Label>
          <Input id="pay-date" type="date" max={today()} required value={form.paidAt} onChange={set("paidAt")} />
        </div>
        {form.method !== "CASH" && (
          <div className="col-span-2">
            <BankAccountSelect id="pay-bank" value={form.bankAccountId} onChange={(v) => setForm({ ...form, bankAccountId: v })} />
          </div>
        )}
        <div className="col-span-2 space-y-2">
          <Label htmlFor="pay-reference">{t("payables.pay.reference")}</Label>
          <Input id="pay-reference" required={form.method !== "CASH"} maxLength={60} className="font-mono" value={form.reference} onChange={set("reference")} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="pay-note">{t("payables.pay.note")}</Label>
          <Input id="pay-note" maxLength={200} value={form.note} onChange={set("note")} />
        </div>
      </div>
      {amount > 0 && amount <= max && (
        <p className="flex justify-between rounded-lg bg-[var(--stk-accent-soft)] px-3 py-2 text-sm">
          <span>{t("payables.pay.newBalance")}</span>
          <span className="font-mono font-semibold">{money.format(round2(account.balance - amount))}</span>
        </p>
      )}
      {pay.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(pay.error, t("payables.pay.error"))}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={!valid || pay.isPending}>{t("payables.pay.submit")}</Button>
      </div>
    </form>
  )
}

function VoidDialog({ invoice, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState("")
  const done = () => {
    setReason("")
    onClose()
  }
  const voiding = useMutation({
    mutationFn: () => voidSupplierInvoice(invoice.id, reason.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] })
      done()
    },
  })
  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && done()}>
      <DialogContent className="sm:max-w-sm">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (reason.trim() && !voiding.isPending) voiding.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("payables.void.title", { number: invoice?.number })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("payables.void.hint")}</p>
          <div className="space-y-2">
            <Label htmlFor="void-reason">{t("payables.void.reason")}</Label>
            <Input id="void-reason" required maxLength={200} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {voiding.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(voiding.error, t("payables.void.error"))}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={done}>{t("common.cancel")}</Button>
            <Button type="submit" variant="destructive" disabled={!reason.trim() || voiding.isPending}>{t("payables.void.submit")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Kpi({ label, value, danger }) {
  return (
    <div className={cn("rounded-xl border border-border px-4 py-3", danger && "border-transparent bg-[var(--stk-crit-bg)] text-[var(--stk-crit)]")}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="font-mono text-xl font-semibold">{value}</p>
    </div>
  )
}
