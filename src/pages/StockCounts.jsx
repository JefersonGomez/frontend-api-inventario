import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { getStockCounts, createStockCount } from "@/api/stockCounts"
import { getCategories } from "@/api/categories"
import { useListParams } from "@/hoocks/useListParams"
import { apiErrorMessage } from "@/lib/api-error"
import { LocationSelect } from "@/components/LocationSelect"
import { Pagination } from "@/components/Pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const COUNT_STATUS_VARIANT = { OPEN: "default", CLOSED: "secondary", CANCELLED: "outline" }

// Conteos físicos: la lista y abrir uno nuevo (después se cuenta en su propia página)
export function StockCounts() {
  const { t } = useTranslation()
  const list = useListParams()
  const status = list.get("status")
  const [creating, setCreating] = useState(false)
  const counts = useQuery({
    queryKey: ["stock-counts", list.page, status],
    queryFn: () => getStockCounts({ page: list.page, ...(status && { status }) }),
    placeholderData: keepPreviousData,
  })
  const items = counts.data?.items ?? []
  const statusItems = [
    { value: "all", label: t("list.all") },
    ...["OPEN", "CLOSED", "CANCELLED"].map((s) => ({ value: s, label: t(`stockCounts.status.${s}`) })),
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("stockCounts.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("stockCounts.subtitle")}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("stockCounts.new")}
        </Button>
      </div>

      <div className="mb-4">
        <Select items={statusItems} value={status || "all"} onValueChange={(v) => list.set({ status: v === "all" ? "" : v })}>
          <SelectTrigger className="w-48" aria-label={t("stockCounts.statusLabel")}>
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
              <TableHead>{t("stockCounts.date")}</TableHead>
              <TableHead>{t("stockCounts.location")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("stockCounts.scope")}</TableHead>
              <TableHead>{t("stockCounts.statusLabel")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("stockCounts.openedBy")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {counts.isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
            )}
            {!counts.isLoading && items.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("stockCounts.empty")}</TableCell></TableRow>
            )}
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="whitespace-nowrap">
                  <Link to={`/stock-counts/${c.id}`} className="font-medium underline-offset-2 hover:underline">
                    {new Date(c.createdAt).toLocaleString()}
                  </Link>
                </TableCell>
                <TableCell>{c.location.name}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {c.category?.name ?? t("stockCounts.allProducts")} · {t("stockCounts.productCount", { count: c._count.items })}
                </TableCell>
                <TableCell><Badge variant={COUNT_STATUS_VARIANT[c.status]}>{t(`stockCounts.status.${c.status}`)}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{c.createdBy.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination data={counts.data} onPage={list.setPage} />

      {creating && <NewCountDialog onClose={() => setCreating(false)} />}
    </div>
  )
}

function NewCountDialog({ onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [locationId, setLocationId] = useState("")
  const [categoryId, setCategoryId] = useState("all")
  const [notes, setNotes] = useState("")
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: () => getCategories() })
  const categoryItems = [{ value: "all", label: t("stockCounts.allProducts") }, ...categories.map((c) => ({ value: c.id, label: c.name }))]

  const mutation = useMutation({
    mutationFn: () =>
      createStockCount({
        ...(locationId && { locationId }),
        ...(categoryId !== "all" && { categoryId }),
        ...(notes.trim() && { notes: notes.trim() }),
      }),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["stock-counts"] })
      navigate(`/stock-counts/${count.id}`)
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("stockCounts.new")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <LocationSelect id="count-location" value={locationId} onChange={setLocationId} />
          <div className="space-y-1.5">
            <Label htmlFor="count-category">{t("stockCounts.scope")}</Label>
            <Select items={categoryItems} value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="count-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="count-notes">{t("stockCounts.notes")}</Label>
            <Input id="count-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">{t("stockCounts.newHint")}</p>
          {mutation.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(mutation.error, t("stockCounts.error"))}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={mutation.isPending}>{t("stockCounts.open")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
