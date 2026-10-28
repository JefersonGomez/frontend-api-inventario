import { useState } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { FileSpreadsheet, FolderDown, Info } from "lucide-react"
import { getAccountantPackage, getVatReport, saveVatPeriod } from "@/api/reports"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { downloadXlsx } from "@/lib/xlsx"
import { Kpi, Line } from "@/components/reports/SalesReport"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const ym = (d) => d.toLocaleDateString("sv").slice(0, 7)
const thisMonth = () => ym(new Date())
const lastMonth = () => {
  const n = new Date()
  return ym(new Date(n.getFullYear(), n.getMonth() - 1, 15))
}

// IVA del mes (54B, accounting.view): las 3 partes del Formulario 150 como guía para el contador.
// Por defecto el mes anterior, que es el que se declara (antes del 15). La prorrata y la retención
// de tarjeta se anotan a mano y quedan guardadas por mes.
export function VatReport() {
  const { t } = useTranslation()
  const money = useMoney()
  const [month, setMonth] = useState(lastMonth)
  const { data: r, isLoading, isError } = useQuery({
    queryKey: ["reports", "vat", month],
    queryFn: () => getVatReport(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
    placeholderData: keepPreviousData,
  })
  const rate = (k) => t(`taxRates.${k}`)
  const pkg = useMutation({
    mutationFn: () => getAccountantPackage(month),
    onSuccess: (p) => downloadAccountantPackage(p, t),
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("vatReport.month")}>
          <Button size="sm" variant={month === lastMonth() ? "secondary" : "ghost"} onClick={() => setMonth(lastMonth())}>
            {t("vatReport.lastMonth")}
          </Button>
          <Button size="sm" variant={month === thisMonth() ? "secondary" : "ghost"} onClick={() => setMonth(thisMonth())}>
            {t("vatReport.thisMonth")}
          </Button>
        </div>
        <div className="space-y-1">
          <Label htmlFor="vat-month" className="text-xs">{t("vatReport.month")}</Label>
          <Input id="vat-month" type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!r} onClick={() => downloadXlsx(`${t("vatReport.fileName")}-${month}.xlsx`, vatSheets(r, t))}>
            <FileSpreadsheet />
            {t("reports.export.excel")}
          </Button>
          <Button size="sm" disabled={pkg.isPending} onClick={() => pkg.mutate()}>
            <FolderDown />
            {pkg.isPending ? t("reports.export.exporting") : t("accountantPackage.button")}
          </Button>
        </div>
      </div>
      {pkg.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(pkg.error, t("accountantPackage.error"))}</p>}
      <p className="-mt-2 text-xs text-muted-foreground">{t("accountantPackage.hint")}</p>

      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("vatReport.disclaimer")}
      </p>

      {isError && <p role="alert" className="text-sm text-destructive">{t("vatReport.error")}</p>}
      {isLoading && <p className="text-muted-foreground">{t("common.loading")}</p>}
      {r && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label={t("vatReport.debit")} value={money.format(r.liquidation.debit)} />
            <Kpi label={t("vatReport.credit")} value={money.format(r.liquidation.credit)} />
            <Kpi label={t("vatReport.cardWithholding")} value={money.format(r.liquidation.cardWithholding)} />
            <Kpi
              label={r.liquidation.balance >= 0 ? t("vatReport.toPay") : t("vatReport.inFavor")}
              value={money.format(Math.abs(r.liquidation.balance))}
              strong
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <SalesPart r={r} money={money} t={t} rate={rate} />
            <PurchasesPart r={r} money={money} t={t} rate={rate} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* key: al cambiar de mes o guardar, el formulario arranca con lo guardado */}
            <ManualEntries key={`${month}-${r.period?.updatedAt ?? ""}`} month={month} r={r} money={money} t={t} />
            <Liquidation r={r} money={money} t={t} />
          </div>

          <InvoicesTable r={r} money={money} t={t} rate={rate} />
        </>
      )}
    </div>
  )
}

