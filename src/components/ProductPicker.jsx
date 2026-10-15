import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { Combobox } from "@base-ui/react/combobox"
import { getProducts } from "@/api/products"
import { formatQty } from "@/lib/units"
import { Check, ChevronsUpDown, X } from "lucide-react"

// Selector de producto con búsqueda en el servidor (nombre, SKU, código de barras): no hace falta
// bajar el catálogo entero. value = producto elegido (objeto) o null.
export function ProductPicker({ id, value, onChange, disabled, required, ariaDescribedBy }) {
  const { t } = useTranslation()
  const [input, setInput] = useState("")
  const [term, setTerm] = useState("")

  // espera a que se deje de teclear
  useEffect(() => {
    const timer = setTimeout(() => setTerm(input.trim()), 250)
    return () => clearTimeout(timer)
  }, [input])

  const { data, isFetching } = useQuery({
    queryKey: ["products", "picker", term],
    queryFn: () => getProducts({ pageSize: 20, ...(term && { q: term }) }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: !disabled,
  })
  const results = data?.items ?? []
  // el elegido siempre en la lista, aunque la búsqueda actual no lo traiga
  const items = value && !results.some((p) => p.id === value.id) ? [value, ...results] : results

  return (
    <Combobox.Root
      items={items}
      value={value}
      onValueChange={(p) => onChange(p ?? null)}
      onInputValueChange={(v, { reason }) => {
        if (reason !== "item-press") setInput(v)
      }}
      itemToStringLabel={(p) => `${p.name} (${p.sku})`}
      isItemEqualToValue={(a, b) => a.id === b.id}
      filter={null}
      disabled={disabled}
      required={required}
    >
      <Combobox.InputGroup className="relative flex h-9 w-full items-center rounded-md border border-input bg-background focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
        <Combobox.Input
          id={id}
          placeholder={t("picker.placeholder")}
          aria-describedby={ariaDescribedBy}
          className="h-full min-w-0 flex-1 bg-transparent pr-16 pl-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="absolute right-1 flex items-center">
          {value && (
            <Combobox.Clear aria-label={t("picker.clear")} className="grid size-7 place-items-center rounded text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Combobox.Clear>
          )}
          <Combobox.Trigger aria-label={t("picker.open")} className="grid size-7 place-items-center rounded text-muted-foreground hover:text-foreground">
            <ChevronsUpDown className="h-4 w-4" />
          </Combobox.Trigger>
        </div>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-[60] outline-none">
          <Combobox.Popup
            aria-busy={isFetching || undefined}
            className="w-[var(--anchor-width)] max-w-[var(--available-width)] rounded-md border border-border bg-popover text-popover-foreground shadow-md"
          >
            <div className="max-h-[min(var(--available-height),20rem)] overflow-y-auto overscroll-contain py-1">
              <Combobox.Status>
                {isFetching && <div className="px-3 py-1.5 text-xs text-muted-foreground">{t("picker.searching")}</div>}
              </Combobox.Status>
              <Combobox.Empty>
                {!isFetching && <div className="px-3 py-2 text-sm text-muted-foreground">{t("picker.empty")}</div>}
              </Combobox.Empty>
              <Combobox.List>
                {(p) => (
                  <Combobox.Item
                    key={p.id}
                    value={p}
                    className="grid cursor-default grid-cols-[1rem_1fr] items-start gap-2 px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <Combobox.ItemIndicator className="mt-0.5">
                      <Check className="h-4 w-4" />
                    </Combobox.ItemIndicator>
                    <span className="col-start-2 flex min-w-0 flex-col">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.sku} · {t("picker.stock", { stock: formatQty(p.stock, p.unit, t) })}
                      </span>
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </div>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
