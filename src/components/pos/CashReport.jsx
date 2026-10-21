import { useTranslation } from "react-i18next"
import { moneyFormatter } from "@/lib/money"
import { PrintArea } from "./PrintArea"

const at = (d) => d && new Date(d).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" })

function Row({ label, value, strong }) {
  return (
    <p className={strong ? "stk-ticket-row stk-ticket-strong" : "stk-ticket-row"}>
      <span>{label}</span>
      <span>{value}</span>
    </p>
  )
}

// Reporte de un turno en formato tiquete: el cierre del cajero (paso 1) y, con arqueo, el acta
// con el conteo y las firmas (paso 2). Lo que no viene del servidor (esperado, diferencia: cierre
// ciego) simplemente no se imprime.
export function CashReport({ report }) {
  const { t } = useTranslation()
  const money = moneyFormatter(report.company.currency)
  const s = report.summary
  const reconciled = !!report.reconciledAt
  const counts = Object.entries(report.denominations ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => Number(b[0]) - Number(a[0]))

  return (
    <PrintArea width={report.register.ticketWidth}>
      <header className="stk-ticket-center">
        <p className="stk-ticket-strong">{report.company.name}</p>
        <p>{report.register.location.name}</p>
      </header>
      <hr />
      <p className="stk-ticket-center stk-ticket-strong">{reconciled ? t("pos.report.reconcileTitle") : t("pos.report.closeTitle")}</p>
      <p>{t("pos.ticket.register", { name: report.register.name })}</p>
      <p>{t("pos.ticket.cashier", { name: report.openedBy.name })}</p>
      <p>{t("pos.report.opened", { at: at(report.openedAt) })}</p>
      {report.closedAt && <p>{t("pos.report.closed", { at: at(report.closedAt) })}</p>}
      <hr />
      <Row label={t("pos.report.sales", { count: s.salesCount })} value={money.format(s.salesTotal)} strong />
      <Row label={t("pos.methods.CASH")} value={money.format(s.payments.CASH ?? 0)} />
      <Row label={t("pos.methods.CARD")} value={money.format(s.payments.CARD ?? 0)} />
      <Row label={t("pos.methods.SINPE")} value={money.format(s.payments.SINPE ?? 0)} />
      {s.collectionsCount > 0 && (
        <Row
          label={t("pos.report.collections", { count: s.collectionsCount })}
          value={money.format(Object.values(s.collections).reduce((a, v) => a + v, 0))}
        />
      )}
      <hr />
      <Row label={t("pos.close.opening")} value={money.format(s.openingAmount)} />
      {report.movements.map((m) => (
        <Row key={m.id} label={`${m.type === "IN" ? "+" : "−"} ${m.reason}`} value={money.format(m.amount)} />
      ))}
      {s.expectedCash !== undefined && <Row label={t("pos.close.expected")} value={money.format(s.expectedCash)} strong />}
      {report.closingNote && <p>{t("pos.report.note", { note: report.closingNote })}</p>}

      {reconciled && (
        <>
          <hr />
          <p className="stk-ticket-strong">{t("pos.report.count")}</p>
          {counts.map(([v, n]) => (
            <Row key={v} label={`${n} × ${money.format(v)}`} value={money.format(Number(v) * n)} />
          ))}
          <Row label={t("pos.close.counted")} value={money.format(report.countedCash)} strong />
          {report.difference != null && (
            <Row
              label={report.difference === 0 ? t("pos.close.balanced") : report.difference > 0 ? t("pos.close.over") : t("pos.close.short")}
              value={money.format(Math.abs(report.difference))}
              strong
            />
          )}
          {report.cardDeclared != null && (
            <>
              <Row label={t("pos.report.cardDeclared")} value={money.format(report.cardDeclared)} />
              {report.cardDifference != null && report.cardDifference !== 0 && (
                <Row label={t("pos.report.cardDifference")} value={money.format(report.cardDifference)} />
              )}
            </>
          )}
          {report.reconcileNote && <p>{t("pos.report.note", { note: report.reconcileNote })}</p>}
          <p>{t("pos.report.reconciledBy", { name: report.reconciledBy?.name, at: at(report.reconciledAt) })}</p>
          <div className="stk-ticket-sign">
            <p>{t("pos.report.signCashier")}</p>
            <p>{t("pos.report.signSupervisor")}</p>
          </div>
        </>
      )}
      {!reconciled && (
        <>
          <hr />
          <p className="stk-ticket-center">{t("pos.report.pending")}</p>
        </>
      )}
    </PrintArea>
  )
}
