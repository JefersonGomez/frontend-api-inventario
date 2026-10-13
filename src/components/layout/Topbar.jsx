import { useState } from "react"
import { Search } from "lucide-react"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { NotificationBell } from "./NotificationBell"
import { CompanySwitcher } from "./CompanySwitcher"
import { usePlatformOwner } from "@/hoocks/usePlatformOwner"

export function Topbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const [text, setText] = useState(pathname === "/products" ? (params.get("q") ?? "") : "")

  const { isPlatformOwner } = usePlatformOwner()

  function handleSubmit(e) {
    e.preventDefault()
    const q = text.trim()
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : "/products")
  }

  if (isPlatformOwner) {
    return (
      <header className="stk-top">
        <span className="stk-search" style={{ color: "var(--foreground)", fontWeight: 500 }}>
          {t("topbar.platformMode")}
        </span>
      </header>
    )
  }

  return (
    <header className="stk-top">
      <form className="stk-search" role="search" onSubmit={handleSubmit}>
        <Search className="w-[18px] h-[18px]" strokeWidth={1.7} aria-hidden />
        <label className="sr-only" htmlFor="stk-search-input">
          {t("topbar.search")}
        </label>
        <input
          id="stk-search-input"
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("topbar.search")}
        />
      </form>
      <CompanySwitcher />
      <NotificationBell />
    </header>
  )
}
