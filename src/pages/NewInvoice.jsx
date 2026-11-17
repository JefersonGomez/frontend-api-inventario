import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { ArrowLeft, FileText, Loader2, PackagePlus, Trash2, UserRound, Wrench } from "lucide-react"
import { issueOfficeInvoice } from "@/api/sales"
import { useMoney } from "@/hoocks/useMoney"
import { apiErrorMessage } from "@/lib/api-error"
import { formatFiscalId } from "@/lib/fiscal"
import { TAX_RATES, qtyStep } from "@/lib/units"
import { ProductPicker } from "@/components/ProductPicker"
import { LocationSelect } from "@/components/LocationSelect"
import { CustomerPicker } from "@/components/pos/CustomerPicker"
import { BankAccountSelect } from "@/components/banks/DepositDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
let nextKey = 1
const productLine = () => ({ key: nextKey++, kind: "product", product: null, quantity: "1", price: "" })
const serviceLine = () => ({ key: nextKey++, kind: "service", description: "", quantity: "1", price: "", taxRate: "RATE_13", cabys: "" })

// Factura desde la oficina (sin caja): administrador y encargado. Sale del stock de la ubicación elegida;
// de contado entra a una cuenta bancaria, a crédito en cuotas. Siempre a nombre de un cliente con cédula.
export function NewInvoice() {
  const { t } = useTranslation()
  const money = useMoney()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [customer, setCustomer] = useState(null)
  const [picking, setPicking] = useState(false)
  const [locationId, setLocationId] = useState("")
  const [lines, setLines] = useState([productLine()])
  const [mode, setMode] = useState("cash") // cash | credit
  const [payment, setPayment] = useState({ method: "TRANSFER", reference: "", bankAccountId: "" })
  const [credit, setCredit] = useState({ frequency: "MONTHLY", installments: "1" })
  const [notes, setNotes] = useState("")

  const update = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const remove = (key) => setLines((ls) => ls.filter((l) => l.key !== key))
  const priceOf = (l) => (l.price !== "" ? Number(l.price) : l.product ? Number(l.product.price) : 0)
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * priceOf(l), 0)
  const hasId = Boolean(customer?.idType && customer?.idNumber)
  const canCredit = customer?.creditLimit != null
  const linesOk = lines.length > 0 && lines.every((l) =>
    Number(l.quantity) > 0 && (l.kind === "product" ? Boolean(l.product) : l.description.trim() && Number(l.price) >= 0 && l.price !== ""))

  const save = useMutation({
    mutationFn: () =>
      issueOfficeInvoice({
        customerId: customer.id,
        ...(locationId && { locationId }),
        lines: lines.map((l) =>
          l.kind === "product"
            ? { productId: l.product.id, quantity: Number(l.quantity), ...(l.price !== "" && { unitPriceWithTax: Number(l.price) }) }
            : { description: l.description.trim(), quantity: Number(l.quantity), unitPriceWithTax: Number(l.price), taxRate: l.taxRate, ...(/^\d{13}$/.test(l.cabys) && { cabys: l.cabys }) },
        ),
        ...(mode === "cash"
          ? { payment: { method: payment.method, ...(payment.reference.trim() && { reference: payment.reference.trim() }), ...(payment.bankAccountId && { bankAccountId: payment.bankAccountId }) } }
          : { credit: { frequency: credit.frequency, installments: Number(credit.installments) } }),
        ...(notes.trim() && { notes: notes.trim() }),
      }),
    onSuccess: (ticket) => {
      for (const key of ["sales", "products", "receivables"]) queryClient.invalidateQueries({ queryKey: [key] })
      navigate(`/sales/${ticket.document.id}`)
    },
  })

  return (
    <div className="mx-auto max-w-4xl">
      <Button variant="ghost" size="sm" className="mb-3" render={<Link to="/sales" />}>
        <ArrowLeft />
        {t("sales.title")}
      </Button>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><FileText className="h-6 w-6" aria-hidden />{t("invoice.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("invoice.subtitle")}</p>
      </div>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        {/* cliente */}
        <section className="space-y-2 rounded-xl border border-border p-4">
          <h2 className="text-base font-semibold">{t("invoice.customer")}</h2>
          {customer ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="font-medium">{customer.name}</span>
                <span className="text-sm text-muted-foreground">{formatFiscalId(t, customer.idType, customer.idNumber) || t("invoice.noId")}</span>
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>{t("invoice.changeCustomer")}</Button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => setPicking(true)}><UserRound />{t("invoice.pickCustomer")}</Button>
          )}
          {customer && !hasId && <p role="alert" className="text-sm text-destructive">{t("invoice.needsId")}</p>}
          {customer && hasId && <p className="text-xs text-muted-foreground">{customer.email ? t("invoice.emailTo", { email: customer.email }) : t("invoice.noEmail")}</p>}
        </section>

        {/* líneas */}
        <section className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-base font-semibold">{t("invoice.lines")}</h2>
            <div className="w-full sm:w-72">
              <LocationSelect id="invoice-location" label={t("invoice.from")} value={locationId} onChange={setLocationId} />
            </div>
          </div>
          <ul className="space-y-3">
            {lines.map((l, i) => (
              <li key={l.key} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_96px_140px_120px_36px] sm:items-end">
                {l.kind === "product" ? (
                  <div className="col-span-2 space-y-1.5 sm:col-span-1">
                    <Label htmlFor={`inv-p-${l.key}`}>{t("invoice.product", { n: i + 1 })}</Label>
                    <ProductPicker id={`inv-p-${l.key}`} value={l.product} onChange={(p) => update(l.key, { product: p, price: "" })} />
                  </div>
                ) : (
                  <div className="col-span-2 grid gap-2 sm:col-span-1 sm:grid-cols-[1fr_120px_130px]">
                    <div className="space-y-1.5">
                      <Label htmlFor={`inv-d-${l.key}`}>{t("invoice.service", { n: i + 1 })}</Label>
                      <Input id={`inv-d-${l.key}`} maxLength={200} placeholder={t("invoice.servicePlaceholder")} value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`inv-t-${l.key}`}>{t("invoice.tax")}</Label>
                      <select id={`inv-t-${l.key}`} className={selectClass} value={l.taxRate} onChange={(e) => update(l.key, { taxRate: e.target.value })}>
                        {TAX_RATES.map((r) => <option key={r} value={r}>{t(`taxRates.${r}`)}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`inv-c-${l.key}`}>CABYS</Label>
                      <Input id={`inv-c-${l.key}`} inputMode="numeric" maxLength={13} value={l.cabys} onChange={(e) => update(l.key, { cabys: e.target.value.replace(/\D/g, "") })} />
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor={`inv-q-${l.key}`}>{t("invoice.qty")}</Label>
                  <Input id={`inv-q-${l.key}`} type="number" min="0" step={l.product ? qtyStep(l.product.unit) : "any"} value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`inv-pr-${l.key}`}>{t("invoice.price")}</Label>
                  <Input
                    id={`inv-pr-${l.key}`} type="number" min="0" step="0.01"
                    placeholder={l.product ? String(Number(l.product.price)) : ""}
                    value={l.price}
                    onChange={(e) => update(l.key, { price: e.target.value })}
                  />
                </div>
                <p className="self-center text-right font-mono text-sm sm:pb-2">{money.format((Number(l.quantity) || 0) * priceOf(l))}</p>
                <Button type="button" variant="ghost" size="icon-sm" className="justify-self-end" disabled={lines.length === 1} onClick={() => remove(l.key)} aria-label={t("invoice.removeLine", { n: i + 1 })}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, productLine()])}><PackagePlus />{t("invoice.addProduct")}</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, serviceLine()])}><Wrench />{t("invoice.addService")}</Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("invoice.priceHint")}</p>
          <p className="flex justify-between border-t border-border pt-2 text-lg font-semibold">
            <span>{t("invoice.total")}</span>
            <span className="font-mono">{money.format(total)}</span>
          </p>
        </section>

        {/* cómo paga */}
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="text-base font-semibold">{t("invoice.payment")}</h2>
          <div className="flex gap-2" role="group" aria-label={t("invoice.payment")}>
            {["cash", "credit"].map((m) => (
              <Button key={m} type="button" size="sm" variant={mode === m ? "default" : "outline"} aria-pressed={mode === m} disabled={m === "credit" && customer && !canCredit} onClick={() => setMode(m)}>
                {t(`invoice.modes.${m}`)}
              </Button>
            ))}
          </div>
          {customer && !canCredit && <p className="text-xs text-muted-foreground">{t("invoice.noCredit")}</p>}
          {mode === "cash" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="inv-method">{t("invoice.method")}</Label>
                <select id="inv-method" className={selectClass} value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
                  {["TRANSFER", "SINPE", "CARD"].map((m) => <option key={m} value={m}>{t(`pos.methods.${m}`)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-ref">{t("invoice.reference")}</Label>
                <Input id="inv-ref" maxLength={60} value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
              </div>
              <BankAccountSelect id="inv-bank" value={payment.bankAccountId} onChange={(v) => setPayment({ ...payment, bankAccountId: v })} />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inv-freq">{t("pos.credit.frequency")}</Label>
                <select id="inv-freq" className={selectClass} value={credit.frequency} onChange={(e) => setCredit({ ...credit, frequency: e.target.value, installments: "1" })}>
                  {["MONTHLY", "BIWEEKLY"].map((f) => <option key={f} value={f}>{t(`pos.credit.${f}`)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-inst">{t("pos.credit.installments")}</Label>
                <select id="inv-inst" className={selectClass} value={credit.installments} onChange={(e) => setCredit({ ...credit, installments: e.target.value })}>
                  {Array.from({ length: credit.frequency === "MONTHLY" ? 6 : 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {total > 0 && (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  {t("pos.credit.plan", { amount: money.format(total), count: Number(credit.installments), each: money.format(total / Number(credit.installments)) })}
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="inv-notes">{t("invoice.notes")}</Label>
            <Input id="inv-notes" maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </section>

        {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("invoice.error"))}</p>}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className={cn("text-sm text-muted-foreground", !customer && "text-destructive")}>{!customer ? t("invoice.missingCustomer") : t("invoice.sendsAlone")}</p>
          <Button type="submit" disabled={save.isPending || !customer || !hasId || !linesOk}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("invoice.issue", { total: money.format(total) })}
          </Button>
        </div>
      </form>

      <CustomerPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(c) => {
          setCustomer(c)
          setPicking(false)
          if (c.creditLimit == null) setMode("cash")
        }}
      />
    </div>
  )
}
