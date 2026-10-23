import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMoney } from "@/hoocks/useMoney"
import { discardSale, failedSales, retrySale, saleTotal } from "@/lib/offline-sales"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Ventas hechas sin conexión que el servidor rechazó al sincronizar (8C). El encargado ya recibió el aviso.
// Reintentar: después de arreglar la causa. Descartar: no entra al sistema (esa plata sale como sobrante).
export function FailedSales({ open, onClose, onChange }) {
  const { t } = useTranslation()
  const money = useMoney()
  const [list, setList] = useState([])
  const [busy, setBusy] = useState(false)
  const [discarding, setDiscarding] = useState(null)

  useEffect(() => {
    if (open) failedSales().then(setList)
  }, [open])

  async function act(fn) {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
      setList(await failedSales())
      onChange()
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("pos.offline.failedTitle")}</DialogTitle>
            <DialogDescription>{t("pos.offline.failedHint")}</DialogDescription>
          </DialogHeader>
          {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("pos.offline.noneFailed")}</p>}
          <ul className="divide-y divide-border">
            {list.map((s) => (
              <li key={s.clientSaleId} className="space-y-2 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm">
                    {new Date(s.soldAt).toLocaleString("es-CR")} · Ref. {s.clientSaleId.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="font-mono font-semibold">{money.format(saleTotal(s))}</span>
                </div>
                <p className="text-sm text-destructive">{s.error}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => retrySale(s))}>
                    {t("pos.offline.retry")}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDiscarding(s)}>
                    {t("pos.offline.discard")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!discarding} onOpenChange={(o) => !o && setDiscarding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pos.offline.discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("pos.offline.discardHint", { total: discarding ? money.format(saleTotal(discarding)) : "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const sale = discarding
                setDiscarding(null)
                act(() => discardSale(sale))
              }}
            >
              {t("pos.offline.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
