import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Printer } from "lucide-react"
import { getSale } from "@/api/sales"
import { moneyFormatter } from "@/lib/money"
import { Ticket } from "@/components/pos/Ticket"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ReturnDialog } from "./ReturnDialog"

// Devolución completa: carga la venta, pide qué se devuelve y muestra la nota de crédito para imprimir
export function ReturnFlow({ saleId, onClose }) {
  const { t } = useTranslation()
  const [note, setNote] = useState(null)
  const { data: sale } = useQuery({ queryKey: ["sales", saleId], queryFn: () => getSale(saleId), enabled: !!saleId && !note })
  const money = note && moneyFormatter(note.company.currency)
  const close = () => {
    setNote(null)
    onClose()
  }

  return (
    <>
      <ReturnDialog sale={saleId && !note ? sale : null} onClose={close} onDone={setNote} />
      <Dialog open={!!note} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("sales.return.done")}</DialogTitle>
          </DialogHeader>
          {note && (
            <>
              {note.credited > 0 && <p className="text-sm">{t("sales.return.credited", { amount: money.format(note.credited) })}</p>}
              {note.refund > 0 && <p className="text-sm font-medium">{t("sales.return.refunded", { amount: money.format(note.refund) })}</p>}
              <Ticket data={note} />
            </>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => window.print()}>
              <Printer />
              {t("pos.print")}
            </Button>
            <Button autoFocus className="flex-1" onClick={close}>{t("receivables.pay.close")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