// Hojas del IVA del mes (las usa el botón Excel y el paquete para el contador)
function vatSheets(r, t) {
  const rate = (k) => t(`taxRates.${k}`)
  const x = (k, o) => t(`vatReport.${k}`, o)
  const l = r.liquidation
  const month = r.month
  return [
    {
      name: x("summary"),
      rows: [
        [x("concept"), x("amount")],
        [x("month"), month],
        [x("debit"), l.debit],
        [x("creditableTax"), l.creditableTax],
        [x("prorata"), r.prorata.value == null ? x("prorataNone") : `${r.prorata.value} %`],
        [x("credit"), l.credit],
        [x("cardWithholding"), l.cardWithholding],
        [l.balance >= 0 ? x("toPay") : x("inFavor"), Math.abs(l.balance)],
        ...(r.period?.note ? [[x("note"), r.period.note]] : []),
        [],
        [x("disclaimer")],
      ],
    },
    {
      name: x("salesSheet"),
      rows: [
        [x("rate"), x("grossBase"), x("returnsBase"), x("base"), x("tax")],
        ...r.sales.rows.map((s) => [rate(s.rate), s.grossBase, s.returnsBase, s.base, s.tax]),
        [x("total"), r.sales.totals.grossBase, r.sales.totals.returnsBase, r.sales.totals.base, r.sales.totals.tax],
      ],
    },
    {
      name: x("purchasesSheet"),
      rows: [
        [x("rate"), x("creditableBase"), x("creditableTaxCol"), x("nonCreditableBase"), x("nonCreditableTax")],
        ...r.purchases.creditable.rows.map((c, i) => {
          const n = r.purchases.nonCreditable.rows[i]
          return [rate(c.rate), c.base, c.tax, n.base, n.tax]
        }),
        [x("total"), r.purchases.creditable.totals.base, r.purchases.creditable.totals.tax, r.purchases.nonCreditable.totals.base, r.purchases.nonCreditable.totals.tax],
      ],
    },
    {
      name: x("invoicesSheet"),
      rows: [
        [x("date"), x("supplier"), x("number"), x("rate"), x("base"), x("tax"), x("creditableCol")],
        ...r.purchases.invoices.flatMap((i) =>
          i.taxes.map((tx) => [i.issueDate, i.supplier.name, i.number, rate(tx.rate), tx.base, tx.tax, i.creditable ? x("yes") : x("no")]),
        ),
      ],
    },
  ]
}

