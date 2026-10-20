import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate } from "react-router-dom"
import { ArrowDownToLine, ArrowUpFromLine, LogOut, Minus, Plus, Printer, Search, ShoppingCart, Trash2, Wallet, X } from "lucide-react"
import { addCashMovement, getSession, sell } from "@/api/pos"
import { getProductByBarcode, getProducts } from "@/api/products"
import { getCategories } from "@/api/categories"
import { useMoney } from "@/hoocks/useMoney"
import { useRegisterLocation } from "@/hoocks/useRegisterLocation"
import { cartTotals } from "@/lib/pos"
import { apiErrorMessage } from "@/lib/api-error"
import { BarcodeScanner } from "@/components/BarcodeScanner"
import { ChargeDialog } from "@/components/pos/ChargeDialog"
import { Ticket } from "@/components/pos/Ticket"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// /pos: caja a pantalla completa (fuera del Layout). Buscar o escanear → carrito → Cobrar (F12) → tiquete.
// F2 = buscar. El stock que se ve es el de la sucursal de la caja.
export function Pos() {
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const pinLocation = useRegisterLocation()
  const searchRef = useRef(null)
  const { data: session, isLoading } = useQuery({ queryKey: ["cash-session"], queryFn: getSession })
  const [q, setQ] = useState("")
  const [categoryId, setCategoryId] = useState(null)
  const [cart, setCart] = useState([])
  const [charging, setCharging] = useState(false)
  const [saleKey, setSaleKey] = useState(0) // reinicia el modal de cobro en cada venta
  const [ticket, setTicket] = useState(null)
  const [cashMove, setCashMove] = useState(null) // "IN" | "OUT"
  const [notice, setNotice] = useState(null)

  const locationId = session?.register.location.id
  useEffect(() => {
    if (locationId) pinLocation(locationId)
  }, [locationId]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: products } = useQuery({
    queryKey: ["products", "pos", q, categoryId, locationId],
    queryFn: () => getProducts({ view: "flat", pageSize: 60, ...(q.trim() && { q: q.trim() }), ...(categoryId && { categoryId }) }),
    enabled: !!locationId,
    placeholderData: (prev) => prev,
  })
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: getCategories })

  const totals = cartTotals(cart)
  const items = cart.reduce((s, i) => s + i.quantity, 0)

  const sale = useMutation({
    mutationFn: (payments) => sell({ lines: cart.map((i) => ({ productId: i.id, quantity: i.quantity })), payments }),
    onSuccess: (data) => {
      setCart([])
      setCharging(false)
      setTicket(data)
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["cash-session"] })
    },
  })

  // atajos: F2 buscar, F12 cobrar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F2") {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === "F12") {
        e.preventDefault()
        if (cart.length && !ticket) openCharge()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  if (isLoading) return null
  if (!session) return <Navigate to="/pos/abrir" replace />

  function openCharge() {
    sale.reset()
    setSaleKey((k) => k + 1)
    setCharging(true)
  }

  function add(p) {
    const stock = Number(p.stock)
    const inCart = cart.find((i) => i.id === p.id)
    if ((inCart?.quantity ?? 0) + 1 > stock) {
      setNotice(t("pos.noStock", { name: p.name, stock }))
      return
    }
    setNotice(null)
    setCart(
      inCart
        ? cart.map((i) => (i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...cart, { id: p.id, name: p.name, price: Number(p.price), taxRate: p.taxRate, unit: p.unit, stock, quantity: 1 }]
    )
  }
  function setQuantity(id, quantity) {
    const item = cart.find((i) => i.id === id)
    if (quantity > item.stock) {
      setNotice(t("pos.noStock", { name: item.name, stock: item.stock }))
      quantity = item.stock
    }
    setCart(quantity > 0 ? cart.map((i) => (i.id === id ? { ...i, quantity } : i)) : cart.filter((i) => i.id !== id))
  }

  // Enter en el buscador (lector de código de barras): código exacto, o el único resultado
  async function onSearchEnter(code) {
    const value = code.trim()
    if (!value) return
    const exact = products?.items.find((p) => p.barcode === value || p.sku?.toLowerCase() === value.toLowerCase())
    if (exact || products?.items.length === 1) {
      add(exact ?? products.items[0])
      setQ("")
      return
    }
    try {
      add(await getProductByBarcode(value))
      setQ("")
    } catch {
      setNotice(t("pos.notFound", { code: value }))
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-2">
        <span className="stk-logo-mark grid place-items-center" aria-hidden>S</span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{session.register.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {session.register.location.name} · {session.openedBy.name}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="hidden text-xs text-muted-foreground md:inline">
            {t("pos.sessionSales", { count: session.summary.salesCount, total: money.format(session.summary.salesTotal) })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setCashMove("IN")}>
            <ArrowDownToLine />
            <span className="hidden sm:inline">{t("pos.cashIn")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCashMove("OUT")}>
            <ArrowUpFromLine />
            <span className="hidden sm:inline">{t("pos.cashOut")}</span>
          </Button>
          <Button variant="outline" size="sm" render={<Link to="/pos/cierre" />}>
            <Wallet />
            {t("pos.closeRegister")}
          </Button>
          <Button variant="ghost" size="sm" render={<Link to="/" />} aria-label={t("pos.backToApp")}>
            <LogOut />
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] md:grid-cols-[minmax(0,1fr)_380px] md:grid-rows-1">
        {/* Catálogo */}
        <section className="flex min-h-0 flex-col gap-3 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                ref={searchRef}
                autoFocus
                className="h-11 pl-9 text-base"
                placeholder={t("pos.searchPlaceholder")}
                aria-label={t("pos.searchPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    onSearchEnter(q)
                  }
                }}
              />
              <kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground sm:block">F2</kbd>
            </div>
            <BarcodeScanner onScan={onSearchEnter} />
          </div>
          {notice && (
            <p role="status" className="flex items-center justify-between rounded-lg bg-[var(--stk-warn-bg)] px-3 py-2 text-sm text-[var(--stk-warn)]">
              {notice}
              <button type="button" aria-label={t("common.close")} onClick={() => setNotice(null)}>
                <X className="h-4 w-4" />
              </button>
            </p>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("pos.categories")}>
            {[{ id: null, name: t("pos.allCategories") }, ...categories].map((c) => (
              <button
                key={c.id ?? "all"}
                type="button"
                role="tab"
                aria-selected={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "flex-none rounded-full border px-3 py-1 text-sm transition-colors",
                  categoryId === c.id ? "border-[var(--stk-accent)] bg-[var(--stk-accent-soft)] text-[var(--stk-accent-strong)]" : "border-border bg-card hover:bg-muted"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 overflow-y-auto">
            {products?.items.map((p) => {
              const stock = Number(p.stock)
              const out = stock <= 0
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={out}
                  onClick={() => add(p)}
                  className="flex min-h-28 flex-col rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-[var(--stk-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
                  <span className="mt-auto pt-2 font-mono text-base font-semibold">{money.format(p.price)}</span>
                  <span className={cn("text-xs", out ? "text-[var(--stk-crit)]" : stock <= Number(p.minStock) ? "text-[var(--stk-warn)]" : "text-muted-foreground")}>
                    {out ? t("pos.outOfStock") : t("pos.inStock", { stock })}
                  </span>
                </button>
              )
            })}
            {products?.items.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">{t("pos.noResults")}</p>}
          </div>
        </section>

        {/* Venta actual */}
        <aside className="flex max-h-[45dvh] min-h-0 flex-col border-t border-border bg-card md:max-h-none md:border-t-0 md:border-l">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-4 w-4" aria-hidden />
              {t("pos.currentSale")}
              {items > 0 && <span className="rounded-full bg-[var(--stk-accent-soft)] px-2 text-xs text-[var(--stk-accent-strong)]">{items}</span>}
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                <Trash2 />
                {t("pos.clear")}
              </Button>
            )}
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {cart.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted-foreground">{t("pos.emptyCart")}</li>}
            {cart.map((i) => (
              <li key={i.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{i.name}</span>
                  <span className="font-mono text-sm font-semibold">{money.format(i.price * i.quantity)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{money.format(i.price)}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon-sm" aria-label={t("pos.less", { name: i.name })} onClick={() => setQuantity(i.id, i.quantity - 1)}>
                      <Minus />
                    </Button>
                    <input
                      type="number"
                      min={0}
                      step={i.unit === "UNIT" ? 1 : "any"}
                      aria-label={t("pos.quantity", { name: i.name })}
                      className="h-8 w-14 rounded-md border border-input bg-background text-center font-mono text-sm"
                      value={i.quantity}
                      onChange={(e) => setQuantity(i.id, Number(e.target.value) || 0)}
                    />
                    <Button variant="outline" size="icon-sm" aria-label={t("pos.more", { name: i.name })} onClick={() => setQuantity(i.id, i.quantity + 1)}>
                      <Plus />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-border px-4 py-3 text-sm">
            <p className="flex justify-between text-muted-foreground">
              <span>{t("pos.subtotal")}</span>
              <span className="font-mono">{money.format(totals.subtotal)}</span>
            </p>
            {totals.rates.map((r) => (
              <p key={r.pct} className="flex justify-between text-muted-foreground">
                <span>{r.pct ? t("pos.taxRate", { pct: r.pct }) : t("pos.exempt")}</span>
                <span className="font-mono">{money.format(r.tax)}</span>
              </p>
            ))}
            <p className="flex items-baseline justify-between pt-1">
              <span className="font-semibold">{t("pos.total")}</span>
              <span className="font-mono text-2xl font-semibold">{money.format(totals.total)}</span>
            </p>
            <Button size="lg" className="mt-2 h-12 w-full text-base" disabled={!cart.length} onClick={openCharge}>
              {t("pos.charge.open")}
              <kbd className="ml-2 rounded bg-white/20 px-1.5 font-mono text-[10px]">F12</kbd>
            </Button>
          </div>
        </aside>
      </div>

      <ChargeDialog
        key={saleKey}
        open={charging}
        onOpenChange={setCharging}
        total={totals.total}
        onCharge={(payments) => sale.mutate(payments)}
        pending={sale.isPending}
        error={sale.error}
      />

      <Dialog open={!!ticket} onOpenChange={(o) => !o && setTicket(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("pos.saleDone")}</DialogTitle>
          </DialogHeader>
          {ticket && <Ticket data={ticket} />}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => window.print()}>
              <Printer />
              {t("pos.print")}
            </Button>
            <Button autoFocus className="flex-1" onClick={() => setTicket(null)}>
              {t("pos.newSale")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CashMoveDialog type={cashMove} onClose={() => setCashMove(null)} />
    </div>
  )
}

// Entrada (más cambio) o retiro de efectivo del turno; cuenta en el efectivo esperado del cierre
function CashMoveDialog({ type, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const save = useMutation({
    mutationFn: () => addCashMovement({ type, amount: Number(amount), reason: reason.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-session"] })
      close()
    },
  })
  function close() {
    setAmount("")
    setReason("")
    save.reset()
    onClose()
  }
  return (
    <Dialog open={!!type} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === "IN" ? t("pos.cashInTitle") : t("pos.cashOutTitle")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="move-amount">{t("pos.charge.amount")}</Label>
            <Input id="move-amount" type="number" min={0} step="any" required autoFocus className="font-mono" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="move-reason">{t("pos.reason")}</Label>
            <Input id="move-reason" required maxLength={200} placeholder={t(`pos.reasonPlaceholder${type}`)} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("pos.error"))}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={save.isPending || !(Number(amount) > 0) || !reason.trim()}>{t("common.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
