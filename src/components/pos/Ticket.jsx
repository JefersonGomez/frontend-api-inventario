import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { moneyFormatter } from "@/lib/money"
import { documentTaxes } from "@/lib/pos"
import { formatFiscalId } from "@/lib/fiscal"

// Tiquete térmico: 80 mm = 302 px, 58 mm = 219 px en pantalla. "TIQUETE INTERNO" hasta que la facturación
// electrónica esté activa (Bloque 9). Para imprimir se pone una copia directo en <body> (.stk-print-root):
// dentro del modal, su alto máximo y su scroll recortaban el tiquete a lo que se veía en pantalla.
export function Ticket({ data }) {
  return (
    <>
      <TicketBody data={data} />
      {createPortal(
        <div className="stk-print-root">
          <TicketBody data={data} />
        </div>,
        document.body
      )}
    </>
  )
}

function TicketBody({ data }) {
  const { t } = useTranslation()
  const { document: doc, company, register, location, cashier } = data
  const money = moneyFormatter(company.currency)
  const width = register?.ticketWidth ?? 80
  const taxes = documentTaxes(doc.lines)
  const fiscalId = formatFiscalId(t, company.idType, company.idNumber)
  const issued = new Date(doc.issuedAt)

  return (
    <div className="stk-ticket" style={{ width: width === 58 ? 219 : 302, "--ticket-mm": `${width}mm` }}>
      <style>{`@media print { @page { size: ${width}mm auto; margin: 0 } }`}</style>
      <header className="stk-ticket-center">
        <p className="stk-ticket-strong">{company.name}</p>
        {company.legalName && company.legalName !== company.name && <p>{company.legalName}</p>}
        {fiscalId && <p>{fiscalId}</p>}
        {company.phone && <p>{t("pos.ticket.phone", { phone: company.phone })}</p>}
        {location && <p>{location.name}</p>}
      </header>
      <hr />
      <p className="stk-ticket-center stk-ticket-strong">{t("pos.ticket.internal")}</p>
      <p className="stk-ticket-center">N.º {doc.consecutive}</p>
      <p>
        {issued.toLocaleDateString("es-CR")} {issued.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
      </p>
      {register && <p>{t("pos.ticket.register", { name: register.name })}</p>}
      <p>{t("pos.ticket.cashier", { name: cashier.name })}</p>
      {doc.customer && <p>{t("pos.ticket.customer", { name: doc.customer.name })}</p>}
      <hr />
      {doc.lines.map((l) => (
        <div key={l.id} className="stk-ticket-line">
          <p>{l.description}</p>
          <p className="stk-ticket-row">
            <span>
              {Number(l.quantity)} × {money.format(Number(l.total) / Number(l.quantity))}
            </span>
            <span>{money.format(l.total)}</span>
          </p>
        </div>
      ))}
      <hr />
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
            <span>{t(`pos.methods.${p.method}`)}</span>
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
      <hr />
      <p className="stk-ticket-center">{t("pos.ticket.thanks")}</p>
      <p className="stk-ticket-center stk-ticket-small">{t("pos.ticket.notFiscal")}</p>
    </div>
  )
}
