import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { cancelPurchaseOrder, closePurchaseOrder, receivePurchaseOrder } from "@/api/purchaseOrders"
import { apiErrorMessage } from "@/lib/api-error"
import { formatQty, qtyStep } from "@/lib/units"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const pendingOf = (i) => Math.max(0, Number(i.quantity) - Number(i.receivedQuantity ?? 0))

// Recibir una orden (todo o una parte: se anota lo que llegó de cada línea) y, desde aquí mismo,
// cancelarla si no llegó nada o cerrarla si el proveedor ya no trae el resto (decisiones del 16-oct-2026).
export function ReceiveOrderDialog({ order, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [arriving, setArriving] = useState(() => Object.fromEntries(order.items.map((i) => [i.id, String(pendingOf(i))])))
  const [ending, setEnding] = useState(null) // "cancel" | "close"
  const [reason, setReason] = useState("")

  const done = () => {
    for (const key of ["purchase-orders", "products", "movements", "reports", "purchase-requests", "purchase-request-alerts"]) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
    onClose()
  }
  const receive = useMutation({
    mutationFn: () =>
      receivePurchaseOrder(
        order.id,
        order.items.filter((i) => pendingOf(i) > 0).map((i) => ({ itemId: i.id, quantity: Number(arriving[i.id] || 0) }))
      ),
    onSuccess: done,
  })
  const end = useMutation({
    mutationFn: () => (ending === "cancel" ? cancelPurchaseOrder(order.id, reason.trim()) : closePurchaseOrder(order.id, reason.trim())),
    onSuccess: done,
  })

  const total = order.items.reduce((s, i) => s + (pendingOf(i) > 0 ? Number(arriving[i.id] || 0) : 0), 0)
  const invalid = order.items.some((i) => Number(arriving[i.id] || 0) > pendingOf(i) || Number(arriving[i.id] || 0) < 0)
  const error = receive.error || end.error

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("purchaseOrders.receiveTitle", { supplier: order.supplier.name })}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t("purchaseOrders.receiveHint", { location: order.location?.name ?? "—" })}
        </p>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2">{t("purchaseOrders.product")}</th>
                <th className="px-3 py-2 text-right">{t("purchaseOrders.ordered")}</th>
                <th className="px-3 py-2 text-right">{t("purchaseOrders.receivedSoFar")}</th>
                <th className="px-3 py-2 text-right">{t("purchaseOrders.arrivingNow")}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((i) => {
                const pending = pendingOf(i)
                return (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{i.product.name}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{formatQty(i.quantity, i.product.unit, t)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{formatQty(i.receivedQuantity ?? 0, i.product.unit, t)}</td>
                    <td className="px-3 py-2 text-right">
                      {pending > 0 ? (
                        <Input
                          type="number"
                          className="ml-auto w-28 text-right"
                          min={0}
                          max={pending}
                          step={qtyStep(i.product.unit)}
                          value={arriving[i.id]}
                          onChange={(e) => setArriving({ ...arriving, [i.id]: e.target.value })}
                          aria-label={t("purchaseOrders.arrivingOf", { name: i.product.name })}
                        />
                      ) : (
                        <span className="text-muted-foreground">{t("purchaseOrders.lineComplete")}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {ending && (
          <div className="space-y-1.5">
            <Label htmlFor="order-end-reason">{ending === "cancel" ? t("purchaseOrders.cancelReason") : t("purchaseOrders.closeReason")}</Label>
            <Input id="order-end-reason" maxLength={300} value={reason} autoFocus onChange={(e) => setReason(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {ending === "cancel" ? t("purchaseOrders.cancelHint") : t("purchaseOrders.closeHint")}
            </p>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, t("purchaseOrders.receiveError"))}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {ending ? (
              <>
                <Button variant="outline" onClick={() => setEnding(null)}>{t("common.cancel")}</Button>
                <Button
                  variant="destructive"
                  disabled={end.isPending || (ending === "cancel" && !reason.trim())}
                  onClick={() => end.mutate()}
                >
                  {ending === "cancel" ? t("purchaseOrders.cancelOrder") : t("purchaseOrders.closeOrder")}
                </Button>
              </>
            ) : order.status === "PENDING" ? (
              <Button variant="outline" onClick={() => setEnding("cancel")}>{t("purchaseOrders.cancelOrder")}</Button>
            ) : (
              <Button variant="outline" onClick={() => setEnding("close")}>{t("purchaseOrders.closeOrder")}</Button>
            )}
          </div>
          {!ending && (
            <Button disabled={receive.isPending || invalid || total <= 0} onClick={() => receive.mutate()}>
              {t("purchaseOrders.receiveNow")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
