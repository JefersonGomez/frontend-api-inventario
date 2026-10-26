import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { cancelPurchaseOrder, closePurchaseOrder, receivePurchaseOrder } from "@/api/purchaseOrders"
import { apiErrorMessage } from "@/lib/api-error"
import { formatQty, qtyStep } from "@/lib/units"
import { TAX_PERCENT } from "@/lib/pos"
import { useMoney } from "@/hoocks/useMoney"
import { Switch } from "@/components/ui/switch"
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
  const [lots, setLots] = useState({}) // itemId → { code, expires } (productos con lotes)
  const [ending, setEnding] = useState(null) // "cancel" | "close"
  const [reason, setReason] = useState("")
  const money = useMoney()
  // factura del proveedor (Cuentas por pagar): montos vacíos = los calcula el servidor con lo que llega
  const [withInvoice, setWithInvoice] = useState(false)
  const [invoice, setInvoice] = useState({ number: "", issueDate: new Date().toLocaleDateString("en-CA"), dueDate: "", subtotal: "", tax: "" })
  const setInv = (k) => (e) => setInvoice({ ...invoice, [k]: e.target.value })

  const done = () => {
    for (const key of ["purchase-orders", "products", "movements", "reports", "purchase-requests", "purchase-request-alerts", "payables"]) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
    onClose()
  }
  const receive = useMutation({
    mutationFn: () =>
      receivePurchaseOrder(
        order.id,
        order.items.filter((i) => pendingOf(i) > 0).map((i) => ({
          itemId: i.id,
          quantity: Number(arriving[i.id] || 0),
          ...(i.product.tracksLots && lots[i.id]?.code?.trim() && {
            lot: { code: lots[i.id].code.trim(), expiresAt: lots[i.id].expires || null },
          }),
        })),
        withInvoice
          ? {
              number: invoice.number.trim(),
              issueDate: invoice.issueDate,
              ...(invoice.dueDate && { dueDate: invoice.dueDate }),
              ...(invoice.subtotal !== "" && { subtotal: Number(invoice.subtotal) }),
              ...(invoice.tax !== "" && { tax: Number(invoice.tax) }),
            }
          : undefined
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
  // lo que llega, a costo de la orden, con el IVA de cada producto (lo mismo que calcula el servidor)
  const arrivingCost = order.items.map((i) => (pendingOf(i) > 0 ? Number(arriving[i.id] || 0) : 0) * Number(i.unitCost))
  const calcSubtotal = arrivingCost.reduce((s, c) => s + c, 0)
  const calcTax = order.items.reduce((s, i, n) => s + (arrivingCost[n] * TAX_PERCENT[i.product.taxRate ?? "RATE_13"]) / 100, 0)

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
                    <td className="px-3 py-2">
                      {i.product.name}
                      {i.product.tracksLots && pending > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Input
                            className="h-8 w-28"
                            maxLength={40}
                            placeholder={t("products.lots.code")}
                            aria-label={t("products.lots.codeOf", { name: i.product.name })}
                            value={lots[i.id]?.code ?? ""}
                            onChange={(e) => setLots({ ...lots, [i.id]: { ...lots[i.id], code: e.target.value } })}
                          />
                          <Input
                            type="date"
                            className="h-8 w-36"
                            aria-label={t("products.lots.expiresOf", { name: i.product.name })}
                            value={lots[i.id]?.expires ?? ""}
                            onChange={(e) => setLots({ ...lots, [i.id]: { ...lots[i.id], expires: e.target.value } })}
                          />
                        </div>
                      )}
                    </td>
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

        {!ending && (
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Switch id="order-invoice" checked={withInvoice} onCheckedChange={setWithInvoice} />
              <Label htmlFor="order-invoice">{t("payables.receive.toggle")}</Label>
            </div>
            {withInvoice && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-number">{t("payables.invoice.number")}</Label>
                  <Input id="inv-number" maxLength={50} value={invoice.number} onChange={setInv("number")} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-issue">{t("payables.invoice.issueDate")}</Label>
                  <Input id="inv-issue" type="date" value={invoice.issueDate} onChange={setInv("issueDate")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-due">{t("payables.invoice.dueDate")}</Label>
                  <Input id="inv-due" type="date" value={invoice.dueDate} onChange={setInv("dueDate")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-subtotal">{t("payables.invoice.subtotal")}</Label>
                  <Input id="inv-subtotal" type="number" min={0} step="0.01" placeholder={calcSubtotal.toFixed(2)} value={invoice.subtotal} onChange={setInv("subtotal")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-tax">{t("payables.invoice.tax")}</Label>
                  <Input id="inv-tax" type="number" min={0} step="0.01" placeholder={calcTax.toFixed(2)} value={invoice.tax} onChange={setInv("tax")} />
                </div>
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">{t("payables.invoice.total")}</span>
                  <p className="font-mono text-lg">
                    {money.format((invoice.subtotal === "" ? calcSubtotal : Number(invoice.subtotal)) + (invoice.tax === "" ? calcTax : Number(invoice.tax)))}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-3">
                  {t("payables.receive.hint", { days: order.supplier.creditDays ?? 0 })}
                </p>
              </div>
            )}
          </div>
        )}

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
            <Button disabled={receive.isPending || invalid || total <= 0 || (withInvoice && !invoice.number.trim())} onClick={() => receive.mutate()}>
              {t("purchaseOrders.receiveNow")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
