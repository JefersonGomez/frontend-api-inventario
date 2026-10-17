import { useState } from "react"
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { ArrowRight, Plus, Trash2 } from "lucide-react"
import { getTransfers, getTransfer, createTransfer, receiveTransfer, cancelTransfer } from "@/api/transfers"
import { getLocations } from "@/api/locations"
import { useAuth } from "@/context/AuthContext"
import { usePermissions } from "@/hoocks/usePermissions"
import { useListParams } from "@/hoocks/useListParams"
import { apiErrorMessage } from "@/lib/api-error"
import { formatQty, qtyStep } from "@/lib/units"
import { ProductPicker } from "@/components/ProductPicker"
import { LocationSelect } from "@/components/LocationSelect"
import { Pagination } from "@/components/Pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const STATUS_VARIANT = { IN_TRANSIT: "default", RECEIVED: "secondary", CANCELLED: "outline" }
const emptyLine = () => ({ product: null, quantity: "" })

// Transferencias entre sucursales y bodegas en dos pasos: el origen envía (el stock queda en
// tránsito) y el destino recibe lo que llegó (la diferencia es faltante). Cancelar devuelve al origen.
export function Transfers() {
  const { t } = useTranslation()
  const { activeLocationId } = usePermissions()
  const list = useListParams()
  const status = list.get("status")
  const highlight = list.get("highlight")
  const [creating, setCreating] = useState(false)

  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: () => getLocations() })
  const transfers = useQuery({
    queryKey: ["transfers", list.page, status],
    queryFn: () => getTransfers({ page: list.page, ...(status && { status }) }),
    placeholderData: keepPreviousData,
  })
  const items = transfers.data?.items ?? []
  const statusItems = [
    { value: "all", label: t("list.all") },
    ...["IN_TRANSIT", "RECEIVED", "CANCELLED"].map((s) => ({ value: s, label: t(`transfers.status.${s}`) })),
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("transfers.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("transfers.subtitle")}</p>
        </div>
        {locations.length > 1 && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("transfers.new")}
          </Button>
        )}
      </div>

      <div className="mb-4">
        <Select items={statusItems} value={status || "all"} onValueChange={(v) => list.set({ status: v === "all" ? "" : v })}>
          <SelectTrigger className="w-48" aria-label={t("transfers.statusLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("transfers.date")}</TableHead>
              <TableHead>{t("transfers.route")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("transfers.lines")}</TableHead>
              <TableHead>{t("transfers.statusLabel")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("transfers.sentBy")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
            )}
            {!transfers.isLoading && items.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("transfers.empty")}</TableCell></TableRow>
            )}
            {items.map((tr) => (
              <TableRow
                key={tr.id}
                className={`cursor-pointer ${tr.id === highlight ? "bg-primary/10" : ""}`}
                onClick={() => list.set({ highlight: tr.id, page: list.page })}
              >
                <TableCell className="whitespace-nowrap text-muted-foreground">{new Date(tr.sentAt).toLocaleString()}</TableCell>
                <TableCell className="font-medium">
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {tr.fromLocation.name}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-label={t("transfers.to")} />
                    {tr.toLocation.name}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{t("transfers.lineCount", { count: tr.items.length })}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[tr.status]}>{t(`transfers.status.${tr.status}`)}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{tr.sentBy.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination data={transfers.data} onPage={list.setPage} />

      {creating && <NewTransferDialog locations={locations} defaultFrom={activeLocationId} onClose={() => setCreating(false)} />}
      {highlight && <TransferDetail id={highlight} onClose={() => list.set({ highlight: "", page: list.page })} />}
    </div>
  )
}

function NewTransferDialog({ locations, defaultFrom, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [lines, setLines] = useState([emptyLine()])
  const [notes, setNotes] = useState("")

  const from = fromId || defaultFrom || locations[0]?.id
  const toItems = locations.filter((l) => l.id !== from).map((l) => ({ value: l.id, label: l.name }))
  const update = (i, patch) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const ready = toId && toId !== from && lines.length > 0 && lines.every((l) => l.product && Number(l.quantity) > 0)

  const mutation = useMutation({
    mutationFn: () =>
      createTransfer({
        fromLocationId: from,
        toLocationId: toId,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({ productId: l.product.id, quantity: Number(l.quantity) })),
      }),
    onSuccess: () => {
      for (const key of ["transfers", "products", "movements", "reports"]) queryClient.invalidateQueries({ queryKey: [key] })
      onClose()
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("transfers.new")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <LocationSelect id="transfer-from" label={t("transfers.from")} value={from} onChange={(v) => { setFromId(v); if (v === toId) setToId("") }} />
            <div className="space-y-1.5">
              <Label htmlFor="transfer-to">{t("transfers.to")}</Label>
              <Select items={toItems} value={toId} onValueChange={setToId}>
                <SelectTrigger id="transfer-to" className="w-full">
                  <SelectValue placeholder={t("transfers.chooseTo")} />
                </SelectTrigger>
                <SelectContent>
                  {toItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">{t("transfers.products")}</legend>
            {lines.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <ProductPicker id={`transfer-product-${i}`} value={line.product} onChange={(product) => update(i, { product })} required />
                </div>
                <Input
                  type="number"
                  className="w-28"
                  min={qtyStep(line.product?.unit)}
                  step={qtyStep(line.product?.unit)}
                  value={line.quantity}
                  onChange={(e) => update(i, { quantity: e.target.value })}
                  aria-label={t("transfers.quantity")}
                  placeholder={t("transfers.quantity")}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={lines.length === 1}
                  onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  aria-label={t("transfers.removeLine")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("transfers.addLine")}
            </Button>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="transfer-notes">{t("transfers.notes")}</Label>
            <Input id="transfer-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">{t("transfers.sendHint")}</p>

          {mutation.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(mutation.error, t("transfers.error"))}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={!ready || mutation.isPending}>{t("transfers.send")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Detalle: recibir (en el destino, anotando lo que llegó) o cancelar (quien envió, encargado o admin)
function TransferDetail({ id, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { can, locationIds } = usePermissions()
  const { data: tr, isError } = useQuery({ queryKey: ["transfers", "detail", id], queryFn: () => getTransfer(id) })
  const [received, setReceived] = useState({}) // itemId → cantidad que llegó (vacío = lo enviado)

  const done = () => {
    for (const key of ["transfers", "products", "movements", "reports", "notifications"]) queryClient.invalidateQueries({ queryKey: [key] })
  }
  const receive = useMutation({
    mutationFn: () =>
      receiveTransfer(id, tr.items.map((i) => ({ itemId: i.id, receivedQuantity: received[i.id] === undefined || received[i.id] === "" ? Number(i.quantity) : Number(received[i.id]) }))),
    onSuccess: done,
  })
  const cancel = useMutation({ mutationFn: () => cancelTransfer(id), onSuccess: done })

  const inTransit = tr?.status === "IN_TRANSIT"
  const canReceive = inTransit && (!locationIds || locationIds.includes(tr.toLocation.id))
  const canCancel = inTransit && (tr.sentBy.id === user?.id || can("purchases.manage"))
  const error = receive.error || cancel.error

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("transfers.detailTitle")}</DialogTitle>
        </DialogHeader>
        {isError && <p role="alert" className="text-sm text-destructive">{t("transfers.notFound")}</p>}
        {tr && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-muted-foreground">{t("transfers.route")}</dt>
              <dd className="inline-flex flex-wrap items-center gap-1.5 font-medium">
                {tr.fromLocation.name} <ArrowRight className="h-3.5 w-3.5" aria-label={t("transfers.to")} /> {tr.toLocation.name}
              </dd>
              <dt className="text-muted-foreground">{t("transfers.statusLabel")}</dt>
              <dd><Badge variant={STATUS_VARIANT[tr.status]}>{t(`transfers.status.${tr.status}`)}</Badge></dd>
              <dt className="text-muted-foreground">{t("transfers.sentBy")}</dt>
              <dd>{tr.sentBy.name} · {new Date(tr.sentAt).toLocaleString()}</dd>
              {tr.receivedBy && (
                <>
                  <dt className="text-muted-foreground">{t("transfers.receivedBy")}</dt>
                  <dd>{tr.receivedBy.name} · {new Date(tr.closedAt).toLocaleString()}</dd>
                </>
              )}
              {tr.notes && (
                <>
                  <dt className="text-muted-foreground">{t("transfers.notes")}</dt>
                  <dd>{tr.notes}</dd>
                </>
              )}
            </dl>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("transfers.product")}</TableHead>
                    <TableHead className="text-right">{t("transfers.sent")}</TableHead>
                    <TableHead className="text-right">{t("transfers.received")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tr.items.map((i) => {
                    const shortage = i.receivedQuantity != null && Number(i.receivedQuantity) < Number(i.quantity)
                    return (
                      <TableRow key={i.id}>
                        <TableCell>
                          {i.product.name}
                          <span className="block text-xs text-muted-foreground">{i.product.sku}</span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatQty(i.quantity, i.product.unit, t)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {canReceive ? (
                            <Input
                              type="number"
                              className="ml-auto w-28 text-right"
                              min={0}
                              max={Number(i.quantity)}
                              step={qtyStep(i.product.unit)}
                              value={received[i.id] ?? String(Number(i.quantity))}
                              onChange={(e) => setReceived({ ...received, [i.id]: e.target.value })}
                              aria-label={t("transfers.receivedOf", { name: i.product.name })}
                            />
                          ) : i.receivedQuantity != null ? (
                            <span className={shortage ? "text-[var(--stk-crit)]" : undefined}>
                              {formatQty(i.receivedQuantity, i.product.unit, t)}
                              {shortage && ` · ${t("transfers.shortage")}`}
                            </span>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {canReceive && <p className="text-xs text-muted-foreground">{t("transfers.receiveHint")}</p>}

            {error && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(error, t("transfers.error"))}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              {canCancel && (
                <Button variant="outline" disabled={cancel.isPending || receive.isPending} onClick={() => cancel.mutate()}>
                  {t("transfers.cancel")}
                </Button>
              )}
              {canReceive && (
                <Button disabled={receive.isPending || cancel.isPending} onClick={() => receive.mutate()}>
                  {t("transfers.receive")}
                </Button>
              )}
              {!inTransit && <Button variant="outline" onClick={onClose}>{t("common.close")}</Button>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
