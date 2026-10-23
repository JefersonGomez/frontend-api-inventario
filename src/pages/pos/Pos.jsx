import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link, Navigate } from "react-router-dom"
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, HandCoins, LogOut, Undo2, Minus, MonitorUp, Percent, Plus, Printer, Search, ShoppingCart, Trash2, UserRound,
  Wallet, WifiOff, X,
} from "lucide-react"
import { addCashMovement, getCatalog, getDiscountTypes, getSession, sell } from "@/api/pos"
import { getAccount } from "@/api/receivables"
import { getProductByBarcode, getProducts } from "@/api/products"
import { getCategories } from "@/api/categories"
import { getCompany } from "@/api/company"
import { useMoney } from "@/hoocks/useMoney"
import { useRegisterLocation } from "@/hoocks/useRegisterLocation"
import { applyDiscounts, cartTotals } from "@/lib/pos"
import { formatFiscalId } from "@/lib/fiscal"
import { openChannel, openCustomerWindow } from "@/lib/customer-display"
import { apiErrorMessage } from "@/lib/api-error"
import { cached, findInCatalog, flushSales, isNetworkError, pendingSales, provisionalTicket, queueSale, searchCatalog } from "@/lib/offline-sales"
import { BarcodeScanner } from "@/components/BarcodeScanner"
import { ChargeDialog } from "@/components/pos/ChargeDialog"
import { CustomerPicker } from "@/components/pos/CustomerPicker"
import { DiscountDialog } from "@/components/pos/DiscountDialog"
import { PriceDialog } from "@/components/pos/PriceDialog"
import { PaymentDialog } from "@/components/pos/PaymentDialog"
import { FindSaleDialog } from "@/components/sales/FindSaleDialog"
import { ReturnFlow } from "@/components/sales/ReturnFlow"
import { Ticket } from "@/components/pos/Ticket"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// "3*" o "3*750123" en el buscador: multiplica la próxima línea
const MULT = /^(\d+(?:[.,]\d+)?)\s*\*\s*(.*)$/

// navigator.onLine como estado de React (cambia con los eventos online/offline)
const subscribeOnline = (cb) => {
  window.addEventListener("online", cb)
  window.addEventListener("offline", cb)
  return () => {
    window.removeEventListener("online", cb)
    window.removeEventListener("offline", cb)
  }
}

