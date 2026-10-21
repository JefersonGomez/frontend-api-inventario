import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { moneyFormatter } from "@/lib/money"
import { openChannel } from "@/lib/customer-display"
import { cn } from "@/lib/utils"

// /pos/cliente: segunda pantalla mirando al cliente. Solo muestra lo que le manda la caja
// (misma computadora, BroadcastChannel); no pide nada al servidor.
export function CustomerDisplay() {
  const { t } = useTranslation()
  const [state, setState] = useState(null)

  useEffect(() => {
    const channel = openChannel(setState)
    channel.post("hello")
    return channel.close
  }, [])

  const money = moneyFormatter(state?.currency)
  const items = state?.items ?? []

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border bg-card px-8 py-4">
        <span className="stk-logo-mark grid place-items-center" aria-hidden>S</span>
        <p className="text-2xl font-semibold">{state?.company || t("pos.display.welcome")}</p>
      </header>

      {state?.paid ? (
        <main className="grid flex-1 place-items-center p-8 text-center">
          <div>
            <p className="text-3xl font-semibold">{t("pos.display.thanks")}</p>
            <p className="mt-6 text-lg text-muted-foreground">{t("pos.total")}</p>
            <p className="font-mono text-5xl font-semibold">{money.format(state.paid.total)}</p>
            {state.paid.change > 0 && (
              <div className="mt-6 rounded-2xl bg-[var(--stk-ok-bg)] px-10 py-5 text-[var(--stk-ok)]">
                <p className="text-lg">{t("pos.change")}</p>
                <p className="font-mono text-6xl font-semibold">{money.format(state.paid.change)}</p>
              </div>
            )}
          </div>
        </main>
      ) : items.length === 0 ? (
        <main className="grid flex-1 place-items-center p-8">
          <p className="text-3xl text-muted-foreground">{t("pos.display.welcome")}</p>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col">
          <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {items.map((i, n) => (
              <li
                key={i.id}
                ref={i.id === state.lastId ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                className={cn(
                  "flex items-baseline justify-between gap-6 px-8 py-4",
                  i.id === state.lastId && "bg-[var(--stk-accent-soft)]"
                )}
              >
                <span className="text-2xl">
                  <span className="mr-3 font-mono text-base text-muted-foreground">{n + 1}</span>
                  {i.name}
                  <span className="ml-3 font-mono text-lg text-muted-foreground">
                    {i.quantity} × {money.format(i.price)}
                  </span>
                </span>
                <span className="text-right font-mono text-2xl font-semibold">
                  {i.discount > 0 && <span className="block text-base font-normal text-[var(--stk-ok)]">−{money.format(i.discount)}</span>}
                  {money.format(i.total)}
                </span>
              </li>
            ))}
          </ol>
          {state.discount > 0 && (
            <p className="flex items-baseline justify-between bg-[var(--stk-ok-bg)] px-8 py-3 text-xl text-[var(--stk-ok)]">
              <span>{t("pos.display.savings")}</span>
              <span className="font-mono font-semibold">−{money.format(state.discount)}</span>
            </p>
          )}
          <footer className="flex items-baseline justify-between bg-[var(--stk-kpi-dark)] px-8 py-6 text-white">
            <span className="text-2xl uppercase tracking-wide opacity-70">{t("pos.total")}</span>
            <span className="font-mono text-6xl font-semibold">{money.format(state.total)}</span>
          </footer>
        </main>
      )}
    </div>
  )
}
