import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Search } from "lucide-react"
import { getSales } from "@/api/sales"
import { useMoney } from "@/hoocks/useMoney"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Buscar la venta a devolver por el número del tiquete (escrito o escaneado; basta el final) o el cliente
export function FindSaleDialog({ open, onClose, onPick }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{open && <Finder onPick={onPick} />}</DialogContent>
    </Dialog>
  )
}

const when = (d) => new Date(d).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" })

function Finder({ onPick }) {
  const { t } = useTranslation()
  const money = useMoney()
  const [text, setText] = useState("")
  const [q, setQ] = useState("")
  const { data, isFetching } = useQuery({
    queryKey: ["sales", "find", q],
    queryFn: () => getSales({ page: 1, pageSize: 8, kind: "SALE", q }),
    enabled: !!q,
  })

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t("sales.find.title")}</DialogTitle>
      </DialogHeader>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setQ(text.trim())
        }}
      >
        <Input autoFocus className="font-mono" placeholder={t("sales.find.placeholder")} aria-label={t("sales.find.placeholder")} value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" disabled={!text.trim()}>
          <Search />
          {t("sales.find.search")}
        </Button>
      </form>
      {q && !isFetching && data?.items.length === 0 && <p className="text-sm text-muted-foreground">{t("sales.find.none")}</p>}
      {data?.items.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data.items.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => onPick(d.id)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted">
                <span>
                  <span className="block font-mono text-xs">{d.consecutive.slice(-10)}</span>
                  <span className="text-xs text-muted-foreground">{when(d.issuedAt)} · {d.customer?.name ?? t("sales.find.noCustomer")}</span>
                </span>
                <span className="font-mono">{money.format(d.total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
