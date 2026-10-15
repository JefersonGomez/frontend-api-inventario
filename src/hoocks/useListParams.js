import { useSearchParams } from "react-router-dom"

// Página, búsqueda y filtros de un listado guardados en la URL (?page=2&q=mart&status=PENDING):
// sobreviven a una recarga y los enlaces (campanita, buscador global) abren el listado ya filtrado.
// Cambiar un filtro vuelve a la página 1.
export function useListParams() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get("page")) || 1)
  const get = (key) => params.get(key) ?? ""

  const set = (patch) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v === "" || v == null || v === false) next.delete(k)
          else next.set(k, String(v))
        }
        if (!("page" in patch)) next.delete("page")
        if (next.get("page") === "1") next.delete("page")
        return next
      },
      { replace: true }
    )

  return { page, get, set, setPage: (p) => set({ page: p }) }
}
