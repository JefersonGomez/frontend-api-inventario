import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { generateUserPin } from "@/api/users"
import { apiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Generar el código de caja de alguien. El servidor lo devuelve una sola vez: se muestra para entregarlo.
export function PinCodeDialog({ user, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => generateUserPin(user.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  })
  const authorizes = user.role === "ADMIN" || user.role === "MANAGER" ? t("users.pin.authorizes") : ""

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("users.pin.title", { name: user.name })}</DialogTitle>
        </DialogHeader>
        {mutation.isSuccess ? (
          <div className="space-y-4">
            <p className="text-sm">{t("users.pin.ready", { name: user.name })}</p>
            <p className="rounded-lg border border-border bg-muted py-4 text-center font-mono text-3xl font-semibold tracking-[0.4em]">
              {mutation.data.pin}
            </p>
            <p className="text-sm text-muted-foreground">{t("users.pin.once")}</p>
            <p className="text-sm text-muted-foreground">{t("users.pin.after")}</p>
            <div className="flex justify-end">
              <Button onClick={onClose}>{t("users.done")}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">{t("users.pin.intro", { name: user.name, authorizes })}</p>
            {user.hasPin && <p className="text-sm text-[var(--stk-warn)]">{t("users.pin.replace")}</p>}
            <p className="text-sm text-muted-foreground">{t("users.pin.after")}</p>
            {mutation.isError && (
              <p role="alert" className="text-sm text-destructive">{apiErrorMessage(mutation.error, t("users.pin.error"))}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {user.hasPin ? t("users.pin.renew") : t("users.pin.generate")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
