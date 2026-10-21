import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { AlertTriangle, ArrowLeft, HandCoins, Printer } from "lucide-react"
import { getAccount, getReceipt, getReceivables } from "@/api/receivables"
import { useListParams } from "@/hoocks/useListParams"
import { useMoney } from "@/hoocks/useMoney"
import { usePermissions } from "@/hoocks/usePermissions"
import { formatFiscalId } from "@/lib/fiscal"
import { Pagination } from "@/components/Pagination"
import { SearchInput } from "@/components/SearchInput"
import { PaymentDialog } from "@/components/pos/PaymentDialog"
import { PaymentReceipt } from "@/components/pos/PaymentReceipt"
import { CreditLimitDialog } from "@/components/receivables/CreditLimitDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

const day = (d) => (d ? new Date(d).toLocaleDateString("es-CR", { timeZone: "UTC" }) : "—")
const when = (d) => new Date(d).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" })
// vencida = su día ya pasó (como el servidor: fecha local, sin hora)
const today = () => new Date().toLocaleDateString("en-CA")
const isLate = (i) => Number(i.paid) < Number(i.amount) && i.dueDate.slice(0, 10) < today()

// Cuentas por cobrar (receivables.manage): clientes con crédito o saldo, lo vencido primero
export function Receivables() {
  const { t } = useTranslation()
  const money = useMoney()
  const navigate = useNavigate()
  const list = useListParams()
  const q = list.get("q")
  const overdue = list.get("overdue") === "1"
  const { data, isLoading } = useQuery({
    queryKey: ["receivables", "list", list.page, q, overdue],
    queryFn: () => getReceivables({ page: list.page, ...(q && { q }), ...(overdue && { overdue: "1" }) }),
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("receivables.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("receivables.subtitle")}</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:max-w-md">
        <Kpi label={t("receivables.totalBalance")} value={money.format(data?.totals.balance ?? 0)} />
        <Kpi label={t("receivables.totalOverdue")} value={money.format(data?.totals.overdue ?? 0)} danger={data?.totals.overdue > 0} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <SearchInput id="receivables-search" value={q} onSearch={(v) => list.set({ q: v })} placeholder={t("receivables.search")} className="w-full sm:w-72" />
        <div className="flex items-center gap-2">
          <Switch id="only-overdue" checked={overdue} onCheckedChange={(v) => list.set({ overdue: v ? "1" : "" })} />
          <Label htmlFor="only-overdue">{t("receivables.onlyOverdue")}</Label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("receivables.customer")}</TableHead>
              <TableHead className="hidden text-right md:table-cell">{t("receivables.limit.label")}</TableHead>
              <TableHead className="text-right">{t("receivables.balance")}</TableHead>
              <TableHead className="text-right">{t("receivables.overdue")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("receivables.nextDue")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>}
            {!isLoading && items.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{t("receivables.empty")}</TableCell></TableRow>
            )}
            {items.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/receivables/${r.id}`)}>
                <TableCell>
                  <Link to={`/receivables/${r.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{r.name}</Link>
                  <span className="block text-xs text-muted-foreground">{formatFiscalId(t, r.idType, r.idNumber)}</span>
                </TableCell>
                <TableCell className="hidden text-right font-mono md:table-cell">{r.creditLimit == null ? "—" : money.format(r.creditLimit)}</TableCell>
                <TableCell className="text-right font-mono">{money.format(r.balance)}</TableCell>
                <TableCell className="text-right">
                  {r.overdueCount > 0 ? (
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
      <Pagination data={data} onPage={list.setPage} />
    </div>
  )
}

// Estado de cuenta de un cliente: saldo, cuotas y abonos; abono sin caja y límite de crédito
export function ReceivableAccount() {
  const { t } = useTranslation()
  const money = useMoney()
  const { can } = usePermissions()
  const { id } = useParams()
  const [paying, setPaying] = useState(false)
  const [limiting, setLimiting] = useState(false)
  const [receiptId, setReceiptId] = useState(null)
  const { data: account, isLoading } = useQuery({ queryKey: ["receivables", id], queryFn: () => getAccount(id) })
  if (isLoading || !account) return <p className="text-muted-foreground">{t("common.loading")}</p>
  const c = account.customer

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3" render={<Link to="/receivables" />}>
        <ArrowLeft />
        {t("receivables.title")}
      </Button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{c.name}</h1>
          <p className="text-sm text-muted-foreground">{[formatFiscalId(t, c.idType, c.idNumber), c.phone, c.email].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("credit.manage") && (
            <Button variant="outline" onClick={() => setLimiting(true)}>{t("receivables.limit.change")}</Button>
          )}
          <Button disabled={!(account.balance > 0)} onClick={() => setPaying(true)}>
            <HandCoins />
            {t("receivables.pay.button")}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("receivables.limit.label")} value={account.creditLimit == null ? t("customers.cash") : money.format(account.creditLimit)} />
        <Kpi label={t("receivables.balance")} value={money.format(account.balance)} />
        <Kpi label={t("pos.credit.available")} value={money.format(account.available)} />
        <Kpi label={t("receivables.overdue")} value={money.format(account.overdue)} danger={account.overdueCount > 0} />
      </div>

      <h2 className="mb-2 text-lg font-semibold">{t("receivables.installments")}</h2>
      <div className="mb-6 overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("receivables.dueDate")}</TableHead>
              <TableHead>{t("receivables.sale")}</TableHead>
              <TableHead className="text-right">{t("receivables.amount")}</TableHead>
              <TableHead className="text-right">{t("receivables.pending")}</TableHead>
              <TableHead className="text-right">{t("receivables.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {account.installments.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">{t("receivables.noInstallments")}</TableCell></TableRow>
            )}
            {account.installments.map((i) => {
              const pending = Number(i.amount) - Number(i.paid)
              return (
                <TableRow key={i.id}>
                  <TableCell className="whitespace-nowrap">{day(i.dueDate)}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{i.document.consecutive}</span>
                    <span className="block text-xs text-muted-foreground">{t("receivables.installment", { n: i.number })} · {t(`pos.credit.${i.frequency}`)}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{money.format(i.amount)}</TableCell>
                  <TableCell className="text-right font-mono">{money.format(pending)}</TableCell>
                  <TableCell className="text-right">
                    {pending <= 0 ? (
                      <Badge variant="secondary">{t("receivables.paid")}</Badge>
                    ) : isLate(i) ? (
                      <Badge className="bg-[var(--stk-crit-bg)] text-[var(--stk-crit)]">{t("receivables.late")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("receivables.upcoming")}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <h2 className="mb-2 text-lg font-semibold">{t("receivables.payments")}</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("receivables.date")}</TableHead>
              <TableHead>{t("pos.charge.method")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("receivables.pay.reference")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("receivables.by")}</TableHead>
              <TableHead className="text-right">{t("receivables.amount")}</TableHead>
              <TableHead className="text-right">{t("receivables.after")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {account.payments.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">{t("receivables.noPayments")}</TableCell></TableRow>
            )}
            {account.payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap">{when(p.createdAt)}</TableCell>
                <TableCell>
                  {t(`pos.methods.${p.method}`)}
                  <span className="block text-xs text-muted-foreground">{p.cashSessionId ? t("receivables.atRegister") : t("receivables.offRegister")}</span>
                </TableCell>
                <TableCell className="hidden font-mono text-xs md:table-cell">{p.reference || "—"}</TableCell>
                <TableCell className="hidden sm:table-cell">{p.user.name}</TableCell>
                <TableCell className="text-right font-mono">{money.format(p.amount)}</TableCell>
                <TableCell className="text-right font-mono">{money.format(p.balanceAfter)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" aria-label={t("receivables.receipt.reprint")} title={t("receivables.receipt.reprint")} onClick={() => setReceiptId(p.id)}>
                    <Printer />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaymentDialog customer={paying ? c : null} inRegister={false} onClose={() => setPaying(false)} />
      <CreditLimitDialog customer={limiting ? { ...c, creditLimit: account.creditLimit } : null} onClose={() => setLimiting(false)} />
      <ReceiptDialog id={receiptId} onClose={() => setReceiptId(null)} />
    </div>
  )
}

function ReceiptDialog({ id, onClose }) {
  const { t } = useTranslation()
  const { data } = useQuery({ queryKey: ["receivables", "receipt", id], queryFn: () => getReceipt(id), enabled: !!id })
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("receivables.receipt.title")}</DialogTitle>
        </DialogHeader>
        {data && <PaymentReceipt data={data} />}
        <Button variant="outline" onClick={() => window.print()} disabled={!data}>
          <Printer />
          {t("pos.print")}
        </Button>
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
