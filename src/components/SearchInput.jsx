import { useEffect, useState } from "react"
import { Search } from "lucide-react"

// Buscador de un listado: escribe al instante y avisa (onSearch) cuando se deja de teclear 300 ms,
// para no pedirle al servidor una búsqueda por cada letra.
export function SearchInput({ id, value, onSearch, placeholder, className = "" }) {
  const [text, setText] = useState(value)
  const [synced, setSynced] = useState(value)
  // si el valor cambia desde afuera (otro enlace, "borrar filtros"), se refleja
  if (value !== synced) {
    setSynced(value)
    setText(value)
  }

  useEffect(() => {
    if (text === value) return
    const timer = setTimeout(() => onSearch(text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text, value, onSearch])

  return (
    <div className={`flex items-center gap-2 rounded-lg border border-input bg-card px-3 ${className}`}>
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <label htmlFor={id} className="sr-only">{placeholder}</label>
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  )
}
