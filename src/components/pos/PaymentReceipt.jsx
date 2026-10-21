import { useTranslation } from "react-i18next"
import { moneyFormatter } from "@/lib/money"
import { formatFiscalId } from "@/lib/fiscal"
import { PrintArea } from "./PrintArea"

// Recibo de un abono (térmico): saldo anterior, abono y saldo nuevo. data = { payment, company }
export function PaymentReceipt({ data }) {
  const { t } = useTranslation()
  const { payment: p, company } = data
  const money = moneyFormatter(company.currency)
  const at = new Date(p.createdAt)
  const register = p.cashSession?.register

  return (
    <PrintArea width={register?.ticketWidth ?? 80}>
      <header className="stk-ticket-center">
        <p className="stk-ticket-strong">{company.name}</p>
        {formatFiscalId(t, company.idType, company.idNumber) && <p>{formatFiscalId(t, company.idType, company.idNumber)}</p>}
        {company.phone && <p>{t("pos.ticket.phone", { phone: company.phone })}</p>}
        {register && <p>{register.location.name}</p>}
      </header>
      <hr />
      <p className="stk-ticket-center stk-ticket-strong">{t("receivables.receipt.title")}</p>
      <p className="stk-ticket-center">N.º {p.id.slice(0, 8).toUpperCase()}</p>
      <p>
        {at.toLocaleDateString("es-CR")} {at.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
      </p>
      {register && <p>{t("pos.ticket.register", { name: register.name })}</p>}
      <p>{t("receivables.receipt.by", { name: p.user.name })}</p>
      <p>{t("pos.ticket.customer", { name: p.customer.name })}</p>
      {p.customer.idNumber && <p>{formatFiscalId(t, p.customer.idType, p.customer.idNumber)}</p>}
      <hr />
      <p className="stk-ticket-row">
        <span>{t("receivables.receipt.before")}</span>
        <span>{money.format(p.balanceBefore)}</span>
      </p>
      <p className="stk-ticket-row stk-ticket-strong">
        <span>{t("receivables.receipt.amount", { method: t(`pos.methods.${p.method}`) })}</span>
        <span>−{money.format(p.amount)}</span>
      </p>
      <p className="stk-ticket-row stk-ticket-total">
        <span>{t("receivables.receipt.after")}</span>
        <span>{money.format(p.balanceAfter)}</span>
      </p>
      {p.reference && <p>{t("pos.ticket.reference", { ref: p.reference })}</p>}
      {p.tendered != null && (
        <p className="stk-ticket-row">
          <span>{t("pos.change")}</span>
          <span>{money.format(Number(p.tendered) - Number(p.amount))}</span>
        </p>
      )}
      {p.note && <p>{p.note}</p>}
      <hr />
      <p className="stk-ticket-center">{t("pos.ticket.thanks")}</p>
    </PrintArea>
  )
}
