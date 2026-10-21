import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Tag } from "lucide-react"
import { useMoney } from "@/hoocks/useMoney"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Ajuste de precio de una línea (precio de góndola mal): solo hacia abajo, con motivo y el código del
// encargado. item = línea del carrito; el comprobante lleva el precio del catálogo y la diferencia como descuento.
export function PriceDialog({ item, onApply, onRemove, onClose }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{item && <PriceForm key={item.id} item={item} onApply={onApply} onRemove={onRemove} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function PriceForm({ item, onApply, onRemove, onClose }) {
  const { t } = useTranslation()
  const money = useMoney()
  const [price, setPrice] = useState(item.newPrice != null ? String(item.newPrice) : "")
  const [reason, setReason] = useState(item.priceReason ?? t("pos.price.shelf"))
  const [pin, setPin] = useState("")
  const value = Number(price)
  const valid = value > 0 && value < item.price && reason.trim().length >= 3 && pin.length >= 4

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onApply({ newPrice: value, priceReason: reason.trim() }, pin)
      }}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" aria-hidden />
          {t("pos.price.title", { name: item.name })}
        </DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">{t("pos.price.catalog", { price: money.format(item.price) })}</p>
      <div className="space-y-2">
        <Label htmlFor="price-new">{t("pos.price.new")}</Label>
        <Input id="price-new" type="number" min="0.01" max={item.price - 0.01} step="0.01" required autoFocus className="font-mono" value={price} onChange={(e) => setPrice(e.target.value)} />
        {value >= item.price && <p className="text-xs text-destructive">{t("pos.price.onlyLower")}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="price-reason">{t("pos.price.reason")}</Label>
        <Input id="price-reason" required minLength={3} maxLength={60} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price-pin">{t("pos.discount.pin")}</Label>
        <Input
          id="price-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          className="font-mono text-lg tracking-widest"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {item.newPrice != null && (
          <Button type="button" variant="ghost" className="mr-auto" onClick={onRemove}>
            {t("pos.price.remove")}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button type="submit" disabled={!valid}>{t("pos.discount.apply")}</Button>
      </div>
    </form>
  )
}
