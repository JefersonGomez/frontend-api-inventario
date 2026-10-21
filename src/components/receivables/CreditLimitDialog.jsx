import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { setCreditLimit } from "@/api/receivables"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Habilitar, cambiar o quitar el crédito de un cliente (credit.manage, por defecto solo el admin)
export function CreditLimitDialog({ customer, onClose }) {
  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">{customer && <LimitForm key={customer.id} customer={customer} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

function LimitForm({ customer, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [limit, setLimit] = useState(customer.creditLimit == null ? "" : String(customer.creditLimit))
  const save = useMutation({
    mutationFn: (value) => setCreditLimit(customer.id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["receivables"] })
      onClose()
    },
  })
  const noId = !customer.idNumber

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (Number(limit) > 0) save.mutate(Number(limit))
      }}
    >
      <DialogHeader>
        <DialogTitle>{t("receivables.limit.title", { name: customer.name })}</DialogTitle>
      </DialogHeader>
      {noId ? (
        <p className="text-sm text-muted-foreground">{t("receivables.limit.needsId")}</p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="credit-limit">{t("receivables.limit.label")}</Label>
          <Input id="credit-limit" type="number" min="1" step="0.01" required autoFocus className="font-mono" value={limit} onChange={(e) => setLimit(e.target.value)} />
          <p className="text-xs text-muted-foreground">{t("receivables.limit.hint")}</p>
        </div>
      )}
      {save.isError && <p role="alert" className="text-sm text-destructive">{apiErrorMessage(save.error, t("receivables.limit.error"))}</p>}
      <DialogFooter>
        {customer.creditLimit != null && (
          <Button type="button" variant="ghost" className="mr-auto text-destructive" disabled={save.isPending} onClick={() => save.mutate(null)}>
            {t("receivables.limit.remove")}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        {!noId && <Button type="submit" disabled={save.isPending || !(Number(limit) > 0)}>{t("common.save")}</Button>}
      </DialogFooter>
    </form>
  )
}
