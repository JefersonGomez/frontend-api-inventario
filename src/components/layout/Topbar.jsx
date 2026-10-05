import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { NotificationBell } from "./NotificationBell"

export function Topbar() {
  const { t } = useTranslation()

  return (
    <header className="stk-top">
      <label className="stk-search">
        <Search className="w-[18px] h-[18px]" strokeWidth={1.7} aria-hidden />
        <span className="sr-only">{t("topbar.search")}</span>
        <input type="search" placeholder={t("topbar.search")} />
      </label>
      <NotificationBell />
    </header>
  )
}