function SalesPart({ r, money, t, rate }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("vatReport.salesTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("vatReport.rate")}</TableHead>
              <TableHead className="text-right">{t("vatReport.base")}</TableHead>
              <TableHead className="text-right">{t("vatReport.tax")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {r.sales.rows.map((s) => (
              <TableRow key={s.rate}>
                <TableCell>
                  {rate(s.rate)}
                  {s.returnsBase > 0 && (
                    <span className="block text-xs text-muted-foreground">
                      {t("vatReport.returnsHint", { gross: money.format(s.grossBase), returns: money.format(s.returnsBase) })}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">{money.format(s.base)}</TableCell>
                <TableCell className="text-right font-mono">{s.rate === "EXEMPT" ? "—" : money.format(s.tax)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell>{t("vatReport.total")}</TableCell>
              <TableCell className="text-right font-mono">{money.format(r.sales.totals.base)}</TableCell>
              <TableCell className="text-right font-mono">{money.format(r.sales.totals.tax)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p className="pt-2 text-xs text-muted-foreground">{t("vatReport.salesHint")}</p>
      </CardContent>
    </Card>
  )
}

function PurchasesPart({ r, money, t, rate }) {
  const { creditable, nonCreditable } = r.purchases
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("vatReport.purchasesTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("vatReport.rate")}</TableHead>
              <TableHead className="text-right">{t("vatReport.base")}</TableHead>
              <TableHead className="text-right">{t("vatReport.tax")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creditable.rows.map((c) => (
              <TableRow key={c.rate}>
                <TableCell>{rate(c.rate)}</TableCell>
                <TableCell className="text-right font-mono">{money.format(c.base)}</TableCell>
                <TableCell className="text-right font-mono">{c.rate === "EXEMPT" ? "—" : money.format(c.tax)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold">
              <TableCell>{t("vatReport.totalCreditable")}</TableCell>
              <TableCell className="text-right font-mono">{money.format(creditable.totals.base)}</TableCell>
              <TableCell className="text-right font-mono">{money.format(creditable.totals.tax)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {nonCreditable.totals.base > 0 && (
          <p className="pt-2 text-sm">
            {t("vatReport.nonCreditableLine", { base: money.format(nonCreditable.totals.base), tax: money.format(nonCreditable.totals.tax) })}
          </p>
        )}
        <p className="pt-2 text-xs text-muted-foreground">{t("vatReport.purchasesHint")}</p>
      </CardContent>
    </Card>
  )
}

// Prorrata (vacía = no aplica, 100 %) y retención de IVA por tarjeta del mes
function ManualEntries({ month, r, t }) {
  const queryClient = useQueryClient()
  const p = r.prorata
  const [prorata, setProrata] = useState(p.value == null ? "" : String(p.value))
  const [withholding, setWithholding] = useState(r.liquidation.cardWithholding ? String(r.liquidation.cardWithholding) : "")
  const [note, setNote] = useState(r.period?.note ?? "")
  const save = useMutation({
    mutationFn: () =>
      saveVatPeriod(month, {
        prorata: prorata.trim() === "" ? null : Number(prorata),
        cardWithholding: Number(withholding) || 0,
        note: note.trim() || null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports", "vat"] }), // los meses siguientes heredan la prorrata
  })
  const suggestions = [
    p.suggestedLastYear != null && { key: "lastYear", value: p.suggestedLastYear },
    p.suggestedMonth != null && { key: "thisMonth", value: p.suggestedMonth },
  ].filter(Boolean)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("vatReport.manualTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="vat-prorata">{t("vatReport.prorataLabel")}</Label>
            <div className="flex items-center gap-2">
              <Input id="vat-prorata" type="number" min="0" max="100" step="0.01" className="w-32" placeholder="100"
                value={prorata} onChange={(e) => setProrata(e.target.value)} />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {p.applies ? t("vatReport.prorataApplies") : t("vatReport.prorataNotApplies")}
              {p.source === "inherited" && ` ${t("vatReport.prorataInherited", { month: p.inheritedFrom })}`}
            </p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {suggestions.map((s) => (
                  <Button key={s.key} type="button" size="sm" variant="ghost" onClick={() => setProrata(String(s.value))}>
                    {t(`vatReport.suggest.${s.key}`, { value: s.value })}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="vat-withholding">{t("vatReport.cardWithholding")}</Label>
            <Input id="vat-withholding" type="number" min="0" step="0.01" className="w-44" placeholder="0"
              value={withholding} onChange={(e) => setWithholding(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("vatReport.withholdingHint")}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="vat-note">{t("vatReport.note")}</Label>
            <Input id="vat-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("vatReport.notePlaceholder")} />
          </div>
          {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("vatReport.saveError"))}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={save.isPending}>{save.isPending ? t("common.saving") : t("common.save")}</Button>
            {r.period && (
              <span className="text-xs text-muted-foreground">
                {t("vatReport.savedBy", { name: r.period.updatedBy.name, date: new Date(r.period.updatedAt).toLocaleString() })}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Liquidation({ r, money, t }) {
  const l = r.liquidation
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("vatReport.liquidationTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <Line label={t("vatReport.debit")} value={money.format(l.debit)} />
        <Line label={t("vatReport.creditableTax")} value={money.format(l.creditableTax)} />
        {r.prorata.value != null && <Line label={t("vatReport.prorataApplied", { value: r.prorata.value })} value={`− ${money.format(l.creditableTax - l.credit)}`} />}
        <Line label={t("vatReport.credit")} value={`− ${money.format(l.credit)}`} />
        <Line label={t("vatReport.cardWithholding")} value={`− ${money.format(l.cardWithholding)}`} />
        <Line label={l.balance >= 0 ? t("vatReport.toPay") : t("vatReport.inFavor")} value={money.format(Math.abs(l.balance))} strong />
        <p className="pt-2 text-xs text-muted-foreground">{t("vatReport.liquidationHint")}</p>
      </CardContent>
    </Card>
  )
}

function InvoicesTable({ r, money, t, rate }) {
  const invoices = r.purchases.invoices
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("vatReport.invoicesTitle", { count: invoices.length })}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("vatReport.date")}</TableHead>
              <TableHead>{t("vatReport.supplier")}</TableHead>
              <TableHead>{t("vatReport.number")}</TableHead>
              <TableHead>{t("vatReport.rates")}</TableHead>
              <TableHead className="text-right">{t("vatReport.base")}</TableHead>
              <TableHead className="text-right">{t("vatReport.tax")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t("vatReport.noInvoices")}</TableCell></TableRow>
            )}
            {invoices.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="whitespace-nowrap">{i.issueDate}</TableCell>
                <TableCell>
                  <Link to={`/payables/${i.supplier.id}`} className="hover:underline">{i.supplier.name}</Link>
                  {!i.creditable && <Badge variant="secondary" className="ml-2">{t("vatReport.nonCreditableBadge")}</Badge>}
                </TableCell>
                <TableCell className="font-mono">{i.number}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{i.taxes.map((tx) => rate(tx.rate)).join(" · ")}</TableCell>
                <TableCell className="text-right font-mono">{money.format(i.subtotal)}</TableCell>
                <TableCell className="text-right font-mono">{money.format(i.tax)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

const RATES = ["RATE_13", "RATE_4", "RATE_2", "RATE_1", "EXEMPT"]
const METHODS = ["CASH", "CARD", "SINPE", "TRANSFER", "OTHER"]

// Paquete para el contador: un Excel con los datos de la empresa, el IVA del mes, cada comprobante y los bancos
function downloadAccountantPackage(p, t) {
  const x = (k, o) => t(`accountantPackage.${k}`, o)
  const rate = (k) => t(`taxRates.${k}`)
  const c = p.company
  const status = (tx) =>
    tx.status === "MATCHED" ? x("matched") : tx.status === "CLASSIFIED" ? x("classified") : x("pending")
  downloadXlsx(`${x("fileName")}-${p.month}.xlsx`, [
    {
      name: x("info"),
      rows: [
        [x("field"), x("value")],
        [x("company"), c.name],
        ...(c.legalName ? [[x("legalName"), c.legalName]] : []),
        ...(c.idNumber ? [[x("idNumber"), c.idNumber]] : []),
        [x("month"), p.month],
        [x("currency"), c.currency],
        [x("generatedAt"), new Date().toLocaleString()],
        [],
        [x("contents")],
      ],
    },
    ...vatSheets(p.vat, t),
    {
      name: x("documents"),
      rows: [
        [
          x("date"), x("type"), x("consecutive"), x("customer"), x("customerId"), x("condition"),
          ...RATES.flatMap((r) => (r === "EXEMPT" ? [`${x("base")} ${rate(r)}`] : [`${x("base")} ${rate(r)}`, `${x("tax")} ${rate(r)}`])),
          x("discount"), x("total"), ...METHODS.map((m) => t(`pos.methods.${m}`)), x("corrects"), x("reason"),
        ],
        ...p.sales.documents.map((d) => [
          new Date(d.issuedAt).toLocaleString(), t(`sales.types.${d.type}`), d.consecutive, d.customer?.name ?? "", d.customer?.idNumber ?? "",
          t(`pos.modes.${d.saleCondition}`),
          ...RATES.flatMap((r) => (r === "EXEMPT" ? [d.byRate[r]?.base ?? ""] : [d.byRate[r]?.base ?? "", d.byRate[r]?.tax ?? ""])),
          d.discount || "", d.total, ...METHODS.map((m) => d.payments[m] ?? ""), d.reference ?? "", d.referenceReason ?? "",
        ]),
        [],
        [x("totalDocuments", { count: p.sales.totals.count }), "", "", "", "", "", ...RATES.flatMap((r) => (r === "EXEMPT" ? [""] : ["", ""])), "", p.sales.totals.total],
      ],
    },
    {
      name: x("banks"),
      rows: [
        [x("account"), x("date"), x("reference"), x("description"), x("amount"), x("status"), x("detail"), x("fee"), x("note")],
        ...p.banks.flatMap((b) =>
          b.transactions.map((tx) => [
            b.account.name, tx.date, tx.reference, tx.description, tx.amount, status(tx),
            tx.status === "MATCHED" ? tx.matchedWith.join(" · ") : tx.category ? t(`banks.category.${tx.category}`) : "",
            tx.fee ?? "", tx.note ?? "",
          ]),
        ),
        [],
        [x("account"), x("credits"), x("debits"), x("pendingCount")],
        ...p.banks.map((b) => [`${b.account.name} (${b.account.currency})`, b.totals.credits, b.totals.debits, b.totals.pending]),
        ...(p.banks.length === 0 ? [[x("noBanks")]] : []),
      ],
    },
  ])
}
