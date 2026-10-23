import { useTranslation } from "react-i18next"
import { moneyFormatter } from "@/lib/money"
import { documentTaxes, TAX_PERCENT } from "@/lib/pos"
import { formatFiscalId } from "@/lib/fiscal"
import { PrintArea } from "./PrintArea"

// Tiquete térmico (80 o 58 mm según la caja). "TIQUETE/FACTURA INTERNA" hasta que la facturación
// electrónica esté activa (Bloque 9). Los montos se muestran con IVA, como los ve el cliente.
export function Ticket({ data }) {
  const { t } = useTranslation()
  const { document: doc, company, register, location, cashier } = data
  const money = moneyFormatter(company.currency)
  const taxes = documentTaxes(doc.lines)
  const fiscalId = formatFiscalId(t, company.idType, company.idNumber)
  const issued = new Date(doc.issuedAt)
  const withTax = (l, v) => Number(v) * (1 + TAX_PERCENT[l.taxRate] / 100)
  const discount = doc.lines.reduce((s, l) => s + withTax(l, l.discount), 0)

  return (
    <PrintArea width={register?.ticketWidth ?? 80}>
      <header className="stk-ticket-center">
        <p className="stk-ticket-strong">{company.name}</p>
        {company.legalName && company.legalName !== company.name && <p>{company.legalName}</p>}
        {fiscalId && <p>{fiscalId}</p>}
        {company.phone && <p>{t("pos.ticket.phone", { phone: company.phone })}</p>}
        {location && <p>{location.name}</p>}
      </header>
      <hr />
      <p className="stk-ticket-center stk-ticket-strong">
        {doc.type === "CREDIT_NOTE" ? t("pos.ticket.creditNote") : doc.type === "INVOICE" ? t("pos.ticket.internalInvoice") : t("pos.ticket.internal")}
      </p>
      <p className="stk-ticket-center">{doc.provisional ? t("pos.ticket.provisional", { number: doc.consecutive }) : `N.º ${doc.consecutive}`}</p>
      {doc.referenceDocument && <p>{t("pos.ticket.reference_doc", { number: doc.referenceDocument.consecutive })}</p>}
      {doc.referenceReason && <p>{t("pos.ticket.reason", { reason: doc.referenceReason })}</p>}
      <p>
        {issued.toLocaleDateString("es-CR")} {issued.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
      </p>
      {register && <p>{t("pos.ticket.register", { name: register.name })}</p>}
      <p>{t("pos.ticket.cashier", { name: cashier.name })}</p>
      {doc.customer && <p>{t("pos.ticket.customer", { name: doc.customer.name })}</p>}
      {doc.customer?.idNumber && <p>{formatFiscalId(t, doc.customer.idType, doc.customer.idNumber)}</p>}
      <hr />
      {doc.lines.map((l) => (
        <div key={l.id} className="stk-ticket-line">
          <p>
            {l.description}
            {l.returnCondition === "DAMAGED" && ` (${t("sales.condition.DAMAGED")})`}
          </p>
          <p className="stk-ticket-row">
            <span>
              {Number(l.quantity)} × {money.format(withTax(l, l.unitPrice))}
            </span>
            <span>{money.format(Number(l.total) + withTax(l, l.discount))}</span>
          </p>
          {Number(l.discount) > 0 && (
            <p className="stk-ticket-row">
              <span>{t("pos.ticket.discount", { label: l.discountLabel ?? "" })}</span>
              <span>−{money.format(withTax(l, l.discount))}</span>
            </p>
          )}
        </div>
      ))}
      <hr />
      {discount > 0 && (
        <p className="stk-ticket-row">
          <span>{t("pos.discount.label")}</span>
          <span>−{money.format(discount)}</span>
        </p>
      )}
      {doc.discountAuthorizedBy && <p>{t("pos.ticket.authorizedBy", { name: doc.discountAuthorizedBy.name })}</p>}
      <p className="stk-ticket-row">
        <span>{t("pos.subtotal")}</span>
        <span>{money.format(doc.subtotal)}</span>
      </p>
      {taxes.map((r) => (
        <p key={r.pct} className="stk-ticket-row">
          <span>{r.pct ? t("pos.taxRate", { pct: r.pct }) : t("pos.exempt")}</span>
          <span>{money.format(r.tax)}</span>
        </p>
      ))}
      <p className="stk-ticket-row stk-ticket-total">
        <span>{t("pos.total")}</span>
        <span>{money.format(doc.total)}</span>
      </p>
      <hr />
      {doc.payments.map((p) => (
        <div key={p.id}>
          <p className="stk-ticket-row">
            <span>{doc.type === "CREDIT_NOTE" ? t("pos.ticket.refund", { method: t(`pos.methods.${p.method}`) }) : t(`pos.methods.${p.method}`)}</span>
            <span>{money.format(p.amount)}</span>
          </p>
          {p.reference && <p>{t("pos.ticket.reference", { ref: p.reference })}</p>}
          {p.tendered != null && (
            <>
              <p className="stk-ticket-row">
                <span>{t("pos.ticket.tendered")}</span>
                <span>{money.format(p.tendered)}</span>
              </p>
              <p className="stk-ticket-row stk-ticket-strong">
                <span>{t("pos.change")}</span>
                <span>{money.format(Number(p.tendered) - Number(p.amount))}</span>
              </p>
            </>
          )}
        </div>
      ))}
      {doc.returnAuthorizedBy && <p>{t("pos.ticket.returnBy", { name: doc.returnAuthorizedBy.name })}</p>}
      {doc.installments?.length > 0 && (
        <>
          <hr />
          <p className="stk-ticket-strong">{t("pos.ticket.credit")}</p>
          {doc.installments.map((i) => (
            <p key={i.id} className="stk-ticket-row">
              <span>{t("pos.ticket.installment", { n: i.number, date: new Date(i.dueDate).toLocaleDateString("es-CR", { timeZone: "UTC" }) })}</span>
              <span>{money.format(i.amount)}</span>
            </p>
          ))}
          {doc.creditAuthorizedBy && <p>{t("pos.ticket.creditBy", { name: doc.creditAuthorizedBy.name })}</p>}
          <p className="stk-ticket-center stk-ticket-small">{t("pos.ticket.signature")}</p>
          <p>&nbsp;</p>
          <p className="stk-ticket-center">____________________________</p>
        </>
      )}
      <hr />
      <p className="stk-ticket-center">{t("pos.ticket.thanks")}</p>
      <p className="stk-ticket-center stk-ticket-small">{t("pos.ticket.notFiscal")}</p>
    </PrintArea>
  )
}