// /pos: caja a pantalla completa (fuera del Layout). Buscar o escanear → venta → Cobrar (F12) → tiquete.
// La venta es lo principal (el cliente la va viendo); con pantalla del cliente se refleja en otro monitor.
// Sin stock en el sistema se puede vender igual como negativa, con el código del encargado (no con lotes).
// Descuentos por línea o al total: siempre con el código del encargado. Con cliente identificado: factura.
export function Pos() {
  const { t } = useTranslation()
  const money = useMoney()
  const queryClient = useQueryClient()
  const pinLocation = useRegisterLocation()
  const searchRef = useRef(null)
  const { data: session, isLoading } = useQuery({ queryKey: ["cash-session"], queryFn: cached("cash-session", getSession), networkMode: "always" })
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: cached("company", getCompany), networkMode: "always" })
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine)
  const [queue, setQueue] = useState({ pending: 0, failed: 0 }) // ventas sin conexión por enviar / rechazadas
  const saleId = useRef(null) // id de la venta que se está cobrando: si llega dos veces, el servidor no la duplica
  const [q, setQ] = useState("")
  const [mult, setMult] = useState(null)
  const [categoryId, setCategoryId] = useState(null)
  const [cart, setCart] = useState([])
  const [lastId, setLastId] = useState(null)
  const [charging, setCharging] = useState(false)
  const [saleKey, setSaleKey] = useState(0) // reinicia el modal de cobro en cada venta
  const [ticket, setTicket] = useState(null)
  const [cashMove, setCashMove] = useState(null) // "IN" | "OUT"
  const [notice, setNotice] = useState(null)
  const [negativePin, setNegativePin] = useState(null)
  const [askNegative, setAskNegative] = useState(null) // lista de faltantes a autorizar
  const [totalDiscount, setTotalDiscount] = useState(null) // { typeId, value? }
  const [discountPin, setDiscountPin] = useState(null)
  const [discountFor, setDiscountFor] = useState(null) // target del DiscountDialog
  const [priceFor, setPriceFor] = useState(null) // línea a la que se le ajusta el precio
  const [customer, setCustomer] = useState(null)
  const [pickingCustomer, setPickingCustomer] = useState(false) // false | "sale" | "payment" (abono)
  const [payingCustomer, setPayingCustomer] = useState(null) // abono de este cliente
  const [findingSale, setFindingSale] = useState(false) // devolución: buscar el tiquete
  const [returnSaleId, setReturnSaleId] = useState(null)

  const locationId = session?.register.location.id
  const showStock = company?.posShowStock !== false
  useEffect(() => {
    if (locationId) pinLocation(locationId)
  }, [locationId]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: products } = useQuery({
    queryKey: ["products", "pos", q, categoryId, locationId],
    queryFn: () => {
      const params = { view: "flat", pageSize: 60, ...(q.trim() && !MULT.test(q) && { q: q.trim() }), ...(categoryId && { categoryId }) }
      return getProducts(params).catch((e) => (isNetworkError(e) ? searchCatalog(params) : Promise.reject(e)))
    },
    enabled: !!locationId,
    placeholderData: (prev) => prev,
    networkMode: "always",
  })
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: cached("categories", getCategories), networkMode: "always" })
  const { data: discountTypes = [] } = useQuery({ queryKey: ["discount-types"], queryFn: cached("discount-types", getDiscountTypes), networkMode: "always" })
  // catálogo completo guardado en el navegador para buscar y vender sin conexión
  useQuery({ queryKey: ["pos-catalog"], queryFn: cached("catalog", getCatalog), enabled: !!locationId, refetchInterval: 5 * 60_000, networkMode: "always" })

  // cola de ventas sin conexión: se envía al abrir la caja, al volver la red y cada 30 s
  const refreshQueue = () => pendingSales().then(setQueue).catch(() => {})
  useEffect(() => {
    const sync = async () => {
      const sent = await flushSales().catch(() => 0)
      refreshQueue()
      if (sent) for (const key of ["products", "cash-session", "pos-catalog"]) queryClient.invalidateQueries({ queryKey: [key] })
    }
    sync()
    window.addEventListener("online", sync)
    const timer = setInterval(sync, 30_000)
    return () => {
      window.removeEventListener("online", sync)
      clearInterval(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // agotados al final
  const tiles = [...(products?.items ?? [])].sort((a, b) => (Number(a.stock) > 0 ? 0 : 1) - (Number(b.stock) > 0 ? 0 : 1))

  const discounts = applyDiscounts(cart, discountTypes, totalDiscount)
  const totals = cartTotals(cart.map((i, n) => ({ ...i, discountAmount: discounts.lines[n].amount })))
  const items = cart.reduce((s, i) => s + i.quantity, 0)
  const negatives = cart.filter((i) => i.quantity > i.stock)

  // pantalla del cliente: se le manda la venta en cada cambio y cuando la pide al abrirse
  const display = useRef(null)
  const displayState = {
    company: company?.name ?? "",
    items: cart.map((i, n) => ({
      id: i.id, name: i.name, quantity: i.quantity, price: i.price,
      discount: discounts.lines[n].amount, total: i.price * i.quantity - discounts.lines[n].amount,
    })),
    discount: discounts.discount,
    total: totals.total,
    rates: totals.rates,
    lastId,
    currency: money.currency,
    paid: ticket && {
      total: Number(ticket.document.total),
      change: ticket.document.payments.reduce((s, p) => s + (p.tendered != null ? Number(p.tendered) - Number(p.amount) : 0), 0),
    },
  }
  const stateRef = useRef(displayState)
  useEffect(() => {
    stateRef.current = displayState // lo último que se dibujó (la pantalla del cliente lo pide al abrirse)
  })
  useEffect(() => {
    if (!session?.register.customerDisplay) return
    display.current = openChannel((m) => m === "hello" && display.current?.post(stateRef.current))
    return () => display.current?.close()
  }, [session?.register.customerDisplay])
  useEffect(() => {
    display.current?.post(stateRef.current)
  }, [cart, ticket, lastId, company?.name, totalDiscount, discountTypes])

  // cliente con crédito: su estado de cuenta para cobrar a crédito (disponible, vencidas)
  const { data: account } = useQuery({
    queryKey: ["receivables", customer?.id],
    queryFn: () => getAccount(customer.id),
    enabled: customer?.creditLimit != null,
  })

  const sale = useMutation({
    networkMode: "always",
    mutationFn: ({ payments, credit }) => {
      const body = {
        clientSaleId: saleId.current,
        lines: cart.map((i) => ({
          productId: i.id, quantity: i.quantity,
          ...(i.discount && { discount: i.discount }),
          ...(i.newPrice != null && { price: i.newPrice, priceReason: i.priceReason }),
        })),
        payments,
        ...(totalDiscount && { discount: totalDiscount }),
        ...(customer && { customerId: customer.id }),
        ...(negativePin && { negativePin }),
        ...(discountPin && { discountPin }),
        ...credit, // { credit: { frequency, installments }, creditPin }
      }
      // sin red: el contado simple se guarda y se envía solo al volver la conexión (con el precio que se cobró)
      const simple = !credit?.credit && !totalDiscount && cart.every((i) => !i.discount && i.newPrice == null)
      const offline = {
        clientSaleId: body.clientSaleId,
        lines: cart.map((i) => ({ productId: i.id, quantity: i.quantity, seenPrice: i.price })),
        payments,
        ...(customer && { customerId: customer.id }),
      }
      return sell(body).catch((e) =>
        isNetworkError(e) && simple ? queueSale(offline).then((queued) => provisionalTicket({ sale: queued, cart, company, session })) : Promise.reject(e)
      )
    },
    onSuccess: (data) => {
      refreshQueue()
      resetSale()
      setCharging(false)
      setTicket(data)
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["cash-session"] })
      queryClient.invalidateQueries({ queryKey: ["receivables"] })
    },
    onError: (e) => {
      const body = e.response?.data
      if (body?.code === "NEGATIVE_NEEDS_AUTH") {
        // el stock cambió mientras se cobraba: pedir la autorización con lo que dice el servidor
        setCharging(false)
        setAskNegative(body.shortages.map((s) => ({ name: s.name, stock: s.stock, quantity: s.wanted })))
      } else if (body?.code === "DISCOUNT_NEEDS_AUTH" || body?.code === "DISCOUNT_PIN") {
        // código del encargado incorrecto o vencido: pedirlo otra vez (los descuentos quedan)
        setCharging(false)
        setDiscountPin(null)
        setDiscountFor({ scope: "PIN" })
      } else if (e.response?.status === 403) setNegativePin(null)
    },
  })

  function openCharge() {
    saleId.current = crypto.randomUUID()
    sale.reset()
    setSaleKey((k) => k + 1)
    setCharging(true)
  }
  function startCharge() {
    // sin conexión la negativa se acepta y se revisa después (no se puede validar el código del encargado)
    if (negatives.length && !negativePin && online) setAskNegative(negatives)
    else openCharge()
  }

  // atajos: F2 buscar, F12 cobrar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F2") {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === "F12") {
        e.preventDefault()
        if (cart.length && !ticket && !charging && !askNegative && !discountFor && !priceFor && !pickingCustomer && !payingCustomer && !findingSale && !returnSaleId) startCharge()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  if (isLoading) return null
  if (!session) return <Navigate to="/pos/abrir" replace />
  const s = session.summary

  function resetSale() {
    setCart([])
    setLastId(null)
    setNegativePin(null)
    setTotalDiscount(null)
    setDiscountPin(null)
    setCustomer(null)
  }
  // el descuento elegido en el diálogo (o null = solo el código otra vez)
  function applyDiscount(pick, pin) {
    setDiscountPin(pin)
    if (discountFor.scope === "LINE") setCart(cart.map((i) => (i.id === discountFor.id ? { ...i, discount: pick } : i)))
    else if (discountFor.scope === "TOTAL") setTotalDiscount(pick)
    setDiscountFor(null)
    if (!pick) openCharge()
  }
  // ajuste de precio de una línea (null = quitarlo); usa el mismo código del encargado que los descuentos
  function applyPrice(adjust, pin) {
    if (pin) setDiscountPin(pin)
    setCart(cart.map((i) => (i.id === priceFor.id ? { ...i, newPrice: adjust?.newPrice, priceReason: adjust?.priceReason } : i)))
    setPriceFor(null)
  }
  function removeDiscount() {
    if (discountFor.scope === "LINE") setCart(cart.map((i) => (i.id === discountFor.id ? { ...i, discount: undefined } : i)))
    else setTotalDiscount(null)
    setDiscountFor(null)
  }


  function add(p, qty = mult ?? 1) {
    const stock = Number(p.stock)
    const inCart = cart.find((i) => i.id === p.id)
    const next = (inCart?.quantity ?? 0) + qty
    if (p.tracksLots && next > stock) {
      setNotice(t("pos.noStockLots", { name: p.name, stock }))
      return
    }
    setNotice(next > stock ? t("pos.negativeLine", { name: p.name, stock }) : null)
    setCart(
      inCart
        ? cart.map((i) => (i.id === p.id ? { ...i, quantity: next } : i))
        : [...cart, { id: p.id, name: p.name, price: Number(p.price), taxRate: p.taxRate, unit: p.unit, stock, tracksLots: p.tracksLots, quantity: qty }]
    )
    setLastId(p.id)
    setMult(null)
  }
  function setQuantity(id, quantity) {
    const item = cart.find((i) => i.id === id)
    if (item.tracksLots && quantity > item.stock) {
      setNotice(t("pos.noStockLots", { name: item.name, stock: item.stock }))
      quantity = item.stock
    }
    setLastId(id)
    const next = quantity > 0 ? cart.map((i) => (i.id === id ? { ...i, quantity } : i)) : cart.filter((i) => i.id !== id)
    setCart(next)
    if (!next.length) resetSale()
  }

  // Enter en el buscador (lector de código de barras): código exacto, o el único resultado. "3*" multiplica.
  async function onSearchEnter(raw) {
    let value = raw.trim()
    let qty = mult ?? 1
    const m = value.match(MULT)
    if (m) {
      qty = Number(m[1].replace(",", "."))
      value = m[2].trim()
      if (!value) {
        setMult(qty)
        setQ("")
        return
      }
    }
    if (!value) return
    const exact = products?.items.find((p) => p.barcode === value || p.sku?.toLowerCase() === value.toLowerCase())
    if (exact || (!m && products?.items.length === 1)) {
      add(exact ?? products.items[0], qty)
      setQ("")
      return
    }
    try {
      add(await getProductByBarcode(value).catch((e) => (isNetworkError(e) ? findInCatalog(value) : Promise.reject(e))), qty)
      setQ("")
    } catch {
      setNotice(t("pos.notFound", { code: value }))
    }
  }

  const stockLabel = (stock, minStock) => {
    if (stock <= 0) return t("pos.outOfStock")
    if (showStock) return t("pos.inStock", { stock })
    return stock <= minStock ? t("pos.fewLeft") : t("pos.available")
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
        {(!online || queue.pending > 0 || queue.failed > 0) && (
          <p role="status" className="flex items-center gap-1.5 rounded-full bg-[var(--stk-warn-bg)] px-3 py-1 text-xs font-medium text-[var(--stk-warn)]">
            {!online && <WifiOff className="h-3.5 w-3.5" aria-hidden />}
            {[!online && t("pos.offline.status"), queue.pending > 0 && t("pos.offline.pending", { count: queue.pending }), queue.failed > 0 && t("pos.offline.failed", { count: queue.failed })]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {/* contadores del turno (cierre ciego: sin el efectivo en caja) */}
        <dl className="flex flex-wrap gap-2" aria-label={t("pos.counters.label")}>
          <Counter label={t("pos.counters.sales")} value={s.salesCount} />
          <Counter label={t("pos.counters.total")} value={money.format(s.salesTotal)} strong />
          <Counter label={t("pos.methods.CARD")} value={money.format(s.payments.CARD ?? 0)} />
          <Counter label={t("pos.methods.SINPE")} value={money.format(s.payments.SINPE ?? 0)} />
        </dl>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {session.register.customerDisplay && (
            <Button variant="outline" size="sm" onClick={openCustomerWindow}>
              <MonitorUp />
              <span className="hidden lg:inline">{t("pos.customerDisplay")}</span>
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={!online} onClick={() => setFindingSale(true)} aria-label={t("sales.return.button")}>
            <Undo2 />
            <span className="hidden lg:inline">{t("sales.return.button")}</span>
          </Button>
          <Button variant="outline" size="sm" disabled={!online} onClick={() => setPickingCustomer("payment")} aria-label={t("receivables.pay.button")}>
            <HandCoins />
            <span className="hidden lg:inline">{t("receivables.pay.button")}</span>
          </Button>
          <Button variant="outline" size="sm" disabled={!online} onClick={() => setCashMove("IN")} aria-label={t("pos.cashIn")}>
            <ArrowDownToLine />
            <span className="hidden lg:inline">{t("pos.cashIn")}</span>
          </Button>
          <Button variant="outline" size="sm" disabled={!online} onClick={() => setCashMove("OUT")} aria-label={t("pos.cashOut")}>
            <ArrowUpFromLine />
            <span className="hidden lg:inline">{t("pos.cashOut")}</span>
          </Button>
          <Button variant="outline" size="sm" disabled={!online} render={<Link to="/pos/cierre" />}>
            <Wallet />
            {t("pos.closeRegister")}
          </Button>
          <Button variant="ghost" size="sm" render={<Link to="/" />} aria-label={t("pos.backToApp")}>
            <LogOut />
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1.2fr)] md:grid-cols-[minmax(0,1fr)_minmax(400px,42%)] md:grid-rows-1">
        {/* Catálogo */}
        <section className="flex min-h-0 flex-col gap-3 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                ref={searchRef}
                autoFocus
                className={cn("h-11 pl-9 text-base", mult && "pl-20")}
                placeholder={t("pos.searchPlaceholder")}
                aria-label={t("pos.searchPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    onSearchEnter(q)
                  } else if (e.key === "Escape") setMult(null)
                }}
              />
              {mult && (
                <button
                  type="button"
                  onClick={() => setMult(null)}
                  className="absolute top-1/2 left-8 -translate-y-1/2 rounded-md bg-[var(--stk-accent)] px-1.5 font-mono text-xs font-semibold text-[var(--stk-accent-fg)]"
                  aria-label={t("pos.multClear", { n: mult })}
                >
                  ×{mult}
                </button>
              )}
              <kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground sm:block">F2</kbd>
            </div>
            <BarcodeScanner onScan={onSearchEnter} />
          </div>
          <p className="-mt-1 text-xs text-muted-foreground">{t("pos.multHint")}</p>
          {notice && (
            <p role="status" className="flex items-center justify-between gap-2 rounded-lg bg-[var(--stk-warn-bg)] px-3 py-2 text-sm text-[var(--stk-warn)]">
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
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 overflow-y-auto">
            {tiles.map((p) => {
              const stock = Number(p.stock)
              const out = stock <= 0
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={out && p.tracksLots}
                  onClick={() => add(p)}
                  className={cn(
                    "flex min-h-24 flex-col rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-[var(--stk-accent)] disabled:cursor-not-allowed disabled:opacity-50",
                    out && "opacity-60"
                  )}
                >
                  <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
                  <span className="mt-auto pt-2 font-mono text-base font-semibold">{money.format(p.price)}</span>
                  <span className={cn("text-xs", out ? "text-[var(--stk-crit)]" : stock <= Number(p.minStock) ? "text-[var(--stk-warn)]" : "text-muted-foreground")}>
                    {stockLabel(stock, Number(p.minStock))}
                  </span>
                </button>
              )
            })}
            {products?.items.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">{t("pos.noResults")}</p>}
          </div>
        </section>

        {/* Venta actual: lo principal, el cliente la va viendo */}
        <aside className="flex min-h-0 flex-col border-t border-border bg-card md:border-t-0 md:border-l">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShoppingCart className="h-5 w-5" aria-hidden />
              {t("pos.currentSale")}
              {items > 0 && <span className="rounded-full bg-[var(--stk-accent-soft)] px-2 text-sm text-[var(--stk-accent-strong)]">{t("pos.itemsCount", { count: items })}</span>}
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetSale}>
                <Trash2 />
                {t("pos.clear")}
              </Button>
            )}
          </div>
          <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto" aria-live="polite">
            {cart.length === 0 && <li className="px-5 py-12 text-center text-muted-foreground">{t("pos.emptyCart")}</li>}
            {cart.map((i, n) => {
              const negative = i.quantity > i.stock
              const last = i.id === lastId
              const lineDiscount = discounts.lines[n]
              const gross = i.price * i.quantity
              return (
                <li
                  key={i.id}
                  ref={last ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                  className={cn("px-5 py-3 transition-colors", last && "bg-[var(--stk-accent-soft)]")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-base font-medium">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{n + 1}</span>
                      {i.name}
                    </span>
                    <span className="text-right font-mono text-lg font-semibold">
                      {lineDiscount.amount > 0 && <s className="block text-xs font-normal text-muted-foreground">{money.format(gross)}</s>}
                      {money.format(gross - lineDiscount.amount)}
                    </span>
                  </div>
                  {lineDiscount.amount > 0 && (
                    <p className="mt-0.5 text-sm text-[var(--stk-ok)]">
                      {lineDiscount.label} −{money.format(lineDiscount.amount)}
                    </p>
                  )}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                      {i.quantity} ×{" "}
                      <button
                        type="button"
                        disabled={!online}
                        className="rounded px-1 underline decoration-dotted underline-offset-4 hover:bg-muted disabled:no-underline disabled:hover:bg-transparent"
                        aria-label={t("pos.price.aria", { name: i.name })}
                        title={t("pos.price.change")}
                        onClick={() => setPriceFor(i)}
                      >
                        {i.newPrice != null && <s className="mr-1">{money.format(i.price)}</s>}
                        {money.format(i.newPrice ?? i.price)}
                      </button>
                      {negative && (
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--stk-warn-bg)] px-1.5 font-sans text-xs font-medium text-[var(--stk-warn)]">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          {t("pos.negative")}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant={i.discount ? "secondary" : "ghost"}
                        size="icon-sm"
                        aria-label={t("pos.discount.lineAria", { name: i.name })}
                        title={t("pos.discount.line")}
                        disabled={!online}
                        onClick={() => setDiscountFor({ scope: "LINE", id: i.id, name: i.name, base: (i.newPrice ?? i.price) * i.quantity, pick: i.discount })}
                      >
                        <Percent />
                      </Button>
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
              )
            })}
          </ol>
          <div className="border-t border-border p-4">
            <div className="mb-3 flex gap-2">
              <Button variant="outline" size="sm" className="min-w-0 flex-1 justify-start" disabled={!online} onClick={() => setPickingCustomer("sale")}>
                <UserRound />
                <span className="truncate">{customer ? customer.name : t("pos.customer.add")}</span>
              </Button>
              {customer && (
                <Button variant="ghost" size="icon-sm" aria-label={t("pos.customer.remove")} onClick={() => setCustomer(null)}>
                  <X />
                </Button>
              )}
              <Button
                variant={totalDiscount ? "secondary" : "outline"}
                size="sm"
                disabled={!cart.length || !online}
                onClick={() => setDiscountFor({ scope: "TOTAL", base: discounts.totalBase, pick: totalDiscount })}
              >
                <Percent />
                {t("pos.discount.total")}
              </Button>
            </div>
            {customer && (
              <p className="-mt-1 mb-2 px-1 text-xs text-muted-foreground">
                {customer.idType && customer.idNumber ? t("pos.customer.invoice", { id: formatFiscalId(t, customer.idType, customer.idNumber) }) : t("pos.customer.ticketNoId")}
              </p>
            )}
            <div className="space-y-1 px-1 pb-3 text-sm text-muted-foreground">
              {discounts.discount > 0 && (
                <p className="flex justify-between text-[var(--stk-ok)]">
                  <span>{t("pos.discount.label")}</span>
                  <span className="font-mono">−{money.format(discounts.discount)}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span>{t("pos.subtotal")}</span>
                <span className="font-mono">{money.format(totals.subtotal)}</span>
              </p>
              {totals.rates.map((r) => (
                <p key={r.pct} className="flex justify-between">
                  <span>{r.pct ? t("pos.taxRate", { pct: r.pct }) : t("pos.exempt")}</span>
                  <span className="font-mono">{money.format(r.tax)}</span>
                </p>
              ))}
            </div>
            <div className="flex items-baseline justify-between rounded-xl bg-[var(--stk-kpi-dark)] px-5 py-3 text-white">
              <span className="text-sm uppercase tracking-wide opacity-70">{t("pos.total")}</span>
              <span className="font-mono text-4xl font-semibold">{money.format(totals.total)}</span>
            </div>
            <Button size="lg" className="mt-3 h-12 w-full text-base" disabled={!cart.length} onClick={startCharge}>
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
        onCharge={(payments, credit) => sale.mutate({ payments, credit })}
        account={customer?.creditLimit != null ? account : null}
        pending={sale.isPending}
        error={sale.error}
      />

      <PriceDialog item={priceFor} onApply={applyPrice} onRemove={() => applyPrice(null)} onClose={() => setPriceFor(null)} />
      <DiscountDialog target={discountFor} types={discountTypes} onApply={applyDiscount} onRemove={removeDiscount} onClose={() => setDiscountFor(null)} />

      <CustomerPicker
        open={!!pickingCustomer}
        onClose={() => setPickingCustomer(false)}
        onPick={(c) => {
          if (pickingCustomer === "payment") setPayingCustomer(c)
          else setCustomer(c)
          setPickingCustomer(false)
        }}
      />
      <PaymentDialog customer={payingCustomer} inRegister onClose={() => setPayingCustomer(null)} />
      <FindSaleDialog
        open={findingSale}
        onClose={() => setFindingSale(false)}
        onPick={(id) => {
          setFindingSale(false)
          setReturnSaleId(id)
        }}
      />
      <ReturnFlow saleId={returnSaleId} onClose={() => setReturnSaleId(null)} />

      <NegativeDialog
        items={askNegative}
        onCancel={() => setAskNegative(null)}
        onConfirm={(pin) => {
          setNegativePin(pin)
          setAskNegative(null)
          openCharge()
        }}
      />

      <Dialog open={!!ticket} onOpenChange={(o) => !o && setTicket(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("pos.saleDone")}</DialogTitle>
          </DialogHeader>
          {ticket?.document.provisional && <p className="text-sm text-[var(--stk-warn)]">{t("pos.offline.saved")}</p>}
          {ticket?.negatives > 0 && <p className="text-sm text-[var(--stk-warn)]">{t("pos.negativesSent", { count: ticket.negatives })}</p>}
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

function Counter({ label, value, strong }) {
  return (
    <div className={cn("rounded-lg border px-3 py-1", strong ? "border-[var(--stk-accent)] bg-[var(--stk-accent-soft)]" : "border-border")}>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono font-semibold", strong ? "text-lg text-[var(--stk-accent-strong)]" : "text-base")}>{value}</dd>
    </div>
  )
}

// Negativa: el sistema no tiene stock suficiente. Un encargado escribe su código para vender igual;
// el servidor lo valida al cobrar y le avisa a inventario.
function NegativeDialog({ items, onCancel, onConfirm }) {
  const { t } = useTranslation()
  const [pin, setPin] = useState("")
  const close = () => {
    setPin("")
    onCancel()
  }
  return (
    <Dialog open={!!items} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--stk-warn)]" aria-hidden />
            {t("pos.negativeTitle")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("pos.negativeHint")}</p>
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">
          {items?.map((i) => (
            <li key={i.name} className="flex justify-between gap-3 px-3 py-2">
              <span className="font-medium">{i.name}</span>
              <span className="font-mono text-muted-foreground">{t("pos.negativeRow", { stock: i.stock, quantity: i.quantity })}</span>
            </li>
          ))}
        </ul>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            onConfirm(pin)
            setPin("")
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="negative-pin">{t("pos.negativePin")}</Label>
            <Input
              id="negative-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              maxLength={6}
              className="font-mono text-lg tracking-widest"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pin.length < 4}>{t("pos.negativeAuthorize")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
