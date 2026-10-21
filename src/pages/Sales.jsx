import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Printer, Undo2 } from "lucide-react"
import { getSale, getSales } from "@/api/sales"
import { useListParams } from "@/hoocks/useListParams"
import { useMoney } from "@/hoocks/useMoney"
import { usePermissions } from "@/hoocks/usePermissions"
import { Pagination } from "@/components/Pagination"
import { SearchInput } from "@/components/SearchInput"
import { Ticket } from "@/components/pos/Ticket"
import { ReturnFlow } from "@/components/sales/ReturnFlow"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const when = (d) => new Date(d).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" })

// Ventas: tiquetes, facturas y notas de crédito con filtros; el detalle reimprime y devuelve
export function Sales() {
  const { t } = useTranslation()
  const money = useMoney()
  const navigate = useNavigate()
  const list = useListParams()
  const q = list.get("q")
  const kind = list.get("kind") || "all"
  const from = list.get("from")
  const to = list.get("to")
  const { data, isLoading } = useQuery({
    queryKey: ["sales", "list", list.page, q, kind, from, to],
    queryFn: () => getSales({ page: list.page, ...(q && { q }), ...(kind !== "all" && { kind }), ...(from && { from }), ...(to && { to }) }),
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []
  const kinds = [
    { value: "all", label: t("sales.kinds.all") },
    { value: "SALE", label: t("sales.kinds.SALE") },
    { value: "CREDIT_NOTE", label: t("sales.kinds.CREDIT_NOTE") },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("sales.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("sales.subtitle")}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput id="sales-search" value={q} onSearch={(v) => list.set({ q: v })} placeholder={t("sales.search")} className="w-full sm:w-64" />
        <Select items={kinds} value={kind} onValueChange={(v) => list.set({ kind: v === "all" ? "" : v })}>
          <SelectTrigger className="w-44" aria-label={t("sales.kind")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kinds.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <Label htmlFor="sales-from" className="text-xs">{t("sales.from")}</Label>
          <Input id="sales-from" type="date" className="w-40" value={from} onChange={(e) => list.set({ from: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sales-to" className="text-xs">{t("sales.to")}</Label>
          <Input id="sales-to" type="date" className="w-40" value={to} onChange={(e) => list.set({ to: e.target.value })} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("sales.date")}</TableHead>
              <TableHead>{t("sales.number")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("sales.customer")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("sales.register")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("sales.cashier")}</TableHead>
              <TableHead className="text-right">{t("sales.total")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>}
            {!isLoading && items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">{t("sales.empty")}</TableCell></TableRow>
            )}
            {items.map((d) => (
              <TableRow key={d.id} className="cursor-pointer" onClick={() => navigate(`/sales/${d.id}`)}>
                <TableCell className="whitespace-nowrap">{when(d.issuedAt)}</TableCell>
                <TableCell>
                  <Link to={`/sales/${d.id}`} className="font-mono text-xs hover:underline" onClick={(e) => e.stopPropagation()}>{d.consecutive.slice(-10)}</Link>
                  <span className="ml-2 inline-flex gap-1">
                    <Badge variant={d.type === "CREDIT_NOTE" ? "destructive" : "secondary"}>{t(`sales.types.${d.type}`)}</Badge>
                    {d.saleCondition === "CREDIT" && <Badge variant="outline">{t("pos.modes.CREDIT")}</Badge>}
                    {d._count.referencedBy > 0 && <Badge variant="outline">{t("sales.withReturns")}</Badge>}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">{d.customer?.name ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">{d.cashSession ? `${d.cashSession.register.name} · ${d.cashSession.register.location.name}` : "—"}</TableCell>
                <TableCell className="hidden sm:table-cell">{d.createdBy.name}</TableCell>
                <TableCell className="text-right font-mono">{d.type === "CREDIT_NOTE" ? "−" : ""}{money.format(d.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination data={data} onPage={list.setPage} />
    </div>
  )
}

// Detalle: el tiquete (reimprimir), lo devuelto y sus notas de crédito; botón para devolver
export function SaleDetail() {
  const { t } = useTranslation()
  const money = useMoney()
  const { can } = usePermissions()
  const { id } = useParams()
  const [returning, setReturning] = useState(false)
  const { data: sale, isLoading } = useQuery({ queryKey: ["sales", id], queryFn: () => getSale(id) })
  if (isLoading || !sale) return <p className="text-muted-foreground">{t("common.loading")}</p>
  const doc = sale.document
  const isNote = doc.type === "CREDIT_NOTE"
  const allBack = doc.lines.every((l) => (sale.returned[l.id] ?? 0) >= Number(l.quantity))
  const expired = sale.returnUntil && new Date(sale.returnUntil) < new Date()

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3" render={<Link to="/sales" />}>
        <ArrowLeft />
        {t("sales.title")}
      </Button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t(`sales.types.${doc.type}`)} {doc.consecutive.slice(-10)}</h1>
          <p className="text-sm text-muted-foreground">
            {when(doc.issuedAt)} · {money.format(doc.total)}
            {doc.referenceDocument && (
              <> · {t("sales.fixes")} <Link className="underline" to={`/sales/${doc.referenceDocument.id}`}>{doc.referenceDocument.consecutive.slice(-10)}</Link></>
            )}
          </p>
          {!isNote && sale.returnUntil && (
            <p className="text-xs text-muted-foreground">
              {expired ? t("sales.returnExpired") : t("sales.returnUntil", { date: new Date(sale.returnUntil).toLocaleDateString("es-CR") })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            {t("pos.print")}
          </Button>
          {!isNote && (can("sales.sell") || can("sales.void")) && (
            <Button onClick={() => setReturning(true)} disabled={allBack || expired}>
              <Undo2 />
              {t("sales.return.button")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {!isNote && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("sales.product")}</TableHead>
                    <TableHead className="text-right">{t("sales.sold")}</TableHead>
                    <TableHead className="text-right">{t("sales.returnedQty")}</TableHead>
                    <TableHead className="text-right">{t("sales.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doc.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.description}</TableCell>
                      <TableCell className="text-right font-mono">{Number(l.quantity)}</TableCell>
                      <TableCell className="text-right font-mono">{sale.returned[l.id] ?? 0}</TableCell>
                      <TableCell className="text-right font-mono">{money.format(l.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {sale.creditNotes.length > 0 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold">{t("sales.creditNotes")}</h2>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {sale.creditNotes.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span>
                      <Link to={`/sales/${n.id}`} className="font-mono text-xs hover:underline">{n.consecutive.slice(-10)}</Link>
                      <span className="ml-2 text-muted-foreground">{when(n.issuedAt)} · {n.referenceReason} · {t("sales.authorizedBy", { name: n.returnAuthorizedBy?.name })}</span>
                    </span>
                    <span className="font-mono">−{money.format(n.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {/* mientras se devuelve, solo la nota queda para imprimir */}
        <div className="justify-self-center">{!returning && <Ticket data={sale} />}</div>
      </div>

      <ReturnFlow saleId={returning ? doc.id : null} onClose={() => setReturning(false)} />
    </div>
  )
}
